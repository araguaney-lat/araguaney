from datetime import datetime
from uuid import UUID

from app.schemas._base import StrictModel, StrictORMModel, StrictUUID
from app.schemas.pallet import PalletDetailOut


class ShipmentCreate(StrictModel):
    campaign_id: StrictUUID | None = None
    destination: str = "Venezuela"
    carrier: str | None = None
    reference: str | None = None
    notes: str | None = None


class ShipmentOut(StrictORMModel):
    id: UUID
    center_id: UUID | None
    campaign_id: UUID | None
    destination: str
    carrier: str | None
    reference: str | None
    status: str
    notes: str | None
    closed_at: datetime | None
    shipped_at: datetime | None
    created_at: datetime


class ShipmentDetailOut(StrictModel):
    id: UUID
    center_id: UUID | None
    campaign_id: UUID | None
    destination: str
    carrier: str | None
    reference: str | None
    status: str
    notes: str | None
    closed_at: datetime | None
    shipped_at: datetime | None
    created_at: datetime
    pallets: list[PalletDetailOut]
