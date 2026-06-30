from app.schemas._base import StrictModel


class UserCreate(StrictModel):
    email: str
    username: str
    password: str
    full_name: str | None = None


class Token(StrictModel):
    access_token: str
    token_type: str = "bearer"
    center_role: str | None = None
    center_id: str | None = None


class ResendRequest(StrictModel):
    email: str


class ForgotPasswordRequest(StrictModel):
    email: str


class ResetPasswordRequest(StrictModel):
    token: str
    new_password: str


class OAuthLogin(StrictModel):
    email: str
    name: str | None = None
    avatar_url: str | None = None
    provider: str = "google"


# ── TOTP / 2FA ────────────────────────────────────────────────────────────────

class TOTPSetupOut(StrictModel):
    qr_uri: str
    secret: str


class TOTPConfirmIn(StrictModel):
    code: str


class TOTPConfirmOut(StrictModel):
    backup_codes: list[str]


class TOTPChallengeIn(StrictModel):
    partial_token: str
    code: str
