from datetime import datetime
from decimal import Decimal
from uuid import UUID

from app.schemas._base import StrictModel, StrictORMModel, StrictUUID, StrictDecimal
from app.schemas.box import BoxOut


class PalletCreate(StrictModel):
    notes: str | None = None
    tare_weight_kg: StrictDecimal | None = None
    # Only honored for national_admin (no home center) — coordinator always
    # uses their own center_id, this field is ignored for them.
    center_id: StrictUUID | None = None


class PalletOut(StrictORMModel):
    id: UUID
    code: str
    center_id: UUID
    shipment_id: UUID | None
    status: str
    notes: str | None
    tare_weight_kg: Decimal | None
    gross_weight_kg: Decimal | None = None
    height_cm: int | None = None
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
    gross_weight_kg: Decimal | None = None
    height_cm: int | None = None
    # Suma de las cajas pesadas y su diferencia contra el neto de la tarima.
    # Se espera positiva y pequeña: la tarima carga base y emplaye.
    boxes_weight_kg: Decimal | None = None
    weight_discrepancy_kg: Decimal | None = None


class PalletPublicOut(StrictModel):
    """Public pallet ficha — no PII, safe to cache at the edge."""
    code: str
    status: str
    center_name: str
    box_count: int
    closed_at: datetime | None
    delivered: bool = False
    delivered_at: datetime | None = None


class PalletCloseIn(StrictModel):
    """Pesaje al cerrar. Todo opcional: una báscula descompuesta no puede
    impedir que se cierre una tarima ya armada."""

    gross_weight_kg: StrictDecimal | None = None
    height_cm: int | None = None
