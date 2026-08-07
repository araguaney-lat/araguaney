from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.schemas._base import StrictModel, StrictORMModel, StrictUUID


class BoxSealRequest(StrictModel):
    pass  # no body needed; sealing is a state transition


class BoxOut(StrictORMModel):
    id: UUID
    code: str
    center_id: UUID
    product_type_id: UUID
    intake_id: UUID | None
    pallet_id: UUID | None
    quantity: int
    unit: str
    batch: str | None
    expiry_date: date | None
    weight_kg: Decimal | None
    status: str
    reject_reason: str | None
    sealed_at: datetime | None
    created_at: datetime


class BoxPublicOut(StrictORMModel):
    """Public-facing box ficha — no PII, safe to cache at the edge."""
    code: str
    status: str
    category: str
    display_name: str
    quantity: int
    unit: str
    expiry_date: date | None
    sealed_at: datetime | None
    # Dato del envío, no de la caja: lo despachado sigue congelado (Fase 22).
    delivered: bool = False
    delivered_at: datetime | None = None


class BoxCodeReserveIn(StrictModel):
    """Petición de un bloque de códigos pre-asignados (Fase 25)."""

    count: int = Field(ge=1, le=200)
    # Solo lo honra un national_admin, igual que en el intake.
    center_id: StrictUUID | None = None


class BoxCodeBlockOut(StrictModel):
    codes: list[str]
    available: int
