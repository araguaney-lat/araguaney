"""Tests for center self-registration (Fase 14) — schema + service logic.

Mock-based, matching the repo's style: the service's repositories are patched so
we assert business logic (dedup, double opt-in, quarantine-on-approve, scoping)
without a live DB.
"""
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.schemas.center_application import CenterApplicationCreate
from app.services.center_application_service import (
    CenterApplicationService,
    _hash_token,
    _username_from_email,
)

_SVC = "app.services.center_application_service"


# ── Schema validation ─────────────────────────────────────────────────────────

def _valid_payload(**kw):
    base = dict(
        center_name="Centro de Acopio Uno",
        country_code="MX",
        contact_name="Ana Pérez",
        contact_email="Ana@Mail.com",
    )
    base.update(kw)
    return base


class TestSchema:
    def test_email_is_normalized_lowercase(self):
        c = CenterApplicationCreate(**_valid_payload(contact_email="  ANA@Mail.COM "))
        assert c.contact_email == "ana@mail.com"

    def test_invalid_email_rejected(self):
        with pytest.raises(ValueError):
            CenterApplicationCreate(**_valid_payload(contact_email="not-an-email"))

    def test_country_code_must_be_alpha2_upper(self):
        with pytest.raises(ValueError):
            CenterApplicationCreate(**_valid_payload(country_code="mx"))

    def test_social_url_must_be_https(self):
        with pytest.raises(ValueError):
            CenterApplicationCreate(**_valid_payload(social_url="http://insecure.example"))
        ok = CenterApplicationCreate(**_valid_payload(social_url="https://fb.com/centro"))
        assert ok.social_url == "https://fb.com/centro"

    def test_center_name_min_length(self):
        with pytest.raises(ValueError):
            CenterApplicationCreate(**_valid_payload(center_name="X"))


# ── Helpers ───────────────────────────────────────────────────────────────────

def test_hash_token_is_deterministic_and_not_raw():
    h = _hash_token("secret-token")
    assert h == _hash_token("secret-token")
    assert h != "secret-token" and len(h) == 64


def test_username_from_email():
    assert _username_from_email("ana.perez@mail.com") == "anaperez"
    assert _username_from_email("@@@@@@@@@@@@@@") == "coord"
    # truncated to 20 chars
    assert len(_username_from_email("a" * 40 + "@mail.com")) == 20


# ── submit ────────────────────────────────────────────────────────────────────

class TestSubmit:
    def _service(self):
        return CenterApplicationService(MagicMock())

    @patch(f"{_SVC}.enqueue")
    @patch(f"{_SVC}.AuditRepository")
    @patch(f"{_SVC}.UserRepository")
    @patch(f"{_SVC}.CenterApplicationRepository")
    def test_submit_creates_pending_email_and_sends_confirm(self, Repo, UserRepo, Audit, enqueue):
        repo = Repo.return_value
        repo.has_open_duplicate.return_value = False
        repo.save.side_effect = lambda app: app
        UserRepo.return_value.email_exists.return_value = False
        bt = MagicMock()

        data = CenterApplicationCreate(**_valid_payload())
        app = self._service().submit(data, bt)

        assert app.status == "PENDING_EMAIL"
        assert app.email_verify_token_hash and app.email_verified_at is None
        # confirm email enqueued to the applicant with a RAW token (not the hash)
        task, to, token = enqueue.call_args.args[1], enqueue.call_args.args[2], enqueue.call_args.args[3]
        assert task == "send_center_application_confirm_email_task"
        assert to == "ana@mail.com"
        assert _hash_token(token) == app.email_verify_token_hash

    @patch(f"{_SVC}.enqueue")
    @patch(f"{_SVC}.UserRepository")
    @patch(f"{_SVC}.CenterApplicationRepository")
    def test_submit_blocks_duplicate(self, Repo, UserRepo, enqueue):
        UserRepo.return_value.email_exists.return_value = False
        Repo.return_value.has_open_duplicate.return_value = True
        with pytest.raises(HTTPException) as exc:
            self._service().submit(CenterApplicationCreate(**_valid_payload()), MagicMock())
        assert exc.value.detail["code"] == "DUPLICATE_APPLICATION"
        enqueue.assert_not_called()

    @patch(f"{_SVC}.enqueue")
    @patch(f"{_SVC}.UserRepository")
    @patch(f"{_SVC}.CenterApplicationRepository")
    def test_submit_blocks_existing_user(self, Repo, UserRepo, enqueue):
        UserRepo.return_value.email_exists.return_value = True
        with pytest.raises(HTTPException) as exc:
            self._service().submit(CenterApplicationCreate(**_valid_payload()), MagicMock())
        assert exc.value.detail["code"] == "ALREADY_REGISTERED"
        enqueue.assert_not_called()


