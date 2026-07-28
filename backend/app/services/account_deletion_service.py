"""Self-service account deletion (ARCO cancellation right, LFPDPPP).

The account is **anonymized**, not deleted in cascade. `audit_log` and the
`*_event` tables record who sealed each box, closed each pallet and dispatched
each shipment; that attribution is what makes a manifest valid at customs. So
the user row survives as an opaque identifier while every personal field is
destroyed.
"""

import logging
import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.center import Center
from app.models.user import User
from app.models.user_campaign import UserCampaign
from app.services.base import BaseService
from app.utils.errors import api_error

logger = logging.getLogger(__name__)

# RFC 2606 reserves .invalid, so a tombstone address can never be delivered.
_TOMBSTONE_EMAIL_DOMAIN = "araguaney.invalid"


class AccountDeletionService(BaseService):

    def delete_own_account(self, user: User, password: str) -> None:
        """Verify the password, check continuity safeguards, then anonymize.

        Raises before touching anything when a safeguard applies, so a blocked
        request leaves the account exactly as it was.
        """
        from app.services.auth_service import AuthService

        if not user.hashed_password or not AuthService.verify_password(
            password, user.hashed_password
        ):
            raise api_error(
                "INVALID_CREDENTIALS",
                "La contraseña no es correcta",
                field="password",
                status_code=401,
            )

        self._assert_continuity(user)
        self._anonymize(user)

    # ── Continuity safeguards ──────────────────────────────────────────────────

    def _assert_continuity(self, user: User) -> None:
        """Block deletion when it would leave the system without an operator.

        Each message names the action required, not just the impediment.
        """
        if user.center_role == "coordinator" and user.center_id:
            center = self.db.query(Center).filter(Center.id == user.center_id).first()
            if center is not None and center.is_active:
                others = self._count_active_peers(
                    center_role="coordinator", exclude_id=user.id, center_id=user.center_id
                )
                if others == 0:
                    raise api_error(
                        "SOLE_COORDINATOR",
                        "Eres la única coordinación activa de este centro. "
                        "Asigna otra coordinación antes de eliminar tu cuenta.",
                        status_code=409,
                    )

        if user.center_role == "national_admin":
            if self._count_active_peers(center_role="national_admin", exclude_id=user.id) == 0:
                raise api_error(
                    "LAST_NATIONAL_ADMIN",
                    "Eres la única administración nacional activa. "
                    "Designa a otra persona antes de eliminar tu cuenta.",
                    status_code=409,
                )

        if user.role == "superadmin":
            others = (
                self.db.query(func.count(User.id))
                .filter(
                    User.role == "superadmin",
                    User.is_active.is_(True),
                    User.id != user.id,
                )
                .scalar()
            )
            if not others:
                raise api_error(
                    "LAST_SUPERADMIN",
                    "Eres la única superadministración activa de la plataforma. "
                    "Designa a otra persona antes de eliminar tu cuenta.",
                    status_code=409,
                )

    def _count_active_peers(
        self,
        *,
        center_role: str,
        exclude_id: uuid.UUID,
        center_id: uuid.UUID | None = None,
    ) -> int:
        stmt = self.db.query(func.count(User.id)).filter(
            User.center_role == center_role,
            User.is_active.is_(True),
            User.id != exclude_id,
        )
        if center_id is not None:
            stmt = stmt.filter(User.center_id == center_id)
        return stmt.scalar() or 0

    # ── Anonymization ──────────────────────────────────────────────────────────

    def _anonymize(self, user: User) -> None:
        suffix = uuid.uuid4().hex[:8]

        # email and username are unique, hence the random suffix.
        user.email = f"eliminado-{suffix}@{_TOMBSTONE_EMAIL_DOMAIN}"
        user.username = f"usuario-eliminado-{suffix}"
        user.full_name = None
        user.country_code = None
        user.hashed_password = None
        user.registered_provider = None
        user.verification_token = None
        user.reset_password_token = None
        user.reset_password_token_expires_at = None
        user.totp_secret = None
        user.totp_enabled = False
        user.center_id = None
        user.center_role = None
        user.is_active = False

        self._destroy_avatar(user)
        user.avatar_url = None

        # Campaign memberships carry no traceability, only a personal relation.
        self.db.query(UserCampaign).filter(UserCampaign.user_id == user.id).delete(
            synchronize_session=False
        )

    def _destroy_avatar(self, user: User) -> None:
        """Remove the profile photo from Cloudinary. Never blocks the deletion."""
        if not user.avatar_url:
            return
        try:
            import cloudinary
            import cloudinary.uploader

            from app.config import settings

            if not settings.cloudinary_cloud_name:
                return
            cloudinary.config(
                cloud_name=settings.cloudinary_cloud_name,
                api_key=settings.cloudinary_api_key,
                api_secret=settings.cloudinary_api_secret,
                secure=True,
            )
            cloudinary.uploader.destroy(str(user.id), invalidate=True)
        except Exception as e:  # noqa: BLE001 - the local reference is dropped anyway
            logger.error("Cloudinary avatar destroy failed for user %s: %s", user.id, e)
