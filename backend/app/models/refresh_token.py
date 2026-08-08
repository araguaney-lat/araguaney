import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class RefreshToken(Base):
    """Refresh token rotatorio, una fila por token emitido.

    El token en claro nunca se guarda: se almacena su SHA-256 (`token_hash`).
    Una filtración de la base no entrega tokens usables.

    **Rotación con detección de reuso.** Cada uso de `/auth/refresh` marca el
    token actual como `revoked`, apunta `replaced_by` al nuevo y emite otro de la
    misma `family_id`. Si más tarde llega un token ya revocado, es señal de robo:
    alguien clonó la cadena. La respuesta es revocar la familia entera —el
    atacante y la víctima quedan fuera— y obligar a iniciar sesión de nuevo.

    `family_id` agrupa toda la cadena que nace de un login; revocar por familia es
    revocar esa sesión sin tocar las demás (otro dispositivo sigue vivo).
    """

    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash = Column(String, nullable=False, unique=True, index=True)
    family_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, nullable=False, default=False)
    # Apunta al token que sustituyó a este al rotar; NULL mientras es el vigente.
    replaced_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_now)
