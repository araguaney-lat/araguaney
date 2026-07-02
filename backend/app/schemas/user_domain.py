from uuid import UUID

from app.schemas._base import StrictModel, StrictORMModel

CENTER_ROLES = ("national_admin", "coordinator", "volunteer")


class UserInvite(StrictModel):
    email: str
    username: str
    full_name: str | None = None
    center_role: str = "volunteer"


class UserOut(StrictORMModel):
    id: UUID
    email: str
    username: str
    full_name: str | None
    role: str
    center_role: str | None
    center_id: UUID | None
    is_active: bool
    totp_enabled: bool


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
