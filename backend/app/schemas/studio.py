from datetime import datetime
from typing import Any
from uuid import UUID

from app.schemas._base import StrictModel, StrictORMModel, StrictUUID


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
    password: str | None = None  # if None, a random temp password is generated


class StudioUserPatch(StrictModel):
    center_id: StrictUUID | None = None
    center_role: str | None = None
    is_active: bool | None = None
    full_name: str | None = None


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
