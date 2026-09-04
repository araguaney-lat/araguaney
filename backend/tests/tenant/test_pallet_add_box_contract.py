"""Task 20 (roadmap Fase 26): `POST /v1/pallets/{id}/add-box` takes a typed body.

Before this, the router read an untyped `dict`, so the generated Dart client
had no model for the request and wrote the `code` key by hand. `PalletAddBoxIn`
(StrictModel, extra="forbid") gives it one, and rejects a stray field instead
of silently ignoring it.
"""


def test_add_box_accepts_a_typed_body(client, world):
    res = client.post(
        f"/v1/pallets/{world.b['pallet'].id}/add-box",
        json={"code": world.b["box"].code},
        headers=world.token(world.coordinator_b),
    )
    assert res.status_code == 200
    codes = {b["code"] for b in res.json()["boxes"]}
    assert world.b["box"].code in codes


def test_add_box_rejects_unknown_fields(client, world):
    res = client.post(
        f"/v1/pallets/{world.b['pallet'].id}/add-box",
        json={"code": world.b["box"].code, "box_code": "typo"},
        headers=world.token(world.coordinator_b),
    )
    assert res.status_code == 422


def test_add_box_rejects_empty_code(client, world):
    res = client.post(
        f"/v1/pallets/{world.b['pallet'].id}/add-box",
        json={"code": ""},
        headers=world.token(world.coordinator_b),
    )
    assert res.status_code == 422
