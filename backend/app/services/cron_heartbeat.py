"""Latido de los crons (Fase 24, task 3).

El resto de la observabilidad se dispara cuando algo falla. Esto cubre lo
contrario: cuando algo **deja de ocurrir**, que no produce ninguna excepción y
por lo tanto no dispara nada.

Las ventanas viven en código y no en el entorno porque son propiedad del
calendario de cada cron, no configuración de quien opera: si alguien cambia la
hora de una purga, cambia esta tabla en el mismo commit.
"""

import logging
from datetime import datetime, timedelta, timezone

from app.models.cron_run import CronRun

logger = logging.getLogger(__name__)

# Cuánto puede pasar sin correr antes de que sea un problema. Con holgura sobre
# su periodo real: un cron diario que se atrasa dos horas por un deploy no es
# noticia, uno que lleva día y medio sí.
CRON_MAX_AGE: dict[str, timedelta] = {
    "purge_audit_logs_cron": timedelta(hours=36),
    "purge_attachments_cron": timedelta(hours=36),
    "purge_email_failures_cron": timedelta(hours=36),
    "purge_donations_cron": timedelta(hours=36),
    "purge_export_jobs_cron": timedelta(hours=3),      # corre cada hora
    "heartbeat_watchdog_cron": timedelta(hours=3),     # corre cada hora
    "bounce_watchdog_cron": timedelta(hours=3),        # corre cada hora
}


def record_success(db, name: str) -> None:
    """Anota que un cron terminó bien.

    Nunca levanta: anotar el latido es lo último que hace un cron, y si esto
    reventara se perdería la señal de un trabajo que sí se hizo.
    """
    try:
        row = db.get(CronRun, name)
        if row is None:
            row = CronRun(name=name)
            db.add(row)
        row.last_success_at = datetime.now(timezone.utc)
        db.commit()
    except Exception:
        logger.warning("No se pudo registrar el latido de %s", name, exc_info=True)


def stale_crons(db) -> list[str]:
    """Los crons que llevan más de su ventana sin correr.

    Un cron sin fila no se reporta: la fila nace con el primer registro, y hasta
    entonces no hay nada que afirmar. Un cron que ya no existe en `CRON_MAX_AGE`
    tampoco, para que una fila vieja no alerte para siempre.
    """
    now = datetime.now(timezone.utc)
    stale = []
    for row in db.query(CronRun).all():
        max_age = CRON_MAX_AGE.get(row.name)
        if max_age is None:
            continue
        if now - row.reference_time > max_age:
            stale.append(row.name)
    return sorted(stale)
