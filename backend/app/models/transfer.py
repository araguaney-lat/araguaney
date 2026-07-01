import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

TRANSFER_STATUSES = ("REQUESTED", "APPROVED", "IN_TRANSIT", "RECEIVED", "REJECTED")


class Transfer(Base):
    __tablename__ = "transfers"
    __table_args__ = (
        CheckConstraint(
            "status IN ('REQUESTED','APPROVED','IN_TRANSIT','RECEIVED','REJECTED')",
            name="transfers_status_check",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_center_id = Column(UUID(as_uuid=True), ForeignKey("centers.id", ondelete="RESTRICT"),
                            nullable=False, index=True)
    to_center_id = Column(UUID(as_uuid=True), ForeignKey("centers.id", ondelete="RESTRICT"),
                          nullable=False, index=True)
    status = Column(String, nullable=False, server_default="REQUESTED")
    initiated_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
                          nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())


class TransferItem(Base):
    __tablename__ = "transfer_items"
    __table_args__ = (
        UniqueConstraint("transfer_id", "box_id", name="uq_transfer_items_transfer_box"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transfer_id = Column(UUID(as_uuid=True), ForeignKey("transfers.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    box_id = Column(UUID(as_uuid=True), ForeignKey("boxes.id", ondelete="RESTRICT"),
                    nullable=False, index=True)


class TransferEvent(Base):
    __tablename__ = "transfer_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transfer_id = Column(UUID(as_uuid=True), ForeignKey("transfers.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    note = Column(String, nullable=True)
    ts = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
