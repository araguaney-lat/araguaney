import uuid
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)

    # Status
    is_active = Column(Boolean, nullable=False, server_default="true")
    is_verified = Column(Boolean, nullable=False, server_default="false")
    verification_token = Column(String, nullable=True)

    # Role & plan
    role = Column(String, nullable=False, server_default="user")  # user | admin | superadmin
    plan = Column(String, nullable=False, server_default="free")  # free | pro

    # OAuth
    registered_provider = Column(String, nullable=True)  # google | github | etc.

    # Password reset
    reset_password_token = Column(String, nullable=True)
    reset_password_token_expires_at = Column(DateTime, nullable=True)

    # Login lockout — resets to 0 on successful login
    login_attempts = Column(Integer, nullable=False, server_default="0")
    lockout_until = Column(DateTime, nullable=True)

    # Domain: acopio tenant membership
    center_id = Column(UUID(as_uuid=True), ForeignKey("centers.id", ondelete="SET NULL"), nullable=True, index=True)
    center_role = Column(String, nullable=True)  # national_admin | coordinator | volunteer

    # Invitation / forced password change
    must_change_password = Column(Boolean, nullable=False, server_default="false")

    # Legal — Fase 13 tarea 3 (LFPDPPP)
    accepted_terms_at = Column(DateTime(timezone=True), nullable=True)
    accepted_terms_version = Column(String, nullable=True)

    # 2FA / TOTP
    totp_secret = Column(String, nullable=True)        # Fernet-encrypted base32 secret
    totp_enabled = Column(Boolean, nullable=False, server_default="false")
    totp_backup_codes = Column(String, nullable=True)  # JSON array of bcrypt-hashed codes

    # Timestamps
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())

    @property
    def must_accept_terms(self) -> bool:
        from app.legal import CURRENT_TERMS_VERSION
        return self.accepted_terms_version != CURRENT_TERMS_VERSION
