import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base

# Application lifecycle. The Center is created ONLY on approval, so a pending
# application is never a Center → it can't leak into the national aggregate or
# the public "qué falta". The application IS the quarantine.
APPLICATION_STATUSES = ("PENDING_EMAIL", "PENDING_REVIEW", "APPROVED", "REJECTED")


class CenterApplication(Base):
    __tablename__ = "center_applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Center being requested
    center_name = Column(String, nullable=False)
    country_code = Column(String(2), nullable=False)  # ISO 3166-1 alpha-2
    state_name = Column(String, nullable=True)
    address = Column(String, nullable=True)

    # Prospective coordinator (the applicant)
    contact_name = Column(String, nullable=False)
    contact_email = Column(String, nullable=False)
    contact_phone = Column(String, nullable=True)

    # Trust signals
    backing_org = Column(String, nullable=True)
    social_url = Column(String, nullable=True)
    message = Column(Text, nullable=True)

    status = Column(String, nullable=False, server_default="PENDING_EMAIL")

    # Email double opt-in: only the hash of the token is stored, never the raw.
    email_verify_token_hash = Column(String, nullable=True)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)

    # Review
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reject_reason = Column(Text, nullable=True)

    # Result of approval
    created_center_id = Column(UUID(as_uuid=True), ForeignKey("centers.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