# ── confirm_email (double opt-in) ─────────────────────────────────────────────

class TestConfirmEmail:
    def _app(self, status="PENDING_EMAIL"):
        a = MagicMock()
        a.status = status
        a.email_verified_at = None
        a.email_verify_token_hash = _hash_token("tok")
        a.contact_email = "ana@mail.com"
        a.center_name = "Centro Uno"
        return a

    @patch(f"{_SVC}.enqueue")
    @patch(f"{_SVC}.AuditRepository")
    @patch(f"{_SVC}.CenterApplicationRepository")
    def test_valid_token_moves_to_review(self, Repo, Audit, enqueue):
        app = self._app()
        Repo.return_value.find_by_token_hash.return_value = app
        CenterApplicationService(MagicMock()).confirm_email("tok", MagicMock())
        assert app.status == "PENDING_REVIEW"
        assert app.email_verified_at is not None
        assert app.email_verify_token_hash is None  # single-use
        assert enqueue.call_args.args[1] == "send_center_application_received_email_task"

    @patch(f"{_SVC}.CenterApplicationRepository")
    def test_invalid_token_rejected(self, Repo):
        Repo.return_value.find_by_token_hash.return_value = None
        with pytest.raises(HTTPException) as exc:
            CenterApplicationService(MagicMock()).confirm_email("bad", MagicMock())
        assert exc.value.detail["code"] == "INVALID_TOKEN"

    @patch(f"{_SVC}.enqueue")
    @patch(f"{_SVC}.CenterApplicationRepository")
    def test_already_confirmed_is_idempotent(self, Repo, enqueue):
        app = self._app(status="PENDING_REVIEW")
        Repo.return_value.find_by_token_hash.return_value = app
        CenterApplicationService(MagicMock()).confirm_email("tok", MagicMock())
        assert app.status == "PENDING_REVIEW"
        enqueue.assert_not_called()


# ── approve (quarantine lifts: center created here) ───────────────────────────

