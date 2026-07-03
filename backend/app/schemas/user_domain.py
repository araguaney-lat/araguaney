from uuid import UUID

from pydantic import field_validator

from app.schemas._base import StrictModel, StrictORMModel, validate_country_code

CENTER_ROLES = ("national_admin", "coordinator", "volunteer")


class UserInvite(StrictModel):
    email: str
    username: str
    full_name: str | None = None
    center_role: str = "volunteer"
    country_code: str | None = None

    @field_validator("country_code")
    @classmethod
    def validate_country(cls, v: str | None) -> str | None:
        return validate_country_code(v)


class UserOut(StrictORMModel):
    id: UUID
    email: str
    username: str
    full_name: str | None
    avatar_url: str | None
    role: str
    center_role: str | None
    center_id: UUID | None
    country_code: str | None
    is_active: bool
    totp_enabled: bool
    must_accept_terms: bool


class UserUpdate(StrictModel):
    full_name: str


class CampaignSummary(StrictORMModel):
    id: UUID
    name: str


class UserProfileOut(StrictORMModel):
    id: UUID
    email: str
    username: str
    full_name: str | None
    avatar_url: str | None
    center_role: str | None
    center_id: UUID | None
    center_name: str | None
    campaigns: list[CampaignSummary]


class AvatarOut(StrictORMModel):
    avatar_url: str | None
