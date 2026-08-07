from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas._base import StrictModel, StrictORMModel, StrictUUID


class IncidentCreate(StrictModel):
    type: str
    description: str = Field(min_length=1, max_length=1000)
    # Acotan la incidencia cuando se sabe dónde ocurrió. Una incidencia siempre
    # cuelga de un envío; la tarima y la caja son opcionales.
    pallet_id: StrictUUID | None = None
    box_id: StrictUUID | None = None


class IncidentResolve(StrictModel):
    note: str = Field(min_length=1, max_length=1000)


class IncidentOut(StrictORMModel):
    id: UUID
    shipment_id: UUID
    pallet_id: UUID | None
    box_id: UUID | None
    type: str
    description: str
    status: str
    resolution_note: str | None
    resolved_at: datetime | None
    created_at: datetime
