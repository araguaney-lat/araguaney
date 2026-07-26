"""Cross-tenant isolation: inventory chain (boxes, intakes, pallets, shipments).

Attacker model: coordinator of center B, authenticated, trying to read or
mutate center A's resources by id. Expected: 404 (scoped lookup misses) or
403 — never 200 with A's data. national_admin must keep seeing everything.
"""


class TestBoxes:
    def test_list_only_own_center(self, client, world):
        res = client.get("/v1/boxes", headers=world.token(world.coordinator_b))
        assert res.status_code == 200
        codes = {b["code"] for b in res.json()}
        assert codes == {"BX-BBBBB1", "BX-BBBBB1D"}

    def test_detail_of_foreign_box_is_404(self, client, world):
        res = client.get(f"/v1/boxes/{world.a['box'].id}",
                         headers=world.token(world.coordinator_b))
        assert res.status_code == 404

    def test_seal_foreign_draft_box_is_404(self, client, world):
        res = client.post(f"/v1/boxes/{world.a['draft'].id}/seal",
                          headers=world.token(world.coordinator_b))
        assert res.status_code == 404
        world.db.refresh(world.a["draft"])
        assert world.a["draft"].status == "DRAFT"

    def test_events_of_foreign_box_are_hidden(self, client, world):
        res = client.get(f"/v1/boxes/{world.a['box'].id}/events",
                         headers=world.token(world.coordinator_b))
        assert res.status_code in (403, 404)

    def test_admin_sees_both_centers(self, client, world):
        res = client.get("/v1/boxes", headers=world.token(world.admin))
        assert res.status_code == 200
        codes = {b["code"] for b in res.json()}
        assert {"BX-AAAAA1", "BX-BBBBB1"} <= codes


class TestIntakes:
    def test_list_only_own_center(self, client, world):
        res = client.get("/v1/intakes", headers=world.token(world.coordinator_b))
        assert res.status_code == 200
        ids = {i["id"] for i in res.json()}
        assert str(world.a["intake"].id) not in ids
        assert str(world.b["intake"].id) in ids


class TestPallets:
    def test_list_only_own_center(self, client, world):
        res = client.get("/v1/pallets", headers=world.token(world.coordinator_b))
        assert res.status_code == 200
        codes = {p["code"] for p in res.json()}
        assert codes == {"TM-BBBBB1"}

    def test_detail_of_foreign_pallet_is_404(self, client, world):
        res = client.get(f"/v1/pallets/{world.a['pallet'].id}",
                         headers=world.token(world.coordinator_b))
        assert res.status_code == 404

    def test_cannot_add_foreign_box_to_own_pallet(self, client, world):
        res = client.post(
            f"/v1/pallets/{world.b['pallet'].id}/add-box",
            json={"box_code": world.a["box"].code},
            headers=world.token(world.coordinator_b),
        )
        assert res.status_code in (400, 403, 404, 409, 422)
        world.db.refresh(world.a["box"])
        assert world.a["box"].pallet_id is None

    def test_cannot_close_foreign_pallet(self, client, world):
        res = client.post(f"/v1/pallets/{world.a['pallet'].id}/close",
                          headers=world.token(world.coordinator_b))
        assert res.status_code in (403, 404)
        world.db.refresh(world.a["pallet"])
        assert world.a["pallet"].status == "OPEN"


class TestShipments:
    def test_list_only_own_center(self, client, world):
        res = client.get("/v1/shipments", headers=world.token(world.coordinator_b))
        assert res.status_code == 200
        codes = {s["reference"] for s in res.json()}
        assert codes == {"EN-BBBBB1"}

    def test_detail_of_foreign_shipment_is_404(self, client, world):
        res = client.get(f"/v1/shipments/{world.a['shipment'].id}",
                         headers=world.token(world.coordinator_b))
        assert res.status_code == 404

    def test_cannot_close_foreign_shipment(self, client, world):
        res = client.post(f"/v1/shipments/{world.a['shipment'].id}/close",
                          headers=world.token(world.coordinator_b))
        assert res.status_code in (403, 404)
        world.db.refresh(world.a["shipment"])
        assert world.a["shipment"].status == "OPEN"

    def test_admin_sees_both_centers(self, client, world):
        res = client.get("/v1/shipments", headers=world.token(world.admin))
        assert res.status_code == 200
        codes = {s["reference"] for s in res.json()}
        assert {"EN-AAAAA1", "EN-BBBBB1"} <= codes
