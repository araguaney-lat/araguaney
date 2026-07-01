import uuid
from sqlalchemy import Column, Numeric, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

PALLET_STATUSES = ("OPEN", "CLOSED", "SHIPPED")


class Pallet(Base):
    __tablename__ = "pallets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, nullable=False, unique=True, index=True)
    center_id = Column(UUID(as_uuid=True), ForeignKey("centers.id", ondelete="CASCADE"), nullable=False, index=True)
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String, nullable=False, server_default="OPEN")
    notes = Column(String, nullable=True)
    tare_weight_kg = Column(Numeric(8, 3), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
