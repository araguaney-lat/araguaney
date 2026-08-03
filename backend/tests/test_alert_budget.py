"""Presupuesto de ruido para las alertas (Fase 24, task 7).

Una alerta vale por lo que provoca. El mismo mensaje cuarenta veces seguidas no
provoca nada: entrena a quien lo lee a ignorar el canal, y el día que aparece la
que sí importaba, ya nadie mira.

Estos tests fijan las dos decisiones del módulo:

- **Se agrupa por identidad del problema**, no por texto ni por severidad. Mismo
  endpoint y misma excepción es el mismo problema; otro endpoint suena aparte.
- **Falla abierto.** Sin Redis no hay dónde recordar qué se mandó, así que se
  manda todo. Entre un canal ruidoso y un canal mudo, el ruidoso se arregla
  leyéndolo; el mudo no se nota hasta que es tarde.
"""

from unittest.mock import MagicMock, patch

from app.utils.alert_budget import DEFAULT_WINDOW_SECONDS, should_send


def _redis(first_call: bool = True):
    client = MagicMock()
    client.set.return_value = first_call
    return client


def test_first_occurrence_is_sent():
    with patch("app.utils.cache.get_redis_client", return_value=_redis(True)):
        assert should_send("cron:purge_donations_cron:TimeoutError") is True


def test_repetition_within_the_window_is_silenced():
    with patch("app.utils.cache.get_redis_client", return_value=_redis(False)):
        assert should_send("cron:purge_donations_cron:TimeoutError") is False


def test_the_key_reserves_the_window_atomically():
    """SET NX y no GET + SET: dos workers que fallan a la vez mandan una alerta.

    Con lectura y escritura separadas habría carrera justo cuando más ruido hay.
    """
    client = _redis(True)
    with patch("app.utils.cache.get_redis_client", return_value=client):
        should_send("job:send_invitation_email_task:SMTPError")

    _, kwargs = client.set.call_args
    assert kwargs["nx"] is True
    assert kwargs["ex"] == DEFAULT_WINDOW_SECONDS


def test_the_window_is_configurable_per_call():
    client = _redis(True)
    with patch("app.utils.cache.get_redis_client", return_value=client):
        should_send("bounces:24h", window_seconds=7200)

    assert client.set.call_args.kwargs["ex"] == 7200


def test_without_redis_every_alert_goes_through():
    """Sin dónde recordar, se manda todo: fallar cerrado dejaría el canal mudo."""
    with patch("app.utils.cache.get_redis_client", return_value=None):
        assert should_send("cron:whatever:RuntimeError") is True
        assert should_send("cron:whatever:RuntimeError") is True


def test_a_broken_redis_does_not_swallow_the_alert():
    client = MagicMock()
    client.set.side_effect = RuntimeError("connection reset")
    with patch("app.utils.cache.get_redis_client", return_value=client):
        assert should_send("cron:whatever:RuntimeError") is True
