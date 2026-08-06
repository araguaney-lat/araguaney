"""Incidencias de un envío (Fase 22).

Cada faltante, daño, retención o diferencia de peso pasa a tener dueño, estado y
resolución. Antes vivían en un mensaje suelto, que es donde una anomalía se
convierte en algo que "alguien comentó" y nadie cerró.
"""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base

INCIDENT_TYPES = ("WEIGHT_DIFF", "MISSING_BOX", "DAMAGE", "CUSTOMS_RETENTION", "OTHER")
INCIDENT_STATUSES = ("OPEN", "RESOLVED")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Siempre cuelga de un envío; la tarima y la caja acotan cuando se sabe.
    shipment_id = Column(
        UUID(as_uuid=True), ForeignKey("shipments.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    pallet_id = Column(
        UUID(as_uuid=True), ForeignKey("pallets.id", ondelete="SET NULL"), nullable=True
    )
    box_id = Column(UUID(as_uuid=True), ForeignKey("boxes.id", ondelete="SET NULL"), nullable=True)

    type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, nullable=False, server_default="OPEN")

    created_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolved_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolution_note = Column(String, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
