"""Presupuesto de ruido para las alertas (Fase 24, task 7).

Una alerta vale por lo que provoca. Un canal donde el mismo mensaje aparece
cuarenta veces seguidas no provoca nada: entrena a quien lo lee a ignorarlo, y el
día que aparece la alerta que sí importaba, ya nadie mira.

Este módulo agrupa lo repetitivo. La primera aparición de un problema sale
completa; las repeticiones dentro de su ventana se callan. No se silencia por
tipo de alerta ni por severidad, sino por **identidad del problema**: mismo
endpoint y misma excepción, o mismo cron. Un problema distinto siempre suena.

**Falla abierto a propósito.** Sin Redis no hay dónde recordar qué se mandó, y
entonces se manda todo. Entre un canal ruidoso y un canal mudo, el ruidoso es el
que se puede arreglar leyéndolo.
"""

import logging

from app.utils import cache

logger = logging.getLogger(__name__)

# Cuánto dura el silencio de una repetición. Suficiente para agrupar la ráfaga de
# un incidente y corto para que un problema que sigue vivo vuelva a sonar dentro
# del mismo turno de guardia.
DEFAULT_WINDOW_SECONDS = 1800

_PREFIX = "alert:budget:"


def should_send(key: str, window_seconds: int = DEFAULT_WINDOW_SECONDS) -> bool:
    """¿Sale esta alerta, o es repetición de una que ya salió?

    `key` identifica el **problema**, no el mensaje: dos textos distintos del
    mismo cron caído comparten clave y no suenan dos veces.
    """
    client = cache.get_redis_client()
    if client is None:
        return True

    try:
        # SET NX es atómico: dos workers que fallan a la vez mandan una alerta,
        # no dos. Con GET + SET habría carrera justo cuando más ruido hay.
        primera = client.set(f"{_PREFIX}{key}", "1", nx=True, ex=window_seconds)
        return bool(primera)
    except Exception:
        logger.warning("No se pudo consultar el presupuesto de ruido", exc_info=True)
        return True
