import re

from pydantic import field_validator

from app.schemas._base import StrictModel


class UserCreate(StrictModel):
    email: str
    username: str
    password: str
    full_name: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must be at most 128 characters")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter")
        return v


class Token(StrictModel):
    access_token: str
    # Nullable porque el paso intermedio de 2FA responde con este mismo esquema
    # pero sin sesión todavía; una sesión completa siempre lo trae.
    refresh_token: str | None = None
    token_type: str = "bearer"
    role: str | None = None
    center_role: str | None = None
    center_id: str | None = None
    must_change_password: bool = False
    must_accept_terms: bool = False


class RefreshRequest(StrictModel):
    refresh_token: str


class LogoutRequest(StrictModel):
    # Opcional: si el cliente lo manda, se revoca la familia entera (esa sesión),
    # no solo se invalida el access actual. El access se revoca siempre por su jti.
    refresh_token: str | None = None


class ChangePasswordRequest(StrictModel):
    current_password: str
    new_password: str


class AcceptTermsRequest(StrictModel):
    version: str


class DeleteAccountRequest(StrictModel):
    """Password confirmation for self-service account deletion (ARCO cancellation)."""

    password: str


class ResendRequest(StrictModel):
    email: str


class ForgotPasswordRequest(StrictModel):
    email: str


class ResetPasswordRequest(StrictModel):
    token: str
    new_password: str


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
