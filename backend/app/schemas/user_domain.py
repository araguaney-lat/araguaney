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
