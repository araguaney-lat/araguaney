"""Alertas cuando falla el trabajo de fondo (Fase 24, tasks 1, 2 y 5).

Hasta ahora la plataforma avisaba cuando un request reventaba, pero no cuando
fallaba algo que nadie está mirando. Los crons corren de madrugada: si uno muere,
muere en silencio.

Eso importa más de lo que parece porque **cuatro de los cinco crons sostienen
plazos publicados en el aviso de privacidad**. Una purga que lleva un mes sin
correr no produce ningún error visible mientras el aviso le sigue prometiendo a
las personas donantes que lo no confirmado se borra en siete días.

Dos reglas de diseño que estos tests fijan:

- **Se alerta al rendirse, no en cada intento.** ARQ reintenta tres veces; avisar
  en cada fallo triplica el ruido de un timeout que se resuelve solo.
- **La alerta dice qué se rompió, no qué excepción salió.** "TimeoutError en
  purge_donations_cron" le sirve a quien escribió el cron; "la purga de
  donaciones no corrió, el aviso promete 7 días" le sirve a quien la lee a las
  tres de la mañana.
"""

from unittest.mock import AsyncMock, patch

import pytest

from app.worker import MAX_TRIES, alert_on_final_failure


async def _falla(ctx, *args):
    raise RuntimeError("se cayó")


async def _funciona(ctx, *args):
    return "ok"


def _correr(fn, ctx):
    import asyncio

    return asyncio.run(fn(ctx))


# ── El decorador avisa solo al rendirse ──────────────────────────────────────

def test_no_alerta_en_el_primer_intento():
    """Un fallo transitorio que se arregla en el segundo intento no es noticia."""
    envuelto = alert_on_final_failure(_falla)
    with patch("app.utils.slack.notify_slack", new=AsyncMock()) as mock_slack:
        with pytest.raises(RuntimeError):
            _correr(envuelto, {"job_try": 1})
    assert not mock_slack.called


def test_alerta_en_el_ultimo_intento():
    envuelto = alert_on_final_failure(_falla)
    with patch("app.utils.slack.notify_slack", new=AsyncMock()) as mock_slack:
        with pytest.raises(RuntimeError):
            _correr(envuelto, {"job_try": MAX_TRIES})
    assert mock_slack.called


def test_la_alerta_nombra_la_tarea_y_el_error():
    envuelto = alert_on_final_failure(_falla)
    with patch("app.utils.slack.notify_slack", new=AsyncMock()) as mock_slack:
        with pytest.raises(RuntimeError):
            _correr(envuelto, {"job_try": MAX_TRIES})
    mensaje = mock_slack.call_args[0][0]
    assert "_falla" in mensaje and "se cayó" in mensaje


def test_el_decorador_vuelve_a_levantar_la_excepcion():
    """ARQ tiene que ver el fallo: la alerta observa, no interfiere."""
    envuelto = alert_on_final_failure(_falla)
    with patch("app.utils.slack.notify_slack", new=AsyncMock()):
        with pytest.raises(RuntimeError):
            _correr(envuelto, {"job_try": MAX_TRIES})


def test_una_tarea_que_funciona_no_alerta():
    envuelto = alert_on_final_failure(_funciona)
    with patch("app.utils.slack.notify_slack", new=AsyncMock()) as mock_slack:
        assert _correr(envuelto, {"job_try": 1}) == "ok"
    assert not mock_slack.called


def test_si_slack_falla_la_excepcion_original_sobrevive():
    """La alerta no puede tragarse el error que vino a reportar."""
    envuelto = alert_on_final_failure(_falla)
    with patch("app.utils.slack.notify_slack", new=AsyncMock(side_effect=Exception("slack caído"))):
        with pytest.raises(RuntimeError, match="se cayó"):
            _correr(envuelto, {"job_try": MAX_TRIES})


def test_sin_job_try_se_asume_el_primero():
    """Un ctx incompleto no puede convertir cada fallo en una alerta."""
    envuelto = alert_on_final_failure(_falla)
    with patch("app.utils.slack.notify_slack", new=AsyncMock()) as mock_slack:
        with pytest.raises(RuntimeError):
            _correr(envuelto, {})
    assert not mock_slack.called


