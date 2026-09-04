"""Task 15 (roadmap Fase 26): `by-category` counts boxes captured in a window
without looking at status, so dispatched/rejected boxes still add up — hence
the mobile screen is titled "Capturado por categoría", not "Stock". An
optional `status` filter lets a caller read it as on-hand inventory instead.
"""


def test_by_category_counts_every_status_by_default(client, world):
    res = client.get(
        f"/v1/reports/campaign/{world.campaign.id}/by-category",
        headers=world.token(world.coordinator_a),
    )
    assert res.status_code == 200
    row = next(r for r in res.json() if r["category"] == "WATER")
    assert row["box_count"] == 2  # SEALED + DRAFT, both center A


def test_by_category_status_filter_reads_as_stock(client, world):
    res = client.get(
        f"/v1/reports/campaign/{world.campaign.id}/by-category",
        params={"status": "SEALED"},
        headers=world.token(world.coordinator_a),
    )
    assert res.status_code == 200
    row = next(r for r in res.json() if r["category"] == "WATER")
    assert row["box_count"] == 1


def test_by_category_rejects_unknown_status(client, world):
    res = client.get(
        f"/v1/reports/campaign/{world.campaign.id}/by-category",
        params={"status": "NOT_A_STATUS"},
        headers=world.token(world.coordinator_a),
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_STATUS"
