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
    # Restricción de altura del envío (Fase 21). Se advierte contra la altura de
    # cada tarima; nunca bloquea.
    height_profile: str | None = None
    # Only honored for national_admin (no home center) — coordinator always
    # uses their own center_id, this field is ignored for them.
    center_id: StrictUUID | None = None


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
    delivered_at: datetime | None = None
    reconciled_at: datetime | None = None
    created_at: datetime
    height_profile: str | None = None


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
    delivered_at: datetime | None = None
    reconciled_at: datetime | None = None
    created_at: datetime
    height_profile: str | None = None
    # Tarimas que no caben en el perfil declarado. Aviso, no bloqueo.
    height_warnings: list[str] = []
    pallets: list[PalletDetailOut]


class MilestoneIn(StrictModel):
    """Hito logístico. `occurred_at` es opcional porque el reporte del
    consignatario suele llegar tarde y describir algo de ayer."""

    milestone: str
    note: str | None = None
    occurred_at: datetime | None = None


class DeliveredIn(StrictModel):
    note: str | None = None
    delivered_at: datetime | None = None
