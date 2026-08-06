"""Public QR ficha schemas — no PII, safe to cache at Cloudflare edge."""
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from app.schemas._base import StrictModel


class QrEventOut(StrictModel):
    from_status: str | None
    to_status: str
    # Presente solo en hitos logísticos (Fase 22): el evento no cambió de estado,
    # anotó que algo ocurrió en el camino.
    milestone: str | None = None
    note: str | None
    ts: datetime


class QrBoxFicha(StrictModel):
    kind: Literal["box"] = "box"
    code: str
    status: str
    # Product info
    display_name: str
    category: str
    inn_name: str | None
    strength: str | None
    form: str | None
    # Batch / expiry
    batch: str | None
    expiry_date: date | None
    # Quantity / weight
    quantity: int
    unit: str
    weight_kg: Decimal | None
    # Context
    center_name: str
    campaign_name: str | None
    sealed_at: datetime | None
    created_at: datetime
    # History
    events: list[QrEventOut]


class QrPalletBoxRow(StrictModel):
    display_name: str
    category: str
    quantity: int
    unit: str
    weight_kg: Decimal | None


class QrPalletFicha(StrictModel):
    kind: Literal["pallet"] = "pallet"
    code: str
    status: str
    center_name: str
    box_count: int
    total_weight_kg: Decimal | None
    closed_at: datetime | None
    created_at: datetime
    boxes: list[QrPalletBoxRow]
    events: list[QrEventOut]
