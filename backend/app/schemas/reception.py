from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.schemas._base import StrictDecimal, StrictModel, StrictORMModel, StrictUUID

RECEPTION_OUTCOMES = ("RECEIVED", "MISSING", "DAMAGED", "RETAINED_CUSTOMS")


class ReceptionExceptionIn(StrictModel):
    """Una caja que **no** llegó bien.

    Solo viajan las excepciones: lo que no aparece en la lista se da por
    recibido. La merma es la minoría y el formulario optimiza para el caso
    normal.
    """

    box_id: StrictUUID
    outcome: str
    note: str | None = Field(default=None, max_length=500)


class ReceptionPalletWeightIn(StrictModel):
    pallet_id: StrictUUID
    gross_weight_kg: StrictDecimal


class ReceptionCreate(StrictModel):
    exceptions: list[ReceptionExceptionIn] = []
    pallet_weights: list[ReceptionPalletWeightIn] = []
    consignee_name: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=1000)


class ReceptionLineOut(StrictORMModel):
    box_id: UUID
    outcome: str
    note: str | None


class ReceptionPalletWeightOut(StrictORMModel):
    pallet_id: UUID
    gross_weight_kg: Decimal


class ShrinkageOut(StrictModel):
    total_boxes: int
    received: int
    not_received: int
    shrinkage_pct: float


class ReceptionOut(StrictModel):
    id: UUID
    shipment_id: UUID
    received_at: datetime
    consignee_name: str | None
    notes: str | None
    lines: list[ReceptionLineOut] = []
    pallet_weights: list[ReceptionPalletWeightOut] = []
    shrinkage: ShrinkageOut
