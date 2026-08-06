import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class BoxEvent(Base):
    __tablename__ = "box_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    box_id = Column(UUID(as_uuid=True), ForeignKey("boxes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    note = Column(String, nullable=True)
    ts = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class PalletEvent(Base):
    __tablename__ = "pallet_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pallet_id = Column(UUID(as_uuid=True), ForeignKey("pallets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    note = Column(String, nullable=True)
    ts = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Hitos logísticos (Fase 22). Un hito es un evento con from_status = to_status:
# registra el suceso sin inventar estados intermedios, así que la máquina de
# estados no crece cada vez que la operación quiere anotar un paso más.
SHIPMENT_MILESTONES = (
    "DEPARTED_WAREHOUSE",
    "ARRIVED_AIRPORT",
    "LOADED_AIRCRAFT",
    "DEPARTED_FLIGHT",
    "ARRIVED_DESTINATION",
    "CUSTOMS_CLEARED",
    "DELIVERED_CONSIGNEE",
)


class ShipmentEvent(Base):
    __tablename__ = "shipment_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    milestone = Column(String, nullable=True)
    note = Column(String, nullable=True)
    ts = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
