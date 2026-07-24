import uuid

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base

# Only failure/attention events are persisted — successful deliveries are not
# stored (Resend keeps those; storing them would bloat the table for no action).
EMAIL_FAILURE_EVENTS = ("bounced", "complained", "delivery_delayed")


class EmailFailure(Base):
    """A transactional email that failed to deliver (bounce / spam complaint /
    delayed). Populated by the Resend webhook, correlated to the originating
    entity via tags set at send time. Cleared (`resolved_at`) on a later
    `delivered` event or a manual resend."""

    __tablename__ = "email_failures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    resend_email_id = Column(String, nullable=False, index=True)
    to_email = Column(String, nullable=False)

    # Correlation, from Resend tags set at send time.
    email_type = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(UUID(as_uuid=True), nullable=True)

    event_type = Column(String, nullable=False)  # CHECK: EMAIL_FAILURE_EVENTS
    reason = Column(String, nullable=True)

    # Svix delivery id — dedupes webhook retries.
    svix_id = Column(String, nullable=False, unique=True)

    occurred_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
