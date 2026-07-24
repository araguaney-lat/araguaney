from datetime import datetime
from uuid import UUID

from app.schemas._base import StrictORMModel


class EmailFailureOut(StrictORMModel):
    id: UUID
    resend_email_id: str
    to_email: str
    email_type: str
    entity_type: str | None
    entity_id: UUID | None
    event_type: str
    reason: str | None
    occurred_at: datetime | None
    resolved_at: datetime | None
    created_at: datetime
