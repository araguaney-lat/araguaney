import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

SHIPMENT_STATUSES = ("OPEN", "CLOSED", "SHIPPED")


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    center_id = Column(UUID(as_uuid=True), ForeignKey("centers.id", ondelete="SET NULL"), nullable=True, index=True)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    destination = Column(String, nullable=False, server_default="Venezuela")
    carrier = Column(String, nullable=True)
    reference = Column(String, nullable=True)
    status = Column(String, nullable=False, server_default="OPEN")
    notes = Column(String, nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    shipped_at = Column(DateTime(timezone=True), nullable=True)
    # Restricción de altura declarada por el envío (Fase 21). Se advierte, no
    # se bloquea: quien está en el andén ve la tarima y el sistema no.
    height_profile = Column(String, nullable=True)
    # Perfil de país para la declaración de mercancías, si aplica. Sin perfil,
    # el documento sale con nombres de campo universales.
    declaration_profile = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
