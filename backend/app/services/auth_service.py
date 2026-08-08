import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from app.arq_pool import enqueue
from app.config import settings
from app.models.refresh_token import RefreshToken
from app.models.token_denylist import TokenDenylist
from app.models.user import User
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.token_denylist_repository import TokenDenylistRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserCreate
from app.services.base import BaseService
from app.utils.errors import api_error

logger = logging.getLogger(__name__)

_LOCKOUT_THRESHOLD = 10
_LOCKOUT_MINUTES = 15
# Pre-computed dummy hash used for constant-time rejection of unknown users
_DUMMY_HASH = bcrypt.hashpw(b"__dummy_sentinel__", bcrypt.gensalt()).decode()


class AuthService(BaseService):

    # ── Token / password helpers ───────────────────────────────────────────────

    @staticmethod
    def create_access_token(
        user_id: str,
        center_id: str | None = None,
        center_role: str | None = None,
    ) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
        jti = str(uuid.uuid4())
        payload: dict = {"sub": user_id, "exp": expire, "jti": jti}
        if center_id:
            payload["center_id"] = center_id
        if center_role:
            payload["center_role"] = center_role
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    # ── Refresh tokens ──────────────────────────────────────────────────────────

    @staticmethod
    def _hash_refresh_token(raw: str) -> str:
        """SHA-256 del token en claro. Solo el hash toca la base."""
        return hashlib.sha256(raw.encode()).hexdigest()

    def _create_refresh_token(self, user_id: uuid.UUID, family_id: uuid.UUID | None = None) -> str:
        """Crea un refresh token y devuelve el valor en claro (nunca se guarda).

        `family_id` None inicia una familia nueva (un login); pasarla continúa la
        cadena existente al rotar.
        """
        raw = secrets.token_urlsafe(48)
        row = RefreshToken(
            user_id=user_id,
            token_hash=self._hash_refresh_token(raw),
            family_id=family_id or uuid.uuid4(),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
        )
        RefreshTokenRepository(self.db).save(row)
        return raw

    def _issue_session(self, user: User) -> dict:
        """Respuesta de sesión completa: access corto + refresh de larga vida.

        Único punto donde se arma; login, el paso de 2FA y el cambio forzado de
        contraseña la comparten para no divergir.
        """
        access = self.create_access_token(
            str(user.id),
            center_id=str(user.center_id) if user.center_id else None,
            center_role=user.center_role,
        )
        refresh = self._create_refresh_token(user.id)
        return {
            "access_token": access,
            "refresh_token": refresh,
            "token_type": "bearer",
            "role": user.role,
            "center_role": user.center_role,
            "center_id": str(user.center_id) if user.center_id else None,
            "must_change_password": bool(user.must_change_password),
            "must_accept_terms": user.must_accept_terms,
        }

    def _is_benign_reuse(self, repo: RefreshTokenRepository, row: RefreshToken) -> bool:
        """True si reusar este token revocado es un doble disparo del cliente.

        Benigno si fue reemplazado hace muy poco (ventana de gracia) y su
        reemplazo sigue vigente: dos renovaciones que salieron casi a la vez. Un
        reuso más tarde, o cuando la cadena ya avanzó (el reemplazo también fue
        revocado), es sospechoso y no entra por aquí.
        """
        if row.replaced_by is None:
            return False
        replacement = repo.find_by_id(row.replaced_by)
        if replacement is None or replacement.revoked or replacement.created_at is None:
            return False
        leeway = timedelta(seconds=settings.refresh_reuse_leeway_seconds)
        return datetime.now(timezone.utc) - replacement.created_at.replace(tzinfo=timezone.utc) <= leeway

    def refresh(self, raw_token: str) -> dict:
        """Rota un refresh token: emite uno nuevo y revoca el presentado.

        Detección de reuso: si el token presentado ya estaba revocado, alguien
        reusó un eslabón viejo de la cadena —señal de robo— y se revoca la
        familia entera. Un token vencido o inexistente es un 401 normal.
        """
        repo = RefreshTokenRepository(self.db)
        row = repo.find_by_hash(self._hash_refresh_token(raw_token))
        if row is None:
            raise api_error("INVALID_REFRESH_TOKEN", "Invalid refresh token", status_code=401)

        if row.revoked:
            if not self._is_benign_reuse(repo, row):
                # Reuso real de un token viejo: corta la sesión completa.
                repo.revoke_family(row.family_id)
                raise api_error("REFRESH_TOKEN_REUSED", "Refresh token reuse detected", status_code=401)
            # Doble disparo concurrente del cliente dentro de la ventana de
            # gracia: no es robo. Se sigue y se emite una rotación nueva.

        if row.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise api_error("REFRESH_TOKEN_EXPIRED", "Refresh token expired", status_code=401)

        user = UserRepository(self.db).find_by_id(row.user_id)
        if user is None or not user.is_active:
            raise api_error("INVALID_REFRESH_TOKEN", "Invalid refresh token", status_code=401)

        # Rota dentro de la misma familia y encadena la sustitución.
        new_raw = self._create_refresh_token(user.id, family_id=row.family_id)
        new_row = repo.find_by_hash(self._hash_refresh_token(new_raw))
        row.revoked = True
        row.replaced_by = new_row.id if new_row else None
        self.db.commit()

        access = self.create_access_token(
            str(user.id),
            center_id=str(user.center_id) if user.center_id else None,
            center_role=user.center_role,
        )
        return {"access_token": access, "refresh_token": new_raw, "token_type": "bearer"}

    def revoke_refresh_token(self, raw_token: str) -> None:
        """Revoca la familia de un refresh token (cierre de sesión). Silencioso
        si el token no existe: cerrar sesión no debe filtrar si era válido."""
        repo = RefreshTokenRepository(self.db)
        row = repo.find_by_hash(self._hash_refresh_token(raw_token))
        if row is not None:
            repo.revoke_family(row.family_id)

    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        return bcrypt.checkpw(plain.encode(), hashed.encode())

    # ── Registration ───────────────────────────────────────────────────────────

    def register(
        self,
        data: UserCreate,
        background_tasks: BackgroundTasks,
        auto_verify: bool = False,
    ) -> dict:
        repo = UserRepository(self.db)
        if repo.email_exists(data.email):
            raise api_error("EMAIL_TAKEN", "Email already registered", field="email")
        if repo.username_exists(data.username):
            raise api_error("USERNAME_TAKEN", "Username already taken", field="username")

        token = secrets.token_urlsafe(32)
        user = repo.save(User(
            email=data.email,
            username=data.username,
            full_name=data.full_name,
            hashed_password=self.hash_password(data.password),
            is_verified=auto_verify,
            verification_token=None if auto_verify else token,
        ))

        if auto_verify:
            return {"message": "Registration successful.", "access_token": self.create_access_token(str(user.id))}

        # TODO: enqueue send_verification_email_task
        return {"message": "Registration successful. Check your email to verify your account."}

    # ── Login / logout ─────────────────────────────────────────────────────────

    def login(self, identifier: str, password: str) -> dict:
        user = UserRepository(self.db).find_active_by_identifier(identifier)

        if not user or not user.hashed_password:
            # Constant-time response: always run bcrypt to prevent timing oracle
            bcrypt.checkpw(password.encode(), _DUMMY_HASH.encode())
            raise api_error("INVALID_CREDENTIALS", "Invalid credentials", status_code=401)

        # Check account status before spending time on bcrypt
        if not user.is_active:
            raise api_error("ACCOUNT_DISABLED", "Account is disabled", status_code=403)

        now = datetime.now(timezone.utc)
        if user.lockout_until and user.lockout_until.replace(tzinfo=timezone.utc) > now:
            remaining = max(1, int((user.lockout_until.replace(tzinfo=timezone.utc) - now).total_seconds() // 60) + 1)
            raise api_error(
                "ACCOUNT_LOCKED",
                f"Too many failed attempts. Try again in {remaining} minute(s).",
                status_code=429,
            )

        if not self.verify_password(password, user.hashed_password):
            user.login_attempts = (user.login_attempts or 0) + 1
            if user.login_attempts >= _LOCKOUT_THRESHOLD:
                user.lockout_until = (datetime.now(timezone.utc) + timedelta(minutes=_LOCKOUT_MINUTES)).replace(tzinfo=None)
                user.login_attempts = 0
                self.db.commit()
                logger.warning("Account locked after %d failed attempts: user_id=%s", _LOCKOUT_THRESHOLD, user.id)
                raise api_error(
                    "ACCOUNT_LOCKED",
                    f"Too many failed attempts. Account locked for {_LOCKOUT_MINUTES} minutes.",
                    status_code=429,
                )
            self.db.commit()
            raise api_error("INVALID_CREDENTIALS", "Invalid credentials", status_code=401)

        user.login_attempts = 0
        user.lockout_until = None
        self.db.commit()

        if not user.is_verified:
            raise api_error("EMAIL_NOT_VERIFIED", "Email address not verified", status_code=403)

        if user.totp_enabled and user.totp_secret:
            partial = self._create_partial_token(str(user.id))
            return {"requires_totp": True, "partial_token": partial}

        return self._issue_session(user)

    @staticmethod
    def _create_partial_token(user_id: str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=5)
        jti = str(uuid.uuid4())
        payload = {"sub": user_id, "exp": expire, "scope": "totp_pending", "jti": jti}
        return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

    def logout(self, token: str, refresh_token: str | None = None) -> None:
        # Revoca el refresh (su familia) para que un token filtrado no siga vivo
        # tras cerrar sesión; el access se invalida por su jti abajo.
        if refresh_token:
            self.revoke_refresh_token(refresh_token)
        try:
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            jti: str | None = payload.get("jti")
            exp: int | None = payload.get("exp")
            if jti and exp:
                expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
                repo = TokenDenylistRepository(self.db)
                if not repo.is_denied(jti):
                    repo.save(TokenDenylist(jti=jti, expires_at=expires_at))
        except jwt.PyJWTError:
            pass

    # ── Email verification ─────────────────────────────────────────────────────

    def verify_email(self, token: str) -> dict:
        repo = UserRepository(self.db)
        user = repo.find_by_verification_token(token)
        if not user:
            raise api_error("INVALID_VERIFICATION_TOKEN", "Invalid or expired verification link.")
        if user.is_verified:
            return {"message": "already_verified"}
        user.is_verified = True
        user.verification_token = None
        repo.commit()
        return {"message": "verified"}

    def resend_verification(self, email: str, background_tasks: BackgroundTasks) -> dict:
        repo = UserRepository(self.db)
        user = repo.find_by_email(email)
        if user and not user.is_verified:
            token = secrets.token_urlsafe(32)
            user.verification_token = token
            repo.commit()
            # TODO: enqueue send_verification_email_task
        return {"message": "If that email is registered and unverified, a new link is on its way."}

    # ── Password reset ─────────────────────────────────────────────────────────

    def forgot_password(self, email: str, background_tasks: BackgroundTasks) -> dict:
        repo = UserRepository(self.db)
        user = repo.find_by_email(email)
        if user and user.hashed_password is not None:
            token = secrets.token_urlsafe(32)
            user.reset_password_token = token
            user.reset_password_token_expires_at = (
                datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1)
            )
            repo.commit()
            enqueue(background_tasks, "send_password_reset_email_task", user.email, token)
        return {"message": "If that email is registered, a reset link is on its way."}

    def change_password(self, user: User, current_password: str, new_password: str) -> dict:
        if not user.hashed_password or not self.verify_password(current_password, user.hashed_password):
            raise api_error("INVALID_CREDENTIALS", "Current password is incorrect", status_code=401)
        if len(new_password) < 8:
            raise api_error("PASSWORD_TOO_SHORT", "Password must be at least 8 characters.", field="new_password")
        if len(new_password) > 128:
            raise api_error("PASSWORD_TOO_LONG", "Password must be at most 128 characters.", field="new_password")

        user.hashed_password = self.hash_password(new_password)
        user.must_change_password = False
        self.db.commit()

        return self._issue_session(user)

    def accept_terms(self, user: User, version: str) -> dict:
        from app.legal import CURRENT_TERMS_VERSION

        if version != CURRENT_TERMS_VERSION:
            raise api_error(
                "TERMS_VERSION_MISMATCH",
                "Los documentos legales se actualizaron. Recarga la página e intenta de nuevo.",
                status_code=409,
            )

        user.accepted_terms_at = datetime.now(timezone.utc)
        user.accepted_terms_version = version
        self.db.commit()
        return {"accepted_terms_version": version, "must_accept_terms": False}

    def reset_password(self, token: str, new_password: str, background_tasks: BackgroundTasks) -> dict:
        if len(new_password) < 8:
            raise api_error("PASSWORD_TOO_SHORT", "Password must be at least 8 characters.", field="new_password")
        if len(new_password) > 128:
            raise api_error("PASSWORD_TOO_LONG", "Password must be at most 128 characters.", field="new_password")

        repo = UserRepository(self.db)
        user = repo.find_by_reset_token(token)
        if not user or not user.reset_password_token_expires_at:
            raise api_error("INVALID_RESET_TOKEN", "Invalid or expired reset link.")
        if datetime.now(timezone.utc).replace(tzinfo=None) > user.reset_password_token_expires_at.replace(tzinfo=None):
            raise api_error("INVALID_RESET_TOKEN", "Invalid or expired reset link.")

        user.hashed_password = self.hash_password(new_password)
        user.reset_password_token = None
        user.reset_password_token_expires_at = None
        repo.commit()
        enqueue(background_tasks, "send_password_changed_email_task", user.email)
        return {"message": "Password updated successfully."}

    # ── TOTP / 2FA ─────────────────────────────────────────────────────────────

    def totp_setup(self, user: User) -> dict:
        """Generate a new TOTP secret and store it (not enabled yet). Returns QR URI + secret."""
        from app.utils.crypto import encrypt_value
        from app.utils.totp import generate_totp_secret, get_totp_uri

        secret = generate_totp_secret()
        user.totp_secret = encrypt_value(secret)
        self.db.commit()

        return {"qr_uri": get_totp_uri(secret, user.email), "secret": secret}

    def totp_confirm(self, user: User, code: str) -> dict:
        """Verify TOTP code and enable 2FA. Returns one-time backup codes."""
        import json
        from app.utils.crypto import decrypt_value
        from app.utils.totp import generate_backup_codes, verify_totp_code

        if not user.totp_secret:
            raise api_error("TOTP_NOT_SETUP", "Run /totp/setup first", status_code=400)

        secret = decrypt_value(user.totp_secret)
        if not verify_totp_code(secret, code):
            raise api_error("INVALID_TOTP_CODE", "Invalid or expired code", status_code=400)

        plaintext_codes, hashed_codes = generate_backup_codes()
        user.totp_enabled = True
        user.totp_backup_codes = json.dumps(hashed_codes)
        self.db.commit()

        return {"backup_codes": plaintext_codes}

    def totp_disable(self, user: User, code: str) -> dict:
        """Verify TOTP code (or backup code) and disable 2FA."""
        import json
        from app.utils.crypto import decrypt_value
        from app.utils.totp import verify_backup_code, verify_totp_code

        if not user.totp_enabled or not user.totp_secret:
            raise api_error("TOTP_NOT_ENABLED", "2FA is not enabled", status_code=400)

        secret = decrypt_value(user.totp_secret)
        valid = verify_totp_code(secret, code)

        if not valid and user.totp_backup_codes:
            valid, remaining = verify_backup_code(code, user.totp_backup_codes)
            if valid:
                user.totp_backup_codes = json.dumps(remaining)

        if not valid:
            raise api_error("INVALID_TOTP_CODE", "Invalid or expired code", status_code=400)

        user.totp_enabled = False
        user.totp_secret = None
        user.totp_backup_codes = None
        self.db.commit()

        return {"message": "2FA disabled"}

    def totp_challenge(self, partial_token: str, code: str) -> dict:
        """Verify partial token + TOTP code during login. Returns full access token."""
        import json
        from app.utils.crypto import decrypt_value
        from app.utils.totp import verify_backup_code, verify_totp_code

        try:
            payload = jwt.decode(partial_token, settings.secret_key, algorithms=[settings.algorithm])
        except jwt.PyJWTError:
            raise api_error("INVALID_TOKEN", "Invalid or expired token", status_code=401)

        if payload.get("scope") != "totp_pending":
            raise api_error("INVALID_TOKEN", "Invalid token scope", status_code=401)

        jti: str | None = payload.get("jti")
        exp: int | None = payload.get("exp")
        if not jti:
            raise api_error("INVALID_TOKEN", "Invalid token", status_code=401)

        # Prevent replay: reject already-used partial tokens
        denylist_repo = TokenDenylistRepository(self.db)
        if denylist_repo.is_denied(jti):
            raise api_error("INVALID_TOKEN", "Token already used", status_code=401)

        user_id = payload.get("sub")
        from uuid import UUID
        user = UserRepository(self.db).find_by_id(UUID(user_id))
        if not user or not user.totp_enabled or not user.totp_secret:
            raise api_error("INVALID_TOKEN", "Invalid token", status_code=401)

        secret = decrypt_value(user.totp_secret)
        valid = verify_totp_code(secret, code)

        if not valid and user.totp_backup_codes:
            valid, remaining = verify_backup_code(code, user.totp_backup_codes)
            if valid:
                user.totp_backup_codes = json.dumps(remaining)
                self.db.commit()

        if not valid:
            raise api_error("INVALID_TOTP_CODE", "Invalid or expired code", status_code=400)

        # Consume the partial token so it cannot be replayed
        if exp:
            expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
            denylist_repo.save(TokenDenylist(jti=jti, expires_at=expires_at))
            self.db.flush()

        return self._issue_session(user)