class TestApprove:
    def _reviewer(self, role="superadmin", country=None):
        r = MagicMock()
        r.id = uuid4()
        r.role = role
        r.country_code = country
        return r

    def _app(self, status="PENDING_REVIEW", country="MX"):
        a = MagicMock()
        a.id = uuid4()
        a.status = status
        a.country_code = country
        a.contact_email = "ana@mail.com"
        a.contact_name = "Ana Pérez"
        a.center_name = "Centro Uno"
        a.address = None
        a.contact_phone = None
        a.state_name = None
        return a

    @patch(f"{_SVC}.enqueue")
    @patch(f"{_SVC}.AuditRepository")
    @patch(f"{_SVC}.UserCampaignRepository")
    @patch(f"{_SVC}.CampaignRepository")
    @patch(f"{_SVC}.AuthService")
    @patch(f"{_SVC}.UserRepository")
    @patch(f"{_SVC}.CenterRepository")
    @patch(f"{_SVC}.CenterApplicationRepository")
    def test_approve_creates_center_and_invites_coordinator(
        self, AppRepo, CenterRepo, UserRepo, Auth, Camp, UserCamp, Audit, enqueue
    ):
        app = self._app()
        AppRepo.return_value.find_by_id.return_value = app
        UserRepo.return_value.email_exists.return_value = False
        UserRepo.return_value.username_exists.return_value = False
        center = MagicMock(); center.id = uuid4()
        CenterRepo.return_value.save.return_value = center
        created_user = MagicMock(); created_user.id = uuid4()
        created_user.email = "ana@mail.com"; created_user.username = "ana"
        UserRepo.return_value.save.return_value = created_user
        Camp.return_value.find_general.return_value = None
        Auth.hash_password.return_value = "hashed"

        reviewer = self._reviewer()
        CenterApplicationService(MagicMock()).approve(app.id, reviewer, None, MagicMock())

        # Center created (quarantine lifts only now)
        CenterRepo.return_value.save.assert_called_once()
        created_center = CenterRepo.return_value.save.call_args.args[0]
        assert created_center.name == "Centro Uno"
        # Coordinator user created with forced password change
        new_user = UserRepo.return_value.save.call_args.args[0]
        assert new_user.center_role == "coordinator"
        assert new_user.must_change_password is True
        assert new_user.center_id == center.id
        # Application closed + linked
        assert app.status == "APPROVED"
        assert app.created_center_id == center.id
        # Invitation email enqueued
        assert enqueue.call_args.args[1] == "send_invitation_email_task"

    @patch(f"{_SVC}.UserRepository")
    @patch(f"{_SVC}.CenterApplicationRepository")
    def test_approve_blocks_when_email_taken(self, AppRepo, UserRepo):
        AppRepo.return_value.find_by_id.return_value = self._app()
        UserRepo.return_value.email_exists.return_value = True
        with pytest.raises(HTTPException) as exc:
            CenterApplicationService(MagicMock()).approve(uuid4(), self._reviewer(), None, MagicMock())
        assert exc.value.detail["code"] == "EMAIL_TAKEN"

    @patch(f"{_SVC}.CenterApplicationRepository")
    def test_national_admin_cannot_approve_other_country(self, AppRepo):
        AppRepo.return_value.find_by_id.return_value = self._app(country="MX")
        # national_admin scoped to VE
        with pytest.raises(HTTPException) as exc:
            CenterApplicationService(MagicMock()).approve(uuid4(), self._reviewer("user", "VE"), "VE", MagicMock())
        assert exc.value.status_code == 403

    @patch(f"{_SVC}.CenterApplicationRepository")
    def test_cannot_approve_non_pending(self, AppRepo):
        AppRepo.return_value.find_by_id.return_value = self._app(status="APPROVED")
        with pytest.raises(HTTPException) as exc:
            CenterApplicationService(MagicMock()).approve(uuid4(), self._reviewer(), None, MagicMock())
        assert exc.value.status_code == 409

    @patch(f"{_SVC}.CenterApplicationRepository")
    def test_approve_not_found(self, AppRepo):
        AppRepo.return_value.find_by_id.return_value = None
        with pytest.raises(HTTPException) as exc:
            CenterApplicationService(MagicMock()).approve(uuid4(), self._reviewer(), None, MagicMock())
        assert exc.value.status_code == 404


# ── reject ────────────────────────────────────────────────────────────────────

class TestReject:
    @patch(f"{_SVC}.enqueue")
    @patch(f"{_SVC}.AuditRepository")
    @patch(f"{_SVC}.CenterApplicationRepository")
    def test_reject_sets_reason_and_notifies(self, AppRepo, Audit, enqueue):
        app = MagicMock(); app.status = "PENDING_REVIEW"; app.country_code = "MX"
        app.contact_email = "ana@mail.com"; app.center_name = "Centro Uno"
        AppRepo.return_value.find_by_id.return_value = app
        reviewer = MagicMock(); reviewer.id = uuid4(); reviewer.role = "superadmin"

        CenterApplicationService(MagicMock()).reject(uuid4(), reviewer, "Datos insuficientes", None, MagicMock())

        assert app.status == "REJECTED"
        assert app.reject_reason == "Datos insuficientes"
        assert enqueue.call_args.args[1] == "send_center_application_rejected_email_task"


# ── unique username ───────────────────────────────────────────────────────────

def test_unique_username_dedupes():
    user_repo = MagicMock()
    user_repo.username_exists.side_effect = [True, True, False]
    assert CenterApplicationService._unique_username(user_repo, "ana") == "ana2"
