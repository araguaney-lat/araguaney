"""Latido de los crons (Fase 24, task 3).

Los errores se notan; las ausencias no. Todo el sistema de alertas que existe
hasta ahora se dispara cuando algo **falla** — y un cron que nunca corre no
falla. Si el worker deja de arrancar tras un deploy, ninguna alerta sale, porque
no hay ninguna excepción que reportar, mientras los plazos de conservación se
acumulan sin cumplirse.

El latido tiene dos mitades, y hacen falta las dos:

1. **Registro y vigilante interno.** Cada cron anota su última corrida exitosa, y
   un vigilante revisa que ninguno se haya quedado atrás. Esto atrapa que *un*
   cron muera.
2. **Un endpoint que alguien de afuera pueda mirar.** Porque el vigilante es un
   cron: si el worker entero muere, el vigilante muere con él y no avisa nada.
   Un vigilante no puede detectar su propia muerte, y por eso hace falta que la
   pregunta se pueda hacer desde fuera.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base


@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    return "JSON"


for _m in ("user", "center", "campaign", "intake", "box", "product_type", "shipment",
           "pallet", "events", "audit_log", "donor", "donation", "risk_review", "cron_run"):
    __import__(f"app.models.{_m}")

from app.models.cron_run import CronRun  # noqa: E402
from app.services.cron_heartbeat import (  # noqa: E402
    CRON_MAX_AGE,
    record_success,
    stale_crons,
)


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    s = sessionmaker(bind=engine, expire_on_commit=False)()
    try:
        yield s
    finally:
        s.close()
        engine.dispose()


def _ahora():
    return datetime.now(timezone.utc)


# ── Registro de corridas ─────────────────────────────────────────────────────

def test_una_corrida_exitosa_queda_registrada(db):
    record_success(db, "purge_donations_cron")
    fila = db.get(CronRun, "purge_donations_cron")
    assert fila is not None and fila.last_success_at is not None


def test_correr_de_nuevo_actualiza_la_marca(db):
    record_success(db, "purge_donations_cron")
    primera = db.get(CronRun, "purge_donations_cron").last_success_at

    db.get(CronRun, "purge_donations_cron").last_success_at = _ahora() - timedelta(days=2)
    db.commit()
    record_success(db, "purge_donations_cron")

    assert db.get(CronRun, "purge_donations_cron").last_success_at > primera - timedelta(seconds=1)


def test_el_registro_no_tumba_al_cron_si_falla(db):
    """Anotar el latido es lo último que hace un cron: si eso reventara, se
    perdería el trabajo que ya se hizo bien."""
    roto = object()          # no es una sesión
    record_success(roto, "purge_donations_cron")     # no levanta


# ── Detección de rezago ──────────────────────────────────────────────────────

def test_un_cron_al_dia_no_esta_rezagado(db):
    record_success(db, "purge_donations_cron")
    assert "purge_donations_cron" not in stale_crons(db)


def test_un_cron_que_lleva_demasiado_sin_correr_esta_rezagado(db):
    record_success(db, "purge_donations_cron")
    fila = db.get(CronRun, "purge_donations_cron")
    fila.last_success_at = _ahora() - CRON_MAX_AGE["purge_donations_cron"] - timedelta(hours=1)
    db.commit()

    assert "purge_donations_cron" in stale_crons(db)


def test_cada_cron_tiene_su_propia_ventana():
    """La purga de exportes corre cada hora; las demás, una vez al día. Medirlas
    con la misma vara daría una alerta falsa o taparía una real."""
    assert CRON_MAX_AGE["purge_export_jobs_cron"] < CRON_MAX_AGE["purge_donations_cron"]


def test_un_cron_recien_desplegado_no_alarma(db):
    """En un despliegue nuevo nada ha corrido todavía. Alertar de inmediato
    entrenaría a quien recibe la alerta a ignorarla."""
    db.add(CronRun(name="purge_donations_cron", last_success_at=None))
    db.commit()
    assert stale_crons(db) == []


def test_un_cron_que_nunca_corrio_termina_alarmando(db):
    """Pero si pasa su ventana entera sin correr ni una vez, sí es un problema:
    justo el caso del worker que dejó de arrancar tras un deploy."""
    fila = CronRun(name="purge_donations_cron", last_success_at=None)
    db.add(fila)
    db.commit()
    fila.created_at = _ahora() - CRON_MAX_AGE["purge_donations_cron"] - timedelta(hours=1)
    db.commit()

    assert "purge_donations_cron" in stale_crons(db)


def test_un_cron_desconocido_se_ignora(db):
    """Una fila vieja de un cron que ya no existe no puede alertar para siempre."""
    db.add(CronRun(name="cron_que_ya_no_existe", last_success_at=_ahora() - timedelta(days=90)))
    db.commit()
    assert "cron_que_ya_no_existe" not in stale_crons(db)


# ── El vigilante ─────────────────────────────────────────────────────────────

def test_el_vigilante_alerta_de_lo_rezagado():
    import asyncio

    from app.worker import heartbeat_watchdog_cron

    with (
        patch("app.services.cron_heartbeat.stale_crons", return_value=["purge_donations_cron"]),
        patch("app.database.SessionLocal"),
        patch("app.utils.slack.notify_slack", new=AsyncMock()) as mock_slack,
    ):
        asyncio.run(heartbeat_watchdog_cron({}))

    assert mock_slack.called
    assert "purge_donations_cron" in mock_slack.call_args[0][0]


def test_el_vigilante_calla_cuando_todo_corre():
    import asyncio

    from app.worker import heartbeat_watchdog_cron

    with (
        patch("app.services.cron_heartbeat.stale_crons", return_value=[]),
        patch("app.database.SessionLocal"),
        patch("app.utils.slack.notify_slack", new=AsyncMock()) as mock_slack,
    ):
        asyncio.run(heartbeat_watchdog_cron({}))

    assert not mock_slack.called


def test_el_vigilante_esta_registrado_como_cron():
    from app.worker import WorkerSettings, heartbeat_watchdog_cron

    nombres = [c.name for c in WorkerSettings.cron_jobs]
    assert f"cron:{heartbeat_watchdog_cron.__name__}" in nombres


def test_el_vigilante_tambien_anota_su_propio_latido():
    """Es lo que permite que alguien de afuera note que el worker entero murió:
    si ni el vigilante late, no queda nadie adentro para avisar."""
    from app.services.cron_heartbeat import CRON_MAX_AGE

    assert "heartbeat_watchdog_cron" in CRON_MAX_AGE


# ── La mitad que se mira desde fuera ─────────────────────────────────────────

# Estos tres se hacían leyendo una ventana fija del texto de `main.py`, y una
# línea de más los rompía sin que nada estuviera mal. Ahora preguntan por la
# respuesta, que es lo que un servicio de uptime va a ver.

def _consultar_health_jobs(rezagados: list[str]):
    from fastapi.testclient import TestClient

    from app.database import get_db
    from app.main import app

    app.dependency_overrides[get_db] = lambda: None
    try:
        with patch("app.services.cron_heartbeat.stale_crons", return_value=rezagados):
            with TestClient(app) as client:
                return client.get("/health/jobs")
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_existe_un_endpoint_para_vigilancia_externa():
    """El vigilante es un cron: si el worker muere, muere con él. La única forma
    de notar eso es preguntando desde fuera del proceso que podría estar muerto."""
    respuesta = _consultar_health_jobs([])

    assert respuesta.status_code == 200
    assert respuesta.json()["status"] == "ok"


def test_el_endpoint_responde_error_cuando_algo_se_quedo_atras():
    """Un servicio de uptime gratuito solo entiende códigos de estado: si
    devolviera 200 con un cuerpo triste, nadie se enteraría."""
    respuesta = _consultar_health_jobs(["purge_donations_cron"])

    assert respuesta.status_code == 503


def test_el_endpoint_no_publica_los_internos():
    """Es público y sin sesión. Decir 'algo va atrasado' no compromete nada;
    publicar qué cron, desde cuándo y cada cuánto corre, sí sobra."""
    respuesta = _consultar_health_jobs(["purge_donations_cron", "purge_audit_logs_cron"])
    cuerpo = respuesta.text

    assert "purge_" not in cuerpo
    assert respuesta.json() == {"status": "stale", "count": 2}
