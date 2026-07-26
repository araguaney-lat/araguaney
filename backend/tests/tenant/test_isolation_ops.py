"""Cross-tenant isolation: operations layer (dashboard, reports, requests,
transfers, messaging, exports).

Attacker model: coordinator of center B trying to reach center A's data,
including endpoints that accept a center_id/campaign_id from the client.
"""


class TestDashboard:
    def test_national_dashboard_scopes_to_own_center(self, client, world):
        res = client.get("/v1/dashboard/national",
                         headers=world.token(world.coordinator_b))
        assert res.status_code == 200
        by_center = res.json()["by_center"]
        names = {row["center_name"] for row in by_center}
        assert "Centro A" not in names

    def test_weight_dashboard_ignores_client_center_id(self, client, world):
        # B passes A's center_id as a query param — the scope must override it.
        res = client.get(
            f"/v1/dashboard/weight?center_id={world.center_a.id}",
            headers=world.token(world.coordinator_b),
        )
        assert res.status_code == 200


class TestReports:
    def test_summary_excludes_foreign_center(self, client, world):
        res = client.get(
            f"/v1/reports/campaign/{world.campaign.id}/summary",
            headers=world.token(world.coordinator_b),
        )
        assert res.status_code == 200
        # Seeds: one SEALED box of 10 units per center. B must see only its own.
        assert res.json()["sealed_boxes"] <= 1

    def test_by_center_excludes_foreign_center(self, client, world):
        res = client.get(
            f"/v1/reports/campaign/{world.campaign.id}/by-center",
            headers=world.token(world.coordinator_b),
        )
        assert res.status_code == 200
        names = {row["center_name"] for row in res.json()}
        assert "Centro A" not in names


class TestRequests:
    def test_list_excludes_foreign_requests(self, client, world):
        res = client.get("/v1/requests", headers=world.token(world.coordinator_b))
        assert res.status_code == 200
        ids = {r["id"] for r in res.json()}
        assert str(world.request_a.id) not in ids

    def test_detail_of_foreign_request_denied(self, client, world):
        res = client.get(f"/v1/requests/{world.request_a.id}",
                         headers=world.token(world.coordinator_b))
        assert res.status_code in (403, 404)

    def test_cannot_message_on_foreign_request(self, client, world):
        res = client.post(
            f"/v1/requests/{world.request_a.id}/messages",
            json={"body": "intruso"},
            headers=world.token(world.coordinator_b),
        )
        assert res.status_code in (403, 404)


class TestTransfers:
    def test_list_excludes_unrelated_transfers(self, client, world):
        res = client.get("/v1/transfers", headers=world.token(world.coordinator_b))
        assert res.status_code == 200
        ids = {t["id"] for t in res.json()}
        assert str(world.transfer_a.id) not in ids

    def test_detail_of_unrelated_transfer_denied(self, client, world):
        res = client.get(f"/v1/transfers/{world.transfer_a.id}",
                         headers=world.token(world.coordinator_b))
        assert res.status_code in (403, 404)

    def test_cannot_approve_unrelated_transfer(self, client, world):
        res = client.post(f"/v1/transfers/{world.transfer_a.id}/approve",
                          headers=world.token(world.coordinator_b))
        assert res.status_code in (403, 404)
        world.db.refresh(world.transfer_a)
        assert world.transfer_a.status == "REQUESTED"

    def test_studio_listing_denied_to_coordinator(self, client, world):
        res = client.get("/v1/transfers/studio",
                         headers=world.token(world.coordinator_b))
        assert res.status_code == 403


class TestMessaging:
    def test_private_thread_hidden_from_non_participant(self, client, world):
        res = client.get(f"/v1/messages/{world.thread_a.id}",
                         headers=world.token(world.coordinator_b))
        assert res.status_code in (403, 404)

    def test_cannot_reply_to_foreign_private_thread(self, client, world):
        res = client.post(
            f"/v1/messages/{world.thread_a.id}/replies",
            json={"body": "intruso"},
            headers=world.token(world.coordinator_b),
        )
        assert res.status_code in (403, 404)

    def test_thread_list_excludes_foreign_private_threads(self, client, world):
        res = client.get("/v1/messages", headers=world.token(world.coordinator_b))
        assert res.status_code == 200
        ids = {t["id"] for t in res.json()}
        assert str(world.thread_a.id) not in ids


class TestExports:
    def test_foreign_export_job_denied(self, client, world):
        res = client.get(f"/v1/exports/{world.export_a.id}",
                         headers=world.token(world.coordinator_b))
        assert res.status_code in (403, 404)

    def test_owner_can_read_own_export_job(self, client, world):
        res = client.get(f"/v1/exports/{world.export_a.id}",
                         headers=world.token(world.coordinator_a))
        assert res.status_code == 200
