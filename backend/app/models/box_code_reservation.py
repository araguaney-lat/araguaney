"""Códigos de caja pre-asignados (Fase 25).

Un centro reserva un bloque con conexión y lo consume sin ella. Sin código no
hay etiqueta imprimible, y en un centro con prisa nadie vuelve a tocar una caja
ya cerrada para etiquetarla después.

Mientras `used_at` sea `NULL` esto es un código disponible, no una caja: no
cuenta como inventario en ningún reporte.
"""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class BoxCodeReservation(Base):
    __tablename__ = "box_code_reservations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, nullable=False, unique=True)
    center_id = Column(
        UUID(as_uuid=True), ForeignKey("centers.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    reserved_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reserved_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    used_at = Column(DateTime(timezone=True), nullable=True)
    box_id = Column(UUID(as_uuid=True), ForeignKey("boxes.id", ondelete="SET NULL"), nullable=True)
