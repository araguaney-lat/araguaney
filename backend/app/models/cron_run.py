from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String
from sqlalchemy.sql import func

from app.database import Base


class CronRun(Base):
    """Última corrida exitosa de un cron (Fase 24).

    Existe porque las ausencias no se notan: un cron que **nunca corre** no
    lanza ninguna excepción, así que el sistema de alertas basado en fallos
    guarda silencio perfecto mientras el trabajo no se hace.

    Una fila por cron, escrita al terminar bien. `created_at` importa tanto como
    `last_success_at`: es lo que permite distinguir "acaba de desplegarse y aún
    no le toca" de "lleva su ventana entera sin correr ni una vez".
    """

    __tablename__ = "cron_runs"

    name = Column(String, primary_key=True)
    last_success_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    @property
    def reference_time(self) -> datetime:
        """Desde cuándo se mide el rezago: la última corrida, o el alta si nunca corrió."""
        valor = self.last_success_at or self.created_at
        return valor if valor.tzinfo else valor.replace(tzinfo=timezone.utc)
