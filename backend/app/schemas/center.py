import re
from datetime import datetime
from uuid import UUID

from pydantic import field_validator

from app.schemas._base import StrictModel, StrictORMModel

_COUNTRY_CODE_RE = re.compile(r"^[A-Z]{2}$")


def _validate_country_code(v: str | None) -> str | None:
    if v is not None and not _COUNTRY_CODE_RE.match(v):
        raise ValueError("country_code must be 2 uppercase letters (ISO 3166-1 alpha-2)")
    return v


class CenterCreate(StrictModel):
    name: str
    address: str | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    country_code: str | None = None
    state_name: str | None = None
    # Identidad del centro como emisor de documentos de transporte (Fase 21).
    # Se imprime tal cual: no se valida el formato, porque un RFC, un RIF y
    # un EIN no se parecen en nada.
    legal_name: str | None = None
    tax_id: str | None = None

    @field_validator("country_code")
    @classmethod
    def validate_country_code(cls, v: str | None) -> str | None:
        return _validate_country_code(v)


class CenterUpdate(StrictModel):
    name: str | None = None
    address: str | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    is_active: bool | None = None
    country_code: str | None = None
    state_name: str | None = None
    # Identidad del centro como emisor de documentos de transporte (Fase 21).
    # Se imprime tal cual: no se valida el formato, porque un RFC, un RIF y
    # un EIN no se parecen en nada.
    legal_name: str | None = None
    tax_id: str | None = None

    @field_validator("country_code")
    @classmethod
    def validate_country_code(cls, v: str | None) -> str | None:
        return _validate_country_code(v)


class CenterOut(StrictORMModel):
    id: UUID
    name: str
    address: str | None
    contact_name: str | None
    contact_email: str | None
    contact_phone: str | None
    country_code: str | None
    state_name: str | None
    legal_name: str | None = None
    tax_id: str | None = None
    is_active: bool
    created_at: datetime
