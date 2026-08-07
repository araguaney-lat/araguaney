from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import field_validator

from app.schemas._base import StrictModel, StrictORMModel, StrictUUID, validate_country_code


# ── Audit ─────────────────────────────────────────────────────────────────────

class AuditLogOut(StrictORMModel):
    id: UUID
    user_id: UUID | None
    action: str
    entity_type: str
    entity_id: str | None
    extra: dict[str, Any] | None
    ip: str | None
    created_at: datetime


class AuditListOut(StrictModel):
    items: list[AuditLogOut]
    total: int
    limit: int
    offset: int


# ── Studio users ──────────────────────────────────────────────────────────────

class StudioUserCreate(StrictModel):
    email: str
    username: str
    full_name: str | None = None
    center_id: StrictUUID | None = None
    center_role: str = "volunteer"
    country_code: str | None = None
    password: str | None = None  # if None, a random temp password is generated

    @field_validator("country_code")
    @classmethod
    def validate_country(cls, v: str | None) -> str | None:
        return validate_country_code(v)


class StudioUserPatch(StrictModel):
    center_id: StrictUUID | None = None
    center_role: str | None = None
    is_active: bool | None = None
    full_name: str | None = None
    country_code: str | None = None

    @field_validator("country_code")
    @classmethod
    def validate_country(cls, v: str | None) -> str | None:
        return validate_country_code(v)


# ── Requests ──────────────────────────────────────────────────────────────────

class RequestMessageOut(StrictORMModel):
    id: UUID
    request_id: UUID
    author_id: UUID | None
    body: str
    created_at: datetime


class RequestOut(StrictORMModel):
    id: UUID
    author_id: UUID | None
    center_id: UUID | None
    title: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime
    messages: list[RequestMessageOut] = []


class RequestCreate(StrictModel):
    title: str
    description: str


class RequestMessageCreate(StrictModel):
    body: str


class RequestStatusPatch(StrictModel):
    status: str


# ── Gasto de IA (Fase 23, task 3) ────────────────────────────────────────────

class AICapabilityUsageOut(StrictORMModel):
    capability: str
    # Estado del interruptor, no del uso. Cero llamadas con la capacidad
    # encendida y cero llamadas con la capacidad apagada piden acciones
    # opuestas, así que el panel no puede confundirlas.
    enabled: bool
    calls: int
    input_tokens: int
    output_tokens: int
    cost_usd: float


class AIDailySpendOut(StrictORMModel):
    day: date
    cost_usd: float
    calls: int


class AICenterSpendOut(StrictORMModel):
    center_name: str
    cost_usd: float


class AIUsageReportOut(StrictORMModel):
    month_start: datetime
    monthly_budget_usd: float
    month_spend_usd: float
    budget_exhausted: bool
    # Sin proveedor configurado toda capacidad está apagada aunque su bandera
    # diga que sí.
    provider_configured: bool
    model: str
    capabilities: list[AICapabilityUsageOut]
    daily: list[AIDailySpendOut]
    top_centers: list[AICenterSpendOut]
