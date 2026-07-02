from datetime import datetime
from uuid import UUID

from app.schemas._base import StrictModel, StrictORMModel, StrictUUID
from app.schemas.box import BoxOut


class TransferCreate(StrictModel):
    from_center_id: StrictUUID
    to_center_id: StrictUUID
    box_ids: list[StrictUUID]
    notes: str | None = None


class TransferReject(StrictModel):
    reason: str | None = None


class TransferEventOut(StrictORMModel):
    id: UUID
    transfer_id: UUID
    from_status: str | None
    to_status: str
    user_id: UUID | None
    note: str | None
    ts: datetime


class TransferOut(StrictORMModel):
    id: UUID
    from_center_id: UUID
    to_center_id: UUID
    status: str
    initiated_by: UUID | None
    notes: str | None
    created_at: datetime
    updated_at: datetime | None


class TransferDetailOut(StrictModel):
    id: UUID
    from_center_id: UUID
    to_center_id: UUID
    status: str
    initiated_by: UUID | None
    notes: str | None
    created_at: datetime
    updated_at: datetime | None
    boxes: list[BoxOut]
    events: list[TransferEventOut]
