"""Self-service account deletion (ARCO cancellation).

Runs against the real app over the in-memory database from conftest. The
contract under test: personal fields are destroyed, the row survives so audit
events stay attributable, and deletion is blocked when it would leave the
system without an operator.
"""

import uuid

from app.models.audit_log import AuditLog
from app.models.user import User
from app.models.user_campaign import UserCampaign
from app.services.auth_service import AuthService

_PASSWORD = "Sup3rSecret!"


def _with_password(world, user: User) -> User:
    user.hashed_password = AuthService.hash_password(_PASSWORD)
    world.db.commit()
    return user


def _delete(client, world, user: User, password: str = _PASSWORD):
    return client.request(
        "DELETE",
        "/v1/auth/me",
        json={"password": password},
        headers=world.token(user),
    )


class TestAnonymization:
    def test_destroys_personal_fields_but_keeps_the_id(self, client, world):
        user = _with_password(world, world.coordinator_b)
        # Give the volunteer-level peer so continuity does not block.
        world.db.add(
            User(
                email="peer-b@test.local", username="peer-b", hashed_password="x",
                is_active=True, is_verified=True, role="user",
                center_id=world.center_b.id, center_role="coordinator",
            )
        )
        world.db.commit()
        original_id = user.id

        res = _delete(client, world, user)
        assert res.status_code == 204

        world.db.refresh(user)
        assert user.id == original_id, "el id ancla la trazabilidad y no debe cambiar"
        assert user.email.endswith("@araguaney.invalid")
        assert user.username.startswith("usuario-eliminado-")
        assert user.full_name is None
        assert user.avatar_url is None
        assert user.hashed_password is None
        assert user.totp_secret is None
        assert user.totp_enabled is False
        assert user.center_id is None
        assert user.center_role is None
        assert user.is_active is False

    def test_tombstones_do_not_collide(self, client, world):
        first = _with_password(world, world.coordinator_a)
        second = _with_password(world, world.coordinator_b)
        for center in (world.center_a, world.center_b):
            world.db.add(
                User(
                    email=f"peer-{center.id.hex[:6]}@test.local",
                    username=f"peer-{center.id.hex[:6]}",
                    hashed_password="x", is_active=True, is_verified=True, role="user",
                    center_id=center.id, center_role="coordinator",
                )
            )
        world.db.commit()

        assert _delete(client, world, first).status_code == 204
        assert _delete(client, world, second).status_code == 204

        world.db.refresh(first)
        world.db.refresh(second)
        assert first.email != second.email
        assert first.username != second.username

    def test_removes_campaign_memberships(self, client, world):
        user = _with_password(world, world.coordinator_b)
        world.db.add(
            User(
                email="peer2@test.local", username="peer2", hashed_password="x",
                is_active=True, is_verified=True, role="user",
                center_id=world.center_b.id, center_role="coordinator",
            )
        )
        world.db.commit()
        assert (
            world.db.query(UserCampaign).filter(UserCampaign.user_id == user.id).count() == 1
        )

        assert _delete(client, world, user).status_code == 204
        assert (
            world.db.query(UserCampaign).filter(UserCampaign.user_id == user.id).count() == 0
        )

    def test_writes_an_audit_event(self, client, world):
        user = _with_password(world, world.coordinator_b)
        world.db.add(
            User(
                email="peer3@test.local", username="peer3", hashed_password="x",
                is_active=True, is_verified=True, role="user",
                center_id=world.center_b.id, center_role="coordinator",
            )
        )
        world.db.commit()

        assert _delete(client, world, user).status_code == 204
        events = (
            world.db.query(AuditLog).filter(AuditLog.action == "USER_SELF_DELETED").all()
        )
        assert len(events) == 1
        assert events[0].entity_id == str(user.id)


class TestPasswordConfirmation:
    def test_wrong_password_is_rejected_and_changes_nothing(self, client, world):
        user = _with_password(world, world.coordinator_b)
        email_before = user.email

        res = _delete(client, world, user, password="not-the-password")
        assert res.status_code == 401

        world.db.refresh(user)
        assert user.email == email_before
        assert user.is_active is True


class TestContinuitySafeguards:
    def test_sole_coordinator_of_an_active_center_is_blocked(self, client, world):
        user = _with_password(world, world.coordinator_b)

        res = _delete(client, world, user)
        assert res.status_code == 409
        assert res.json()["error"]["code"] == "SOLE_COORDINATOR"

        world.db.refresh(user)
        assert user.is_active is True
        assert user.center_id == world.center_b.id

    def test_allowed_when_another_active_coordinator_exists(self, client, world):
        user = _with_password(world, world.coordinator_b)
        world.db.add(
            User(
                email="peer4@test.local", username="peer4", hashed_password="x",
                is_active=True, is_verified=True, role="user",
                center_id=world.center_b.id, center_role="coordinator",
            )
        )
        world.db.commit()

        assert _delete(client, world, user).status_code == 204

    def test_inactive_peer_does_not_count_as_replacement(self, client, world):
        user = _with_password(world, world.coordinator_b)
        world.db.add(
            User(
                email="inactive@test.local", username="inactive", hashed_password="x",
                is_active=False, is_verified=True, role="user",
                center_id=world.center_b.id, center_role="coordinator",
            )
        )
        world.db.commit()

        res = _delete(client, world, user)
        assert res.status_code == 409

    def test_last_national_admin_is_blocked(self, client, world):
        admin = _with_password(world, world.admin)

        res = _delete(client, world, admin)
        assert res.status_code == 409
        assert res.json()["error"]["code"] == "LAST_NATIONAL_ADMIN"

        world.db.refresh(admin)
        assert admin.is_active is True

    def test_last_superadmin_is_blocked(self, client, world):
        superadmin = User(
            id=uuid.uuid4(), email="root@test.local", username="root",
            hashed_password=AuthService.hash_password(_PASSWORD),
            is_active=True, is_verified=True, role="superadmin",
        )
        world.db.add(superadmin)
        world.db.commit()

        res = _delete(client, world, superadmin)
        assert res.status_code == 409
        assert res.json()["error"]["code"] == "LAST_SUPERADMIN"


class TestSessionInvalidation:
    def test_deleted_account_cannot_use_its_token_afterwards(self, client, world):
        user = _with_password(world, world.coordinator_b)
        world.db.add(
            User(
                email="peer5@test.local", username="peer5", hashed_password="x",
                is_active=True, is_verified=True, role="user",
                center_id=world.center_b.id, center_role="coordinator",
            )
        )
        world.db.commit()
        headers = world.token(user)

        assert client.request(
            "DELETE", "/v1/auth/me", json={"password": _PASSWORD}, headers=headers
        ).status_code == 204

        # Same token, now belonging to an inactive account.
        assert client.get("/v1/boxes", headers=headers).status_code in (401, 403)
