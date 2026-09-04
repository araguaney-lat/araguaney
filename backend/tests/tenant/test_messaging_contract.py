"""Task 17 (roadmap Fase 26): nine rejections the app shows to a person
share the generic `FORBIDDEN` code with "this isn't yours", so it can't tell
"you're not in this campaign" apart from a real access denial. This file
covers the campaign-thread half: creating or reading a campaign thread
without being a campaign member now raises `NOT_CAMPAIGN_MEMBER`, matching
the code `IntakeService` already uses for the same case.
"""

from app.models.user import User


def _outsider(world):
    user = User(
        email="outsider@test.local", username="outsider", hashed_password="x",
        is_active=True, is_verified=True, role="user",
        center_id=world.center_a.id, center_role="volunteer",
    )
    world.db.add(user)
    world.db.flush()
    return user


def test_creating_a_thread_without_campaign_membership_is_named(client, world):
    outsider = _outsider(world)
    res = client.post(
        "/v1/messages",
        json={"title": "x", "body": "y", "thread_type": "PUBLIC",
              "campaign_id": str(world.campaign.id)},
        headers=world.token(outsider),
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "NOT_CAMPAIGN_MEMBER"


def test_reading_a_campaign_thread_without_membership_is_named(client, world):
    created = client.post(
        "/v1/messages",
        json={"title": "x", "body": "y", "thread_type": "PUBLIC",
              "campaign_id": str(world.campaign.id)},
        headers=world.token(world.coordinator_a),
    )
    thread_id = created.json()["id"]

    outsider = _outsider(world)
    res = client.get(f"/v1/messages/{thread_id}", headers=world.token(outsider))
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "NOT_CAMPAIGN_MEMBER"
