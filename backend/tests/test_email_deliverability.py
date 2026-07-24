"""Tests for email deliverability (fallos) + admin notice.

Mock-based, matching the repo's style: repositories are patched so we assert
business logic without a live DB.
"""
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.services.email_failure_service import (
    EmailFailureService,
    _parse_dt,
    _tag_value,
)

_EFS = "app.services.email_failure_service"
_CAS = "app.services.center_application_service"


# ── Helpers ───────────────────────────────────────────────────────────────────

def test_tag_value_list_form():
    tags = [{"name": "email_type", "value": "invitation"}, {"name": "x", "value": "y"}]
    assert _tag_value(tags, "email_type") == "invitation"
    assert _tag_value(tags, "missing") is None


def test_tag_value_dict_form():
    assert _tag_value({"email_type": "invitation"}, "email_type") == "invitation"
    assert _tag_value(None, "email_type") is None


def test_parse_dt_handles_z_suffix():
    assert _parse_dt("2026-07-24T00:00:00.000Z") is not None
    assert _parse_dt("garbage") is None
    assert _parse_dt(None) is None


# ── record_event ──────────────────────────────────────────────────────────────

class TestRecordEvent:
    def _data(self, **kw):
        base = dict(
            email_id="re_123",
            to=["x@mail.com"],
            tags=[{"name": "email_type", "value": "invitation"}],
            bounce={"message": "mailbox full"},
            created_at="2026-07-24T00:00:00.000Z",
        )
        base.update(kw)
        return base

    def test_bounced_saves_failure_with_tags(self):
        with patch(f"{_EFS}.EmailFailureRepository") as Repo:
            repo = Repo.return_value
            repo.get_by_svix_id.return_value = None
            EmailFailureService(MagicMock()).record_event("email.bounced", "svix_1", self._data())
            repo.save.assert_called_once()
            saved = repo.save.call_args.args[0]
            assert saved.event_type == "bounced"
            assert saved.email_type == "invitation"
            assert saved.to_email == "x@mail.com"
            assert saved.svix_id == "svix_1"
            assert saved.reason == "mailbox full"

    def test_delivered_resolves_and_does_not_save(self):
        with patch(f"{_EFS}.EmailFailureRepository") as Repo:
            repo = Repo.return_value
            EmailFailureService(MagicMock()).record_event(
                "email.delivered", "svix_2", {"email_id": "re_9"}
            )
            repo.mark_resolved.assert_called_once()
            repo.save.assert_not_called()

    def test_duplicate_svix_id_no_save(self):
        with patch(f"{_EFS}.EmailFailureRepository") as Repo:
            repo = Repo.return_value
            repo.get_by_svix_id.return_value = object()  # already recorded
            EmailFailureService(MagicMock()).record_event("email.bounced", "svix_1", self._data())
            repo.save.assert_not_called()

    def test_unknown_event_ignored(self):
        with patch(f"{_EFS}.EmailFailureRepository") as Repo:
            repo = Repo.return_value
            EmailFailureService(MagicMock()).record_event("email.opened", "svix_x", {"email_id": "re"})
            repo.save.assert_not_called()
            repo.mark_resolved.assert_not_called()


# ── resend ────────────────────────────────────────────────────────────────────

class TestResend:
    def test_not_resendable_raises(self):
        with patch(f"{_EFS}.EmailFailureRepository") as Repo:
            Repo.return_value.get.return_value = MagicMock(
                email_type="message_private", resolved_at=None
            )
            with pytest.raises(HTTPException):
                EmailFailureService(MagicMock()).resend(uuid4(), MagicMock())

    def test_invitation_regenerates_password_and_enqueues(self):
        with patch(f"{_EFS}.EmailFailureRepository") as Repo, \
             patch(f"{_EFS}.UserRepository") as UserRepo, \
             patch(f"{_EFS}.enqueue") as enq, \
             patch(f"{_EFS}.AuthService") as Auth:
            Repo.return_value.get.return_value = MagicMock(
                email_type="invitation", to_email="x@mail.com", resolved_at=None
            )
            user = MagicMock(email="x@mail.com", username="x")
            UserRepo.return_value.find_by_email.return_value = user
            Auth.hash_password.return_value = "hashed"

            failure = EmailFailureService(MagicMock()).resend(uuid4(), MagicMock())

            enq.assert_called_once()
            assert enq.call_args.args[1] == "send_invitation_email_task"
            assert user.must_change_password is True
            assert failure.resolved_at is not None

    def test_confirmation_delegates_to_center_application_service(self):
        with patch(f"{_EFS}.EmailFailureRepository") as Repo, \
             patch(f"{_CAS}.CenterApplicationService") as CAS:
            Repo.return_value.get.return_value = MagicMock(
                email_type="center_application_confirm", to_email="x@mail.com", resolved_at=None
            )
            EmailFailureService(MagicMock()).resend(uuid4(), MagicMock())
            CAS.return_value.resend_confirmation_by_email.assert_called_once()


# ── recipients + admin notice ──────────────────────────────────────────────────

def test_find_review_recipients_prefers_national_admins():
    from app.repositories.user_repository import UserRepository

    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = [("na@mail.com",)]
    assert UserRepository(db).find_review_recipients("MX") == ["na@mail.com"]


def test_find_review_recipients_falls_back_to_superadmins():
    from app.repositories.user_repository import UserRepository

    db = MagicMock()
    # first query (national_admins) empty → falls back to superadmins
    db.query.return_value.filter.return_value.all.side_effect = [[], [("super@mail.com",)]]
    assert UserRepository(db).find_review_recipients("MX") == ["super@mail.com"]


def test_confirm_email_enqueues_admin_notice():
    from app.services.center_application_service import CenterApplicationService

    with patch(f"{_CAS}.CenterApplicationRepository") as Repo, \
         patch(f"{_CAS}.AuditRepository"), \
         patch(f"{_CAS}.enqueue") as enq:
        Repo.return_value.find_by_token_hash.return_value = MagicMock(
            status="PENDING_EMAIL", id=uuid4(), contact_email="x@mail.com", center_name="Centro"
        )
        CenterApplicationService(MagicMock()).confirm_email("tok", MagicMock())
        task_names = [c.args[1] for c in enq.call_args_list]
        assert "send_center_application_admin_notice_task" in task_names
