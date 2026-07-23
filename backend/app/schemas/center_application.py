import re
from datetime import datetime
from urllib.parse import urlparse
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas._base import StrictModel, StrictORMModel, validate_country_code

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class CenterApplicationCreate(StrictModel):
    """Public submission — the applicant is the prospective coordinator."""

    center_name: str = Field(min_length=2, max_length=160)
    country_code: str
    state_name: str | None = Field(default=None, max_length=120)
    address: str | None = Field(default=None, max_length=300)
    contact_name: str = Field(min_length=2, max_length=120)
    contact_email: str = Field(max_length=254)
    contact_phone: str | None = Field(default=None, max_length=40)
    backing_org: str | None = Field(default=None, max_length=200)
    social_url: str | None = Field(default=None, max_length=300)
    message: str | None = Field(default=None, max_length=2000)

    @field_validator("country_code")
    @classmethod
    def _country(cls, v: str) -> str:
        validated = validate_country_code(v)
        if validated is None:
            raise ValueError("country_code is required")
        return validated

    @field_validator("contact_email")
    @classmethod
    def _email(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("invalid email")
        return v

    @field_validator("social_url")
    @classmethod
    def _social_url(cls, v: str | None) -> str | None:
        # Display-only link (never fetched server-side), so a strict https+host
        # format check is enough — no SSRF surface to guard.
        if v is None or not v.strip():
            return None
        v = v.strip()
        parsed = urlparse(v)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ValueError("social_url must be a valid https:// URL")
        return v


class CenterApplicationConfirm(StrictModel):
    token: str = Field(min_length=8, max_length=200)


class CenterApplicationReject(StrictModel):
    reason: str = Field(min_length=3, max_length=500)


class CenterApplicationOut(StrictORMModel):
    """Queue view for reviewers (national_admin / superadmin)."""

    id: UUID
    center_name: str
    country_code: str
    state_name: str | None
    address: str | None
    contact_name: str
    contact_email: str
    contact_phone: str | None
    backing_org: str | None
    social_url: str | None
    message: str | None
    status: str
    email_verified_at: datetime | None
    reviewed_at: datetime | None
    reject_reason: str | None
    created_center_id: UUID | None
    created_at: datetime


class CenterApplicationSubmitOut(StrictModel):
    """Response to a public submit — no internal fields leaked."""

    id: UUID
    status: str
