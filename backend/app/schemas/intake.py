from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from app.schemas._base import StrictModel, StrictORMModel


class BoxDraft(StrictModel):
    product_type_id: UUID
    quantity: int
    unit: str
    batch: str | None = None
    expiry_date: date | None = None
    weight_kg: Decimal | None = None


class IntakeCreate(StrictModel):
    campaign_id: UUID | None = None
    donante_libre: str | None = None
    notes: str | None = None
    boxes: list[BoxDraft]


class BoxOut(StrictORMModel):
    id: UUID
    code: str
    product_type_id: UUID
    quantity: int
    unit: str
    batch: str | None
    expiry_date: date | None
    weight_kg: Decimal | None
    status: str
    reject_reason: str | None
    created_at: datetime


class IntakeOut(StrictORMModel):
    id: UUID
    center_id: UUID
    campaign_id: UUID
    donante_libre: str | None
    notes: str | None
    created_at: datetime
    boxes: list[BoxOut] = []
