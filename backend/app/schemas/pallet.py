from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.schemas._base import StrictModel, StrictORMModel, StrictDecimal
from app.schemas.box import BoxOut


class PalletCreate(StrictModel):
    notes: str | None = None
    tare_weight_kg: StrictDecimal | None = None


class PalletOut(StrictORMModel):
    id: UUID
    code: str
    center_id: UUID
    shipment_id: UUID | None
    status: str
    notes: str | None
    tare_weight_kg: Decimal | None
    closed_at: datetime | None
    created_at: datetime


class PalletDetailOut(StrictModel):
    id: UUID
    code: str
    center_id: UUID
    shipment_id: UUID | None
    status: str
    notes: str | None
    tare_weight_kg: Decimal | None = None
    closed_at: datetime | None
    created_at: datetime
    boxes: list[BoxOut]


class PalletPublicOut(StrictModel):
    """Public pallet ficha — no PII, safe to cache at the edge."""
    code: str
    status: str
    center_name: str
    box_count: int
    closed_at: datetime | None
