"""Shared base models with Pydantic v2 strict mode enabled globally.

StrictModel      — for input schemas (request bodies, query params)
StrictORMModel   — for output schemas mapped from SQLAlchemy ORM objects
StrictUUID / StrictDate / StrictDatetime / StrictDecimal
                 — field types for StrictModel input schemas (see note below)
"""

import re
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")


class StrictORMModel(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid", from_attributes=True)


# FastAPI parses JSON request bodies into a plain Python dict (via json.loads)
# before handing them to Pydantic, so a bare `UUID`/`date`/`datetime`/`Decimal`
# field under strict=True rejects every real HTTP JSON request with
# "Input should be an instance of X" — JSON has no native representation for
# any of these types, a request body can only ever send the string form.
# These aliases keep strict=True's other protections (no silent int/str
# coercion elsewhere) while allowing the one coercion every JSON client
# actually needs for each type — still reject malformed input. Use these
# instead of the bare type on any StrictModel INPUT field (not StrictORMModel
# output fields, which are built from real Python instances, never parsed
# from JSON).
StrictUUID = Annotated[UUID, Field(strict=False)]
StrictDate = Annotated[date, Field(strict=False)]
StrictDatetime = Annotated[datetime, Field(strict=False)]
StrictDecimal = Annotated[Decimal, Field(strict=False)]

_COUNTRY_CODE_RE = re.compile(r"^[A-Z]{2}$")


def validate_country_code(v: str | None) -> str | None:
    """Shared validator for ISO 3166-1 alpha-2 country code fields."""
    if v is not None and not _COUNTRY_CODE_RE.match(v):
        raise ValueError("must be 2 uppercase letters (ISO 3166-1 alpha-2)")
    return v
