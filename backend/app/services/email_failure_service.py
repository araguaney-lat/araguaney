import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.arq_pool import enqueue
from app.models.email_failure import EMAIL_FAILURE_EVENTS, EmailFailure
from app.repositories.email_failure_repository import EmailFailureRepository
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.utils.errors import api_error

# email_type values whose bounce is worth re-sending (and how).
_RESENDABLE = {"invitation", "center_application_confirm"}


def _tag_value(tags: object, name: str) -> str | None:
    """Resend may send tags as a list of {name,value} or as a flat object.
    Handle both."""
    if isinstance(tags, dict):
        val = tags.get(name)
        return str(val) if val is not None else None
    if isinstance(tags, list):
        for t in tags:
            if isinstance(t, dict) and t.get("name") == name:
                return t.get("value")
    return None


def _parse_dt(value: object) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


class EmailFailureService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = EmailFailureRepository(db)

    def record_event(self, event_type_full: str, svix_id: str, data: dict) -> None:
        """Process one Resend webhook event. Idempotent by svix_id."""
        # "email.bounced" -> "bounced"
        event = event_type_full.split(".", 1)[-1]

        if event == "delivered":
            email_id = str(data.get("email_id", ""))
            if email_id:
                self.repo.mark_resolved(email_id, datetime.now(timezone.utc))
            return

        if event not in EMAIL_FAILURE_EVENTS:
            return  # opened/clicked/sent/etc. — nothing to store

        if self.repo.get_by_svix_id(svix_id):
            return  # duplicate delivery

        to = data.get("to")
        to_email = (to[0] if isinstance(to, list) and to else to) or ""
        tags = data.get("tags")
        bounce = data.get("bounce") or {}
        reason = bounce.get("message") if isinstance(bounce, dict) else None

        entity_id_raw = _tag_value(tags, "entity_id")
        try:
            entity_id = UUID(entity_id_raw) if entity_id_raw else None
        except ValueError:
            entity_id = None

        self.repo.save(
            EmailFailure(
                resend_email_id=str(data.get("email_id", "")),
                to_email=str(to_email),
                email_type=_tag_value(tags, "email_type") or "unknown",
                entity_type=_tag_value(tags, "entity_type"),
                entity_id=entity_id,
                event_type=event,
                reason=reason,
                svix_id=svix_id,
                occurred_at=_parse_dt(data.get("created_at")),
            )
        )

    def resend(self, failure_id: UUID, background_tasks: BackgroundTasks) -> EmailFailure:
        failure = self.repo.get(failure_id)
        if failure is None:
            raise api_error("NOT_FOUND", "Email failure not found", status_code=404)
        if failure.email_type not in _RESENDABLE:
            raise api_error(
                "NOT_RESENDABLE",
                "This email type can't be resent from here",
                field="email_type",
            )

        if failure.email_type == "invitation":
            self._resend_invitation(failure.to_email, background_tasks)
        elif failure.email_type == "center_application_confirm":
            # Local import avoids a circular import at module load.
            from app.services.center_application_service import CenterApplicationService

            CenterApplicationService(self.db).resend_confirmation_by_email(
                failure.to_email, background_tasks
            )

        failure.resolved_at = datetime.now(timezone.utc)
        self.repo.commit()
        return failure

    def _resend_invitation(self, email: str, background_tasks: BackgroundTasks) -> None:
        user_repo = UserRepository(self.db)
        user = user_repo.find_by_email(email)
        if user is None:
            raise api_error("NOT_FOUND", "No user for this email", field="to_email", status_code=404)
        raw_password = secrets.token_urlsafe(12)
        user.hashed_password = AuthService.hash_password(raw_password)
        user.must_change_password = True
        user_repo.commit()
        enqueue(
            background_tasks,
            "send_invitation_email_task",
            user.email,
            user.username,
            raw_password,
        )