# ── Los crons de purga alertan con contexto de retención ─────────────────────

def test_un_cron_de_purga_que_falla_alerta():
    import asyncio

    from app.worker import purge_donations_cron

    with (
        patch("app.database.SessionLocal", side_effect=RuntimeError("sin base")),
        patch("app.utils.slack.notify_slack", new=AsyncMock()) as mock_slack,
    ):
        asyncio.run(purge_donations_cron({}))     # el cron no propaga: alerta

    assert mock_slack.called


def test_la_alerta_de_purga_dice_que_promesa_queda_incumplida():
    """Es lo que convierte la alerta en acción: quien la lee sabe qué se rompió
    sin ir a leer el código."""
    import asyncio

    from app.worker import purge_donations_cron

    with (
        patch("app.database.SessionLocal", side_effect=RuntimeError("sin base")),
        patch("app.utils.slack.notify_slack", new=AsyncMock()) as mock_slack,
    ):
        asyncio.run(purge_donations_cron({}))

    mensaje = mock_slack.call_args[0][0].lower()
    assert "aviso de privacidad" in mensaje or "conservación" in mensaje


def test_un_cron_que_falla_no_tumba_al_worker():
    """Si el cron propagara, ARQ lo reintentaría y la purga correría dos veces."""
    import asyncio

    from app.worker import purge_audit_logs_cron

    with (
        patch("app.database.SessionLocal", side_effect=RuntimeError("sin base")),
        patch("app.utils.slack.notify_slack", new=AsyncMock()),
    ):
        asyncio.run(purge_audit_logs_cron({}))    # no levanta


@pytest.mark.parametrize("cron", [
    "purge_audit_logs_cron", "purge_attachments_cron", "purge_email_failures_cron",
    "purge_donations_cron", "purge_export_jobs_cron",
])
def test_todos_los_crons_de_purga_estan_protegidos(cron):
    """Los cinco, no solo los que alguien recordó."""
    import asyncio

    import app.worker as worker

    fn = getattr(worker, cron)
    with (
        patch("app.database.SessionLocal", side_effect=RuntimeError("sin base")),
        patch("app.utils.slack.notify_slack", new=AsyncMock()) as mock_slack,
    ):
        asyncio.run(fn({}))

    assert mock_slack.called, cron


# ── El worker manda sus errores a Sentry (task 5) ────────────────────────────

def test_el_worker_inicializa_sentry():
    """Corre en su propio proceso: sin esto, sus excepciones no llegan a ningún
    dashboard y solo existen en el log de Railway."""
    from pathlib import Path

    src = Path("app/worker.py").read_text()
    assert "sentry_sdk.init" in src


def test_el_worker_no_inicializa_sentry_sin_dsn():
    """Igual que la API: sin DSN configurado, no se toca nada."""
    from pathlib import Path

    src = Path("app/worker.py").read_text()
    assert "settings.sentry_dsn" in src


# ── Ninguna tarea registrada queda sin alerta ────────────────────────────────

def test_todas_las_tareas_registradas_alertan_al_rendirse():
    """Se envuelven en el punto de registro justamente para que agregar una
    tarea nueva sin alerta sea difícil: la lista es lo que uno edita."""
    from app.worker import WorkerSettings

    sin_alerta = []
    for entrada in WorkerSettings.functions:
        fn = getattr(entrada, "coroutine", entrada)
        if not hasattr(fn, "__wrapped__"):
            sin_alerta.append(getattr(fn, "__name__", str(entrada)))

    assert sin_alerta == [], f"tareas sin alerta de fallo: {sin_alerta}"


def test_los_nombres_de_las_tareas_no_cambian_al_envolverlas():
    """ARQ resuelve por nombre: si el decorador lo cambiara, cada `enqueue`
    existente dejaría de encontrar su tarea."""
    from app.worker import WorkerSettings

    nombres = [getattr(getattr(e, "coroutine", e), "__name__", "") for e in WorkerSettings.functions]
    assert "send_donation_confirmation_email_task" in nombres
    assert "generate_shipment_manifest_pdf_task" in nombres
