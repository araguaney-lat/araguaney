"""Esquemas de la cola de revisiones de riesgo (Fase 20)."""

from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas._base import StrictModel, StrictORMModel

_RESOLUTIONS = ("APPROVED", "REJECTED")


class RiskReviewOut(StrictORMModel):
    id: UUID
    center_id: UUID
    intake_id: UUID | None
    kind: str
    status: str
    reason: str | None
    boxes: str | None
    created_at: datetime
    reviewed_at: datetime | None
    review_note: str | None


class RiskReviewResolveIn(StrictModel):
    resolution: str
    note: str | None = Field(default=None, max_length=1000)

    @field_validator("resolution")
    @classmethod
    def _valida(cls, v: str) -> str:
        if v not in _RESOLUTIONS:
            raise ValueError(f"resolution debe ser uno de: {', '.join(_RESOLUTIONS)}")
        return v
