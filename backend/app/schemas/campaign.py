from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import field_validator

from app.schemas._base import (
    StrictModel,
    StrictORMModel,
    StrictUUID,
    StrictDate,
    StrictDecimal,
    validate_country_code,
)


class CampaignCreate(StrictModel):
    name: str
    origin_country: str | None = None
    destination_country: str | None = None
    description: str | None = None
    start_date: StrictDate | None = None
    end_date: StrictDate | None = None
    # Optional: every active user of these centers is added as a campaign
    # member on creation (same mechanism as adding members one by one).
    center_ids: list[StrictUUID] | None = None

    @field_validator("origin_country", "destination_country")
    @classmethod
    def validate_country(cls, v: str | None) -> str | None:
        return validate_country_code(v)


class CampaignUpdate(StrictModel):
    name: str | None = None
    origin_country: str | None = None
    destination_country: str | None = None
    description: str | None = None
    start_date: StrictDate | None = None
    end_date: StrictDate | None = None
    is_active: bool | None = None
    weight_goal_kg: StrictDecimal | None = None

    @field_validator("origin_country", "destination_country")
    @classmethod
    def validate_country(cls, v: str | None) -> str | None:
        return validate_country_code(v)


class CampaignOut(StrictORMModel):
    id: UUID
    name: str
    slug: str | None
    origin_country: str | None
    destination_country: str | None
    description: str | None
    start_date: date | None
    end_date: date | None
    is_active: bool
    is_general: bool
    weight_goal_kg: Decimal | None
    created_at: datetime


class CampaignMemberAdd(StrictModel):
    user_id: StrictUUID


class CampaignMemberOut(StrictORMModel):
    id: UUID
    email: str
    username: str
    full_name: str | None
    center_role: str | None
    center_id: UUID | None
    is_active: bool
