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


class RegistrationOut(StrictModel):
    """Resultado de darse de alta.

    Tiene dos formas según la configuración de verificación por correo: con
    sesión inmediata, o solo el aviso de que hay un correo en camino. Por eso el
    token es opcional, y no porque a veces falte por descuido.
    """

    message: str
    access_token: str | None = None


class AcceptTermsOut(StrictModel):
    """Resultado de aceptar los términos: qué versión quedó registrada."""

    accepted_terms_version: str
    must_accept_terms: bool


class TotpPending(StrictModel):
    """Respuesta del inicio de sesión cuando la cuenta tiene segundo factor.

    El inicio de sesión tiene dos desenlaces y esta es la mitad que faltaba
    describir: credenciales correctas, sesión todavía no. El `partial_token`
    caduca en minutos y solo sirve para `POST /v1/auth/totp/challenge`; no abre
    ningún otro endpoint.

    Se declara para que el contrato publicado no mienta sobre lo que devuelve el
    endpoint. Aun así, un cliente tipado no puede expresar "200 → Token u 202 →
    esto" en un solo método, así que seguirá tratando el inicio de sesión aparte
    (Fase 26, task 3).
    """

    requires_totp: bool = True
    partial_token: str


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
