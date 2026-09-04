import hashlib
import re
import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import BackgroundTasks

from app.arq_pool import enqueue
from app.models.center import Center
from app.models.center_application import CenterApplication
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.campaign_repository import CampaignRepository
from app.repositories.center_application_repository import CenterApplicationRepository
from app.repositories.center_repository import CenterRepository
from app.repositories.user_campaign_repository import UserCampaignRepository
from app.repositories.user_repository import UserRepository
from app.schemas.center_application import CenterApplicationCreate
from app.services.auth_service import AuthService
from app.services.base import BaseService
from app.utils.errors import api_error


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _username_from_email(email: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "", email.split("@")[0].lower())[:20] or "coord"
    return base


class CenterApplicationService(BaseService):

    # ── Public flow ────────────────────────────────────────────────────────────

    def submit(
        self, data: CenterApplicationCreate, background_tasks: BackgroundTasks
    ) -> CenterApplication:
        repo = CenterApplicationRepository(self.db)
        # An existing account can never be approved (approve would hit EMAIL_TAKEN),
        # so stop it at the door instead of letting junk pile up in the queue.
        if UserRepository(self.db).email_exists(data.contact_email):
            raise api_error(
                "ALREADY_REGISTERED",
                "This email already has an account — sign in instead",
                field="contact_email",
            )
        if repo.has_open_duplicate(data.contact_email, data.center_name, data.country_code):
            raise api_error(
                "DUPLICATE_APPLICATION",
                "There is already an open application for this email or center",
                field="contact_email",
            )

        raw_token = secrets.token_urlsafe(32)
        application = CenterApplication(
            center_name=data.center_name.strip(),
            country_code=data.country_code,
            state_name=data.state_name,
            address=data.address,
            contact_name=data.contact_name.strip(),
            contact_email=data.contact_email,  # already normalized by the schema
            contact_phone=data.contact_phone,
            backing_org=data.backing_org,
            social_url=data.social_url,
            message=data.message,
            status="PENDING_EMAIL",
            email_verify_token_hash=_hash_token(raw_token),
        )
        application = repo.save(application)

        AuditRepository(self.db).log(
            "CENTER_APPLICATION_SUBMITTED",
            "center_application",
            entity_id=str(application.id),
            extra={"center_name": application.center_name, "country_code": application.country_code},
        )
        self.db.commit()
        enqueue(
            background_tasks,
            "send_center_application_confirm_email_task",
            application.contact_email,
            raw_token,
        )
        return application

    def confirm_email(
        self, token: str, background_tasks: BackgroundTasks
    ) -> CenterApplication:
        repo = CenterApplicationRepository(self.db)
        application = repo.find_by_token_hash(_hash_token(token))
        if not application:
            raise api_error("INVALID_TOKEN", "Invalid or expired confirmation link", status_code=400)
        if application.status != "PENDING_EMAIL":
            # Already confirmed (or reviewed) — idempotent, don't leak state churn.
            return application

        application.status = "PENDING_REVIEW"
        application.email_verified_at = datetime.now(timezone.utc)
        application.email_verify_token_hash = None  # single-use
        repo.commit()

        AuditRepository(self.db).log(
            "CENTER_APPLICATION_EMAIL_VERIFIED",
            "center_application",
            entity_id=str(application.id),
        )
        self.db.commit()
        enqueue(
            background_tasks,
            "send_center_application_received_email_task",
            application.contact_email,
            application.center_name,
        )
        # Nudge the reviewer(s) so a confirmed application doesn't sit unseen.
        enqueue(
            background_tasks,
            "send_center_application_admin_notice_task",
            str(application.id),
        )
        return application

    def resend_confirmation_by_email(
        self, email: str, background_tasks: BackgroundTasks
    ) -> None:
        """Regenerate the confirmation token and resend the confirm email for a
        still-pending (PENDING_EMAIL) application. Used when the first
        confirmation email bounced."""
        repo = CenterApplicationRepository(self.db)
        application = repo.find_pending_email_by_email(email)
        if application is None:
            raise api_error(
                "NOT_FOUND",
                "No pending-confirmation application for this email",
                status_code=404,
            )
        raw_token = secrets.token_urlsafe(32)
        application.email_verify_token_hash = _hash_token(raw_token)
        repo.commit()
        enqueue(
            background_tasks,
            "send_center_application_confirm_email_task",
            application.contact_email,
            raw_token,
        )

    # ── Review flow ──────────────────────────────────────────────────────────────

    def list_queue(self, country_scope: str | None) -> list[CenterApplication]:
        return CenterApplicationRepository(self.db).list_queue(country_scope)

    def approve(
        self, app_id: UUID, reviewer: User, country_scope: str | None, background_tasks: BackgroundTasks
    ) -> CenterApplication:
        repo = CenterApplicationRepository(self.db)
        application = self._get_reviewable(repo, app_id, country_scope)

        user_repo = UserRepository(self.db)
        if user_repo.email_exists(application.contact_email):
            raise api_error(
                "EMAIL_TAKEN",
                "Ya existe un usuario con este correo — resuélvelo manualmente",
                field="contact_email",
            )

        # 1. Create the center (now it becomes visible in the aggregate).
        center = CenterRepository(self.db).save(Center(
            name=application.center_name,
            address=application.address,
            contact_name=application.contact_name,
            contact_email=application.contact_email,
            contact_phone=application.contact_phone,
            country_code=application.country_code,
            state_name=application.state_name,
        ))

        # 2. Invite the applicant as its coordinator (mirror of invite_user).
        raw_password = secrets.token_urlsafe(16)
        username = self._unique_username(user_repo, _username_from_email(application.contact_email))
        user = user_repo.save(User(
            email=application.contact_email,
            username=username,
            full_name=application.contact_name,
            hashed_password=AuthService.hash_password(raw_password),
            is_verified=True,
            must_change_password=True,
            center_id=center.id,
            center_role="coordinator",
            country_code=application.country_code,
        ))
        general = CampaignRepository(self.db).find_general()
        if general:
            UserCampaignRepository(self.db).assign(user.id, general.id, assigned_by_id=reviewer.id)

        # 3. Close the application.
        application.status = "APPROVED"
        application.reviewed_by = reviewer.id
        application.reviewed_at = datetime.now(timezone.utc)
        application.created_center_id = center.id
        repo.commit()

        AuditRepository(self.db).log(
            "CENTER_APPLICATION_APPROVED",
            "center_application",
            user_id=reviewer.id,
            entity_id=str(application.id),
            extra={"center_id": str(center.id), "coordinator_user_id": str(user.id)},
        )
        self.db.commit()
        enqueue(background_tasks, "send_invitation_email_task", user.email, user.username, raw_password)
        return application

    def reject(
        self, app_id: UUID, reviewer: User, reason: str, country_scope: str | None,
        background_tasks: BackgroundTasks,
    ) -> CenterApplication:
        repo = CenterApplicationRepository(self.db)
        application = self._get_reviewable(repo, app_id, country_scope)

        application.status = "REJECTED"
        application.reviewed_by = reviewer.id
        application.reviewed_at = datetime.now(timezone.utc)
        application.reject_reason = reason
        repo.commit()

        AuditRepository(self.db).log(
            "CENTER_APPLICATION_REJECTED",
            "center_application",
            user_id=reviewer.id,
            entity_id=str(application.id),
            extra={"reason": reason},
        )
        self.db.commit()
        enqueue(
            background_tasks,
            "send_center_application_rejected_email_task",
            application.contact_email,
            application.center_name,
            reason,
        )
        return application

    # ── Helpers ──────────────────────────────────────────────────────────────────

    def _get_reviewable(
        self, repo: CenterApplicationRepository, app_id: UUID, country_scope: str | None
    ) -> CenterApplication:
        application = repo.find_by_id(app_id)
        if not application:
            raise api_error("APPLICATION_NOT_FOUND", "Application not found", status_code=404)
        # national_admin may only act on their own country.
        if country_scope is not None and application.country_code != country_scope:
            raise api_error("FORBIDDEN", "Application is outside your country scope", status_code=403)
        if application.status != "PENDING_REVIEW":
            raise api_error(
                "INVALID_STATE",
                f"Application is {application.status}, not pending review",
                status_code=409,
            )
        return application

    @staticmethod
    def _unique_username(user_repo: UserRepository, base: str) -> str:
        username = base
        i = 1
        while user_repo.username_exists(username):
            username = f"{base}{i}"
            i += 1
        return username
