"""`POST /v1/intakes` with a box that names a product type the server no
longer has.

This used to answer 404 (`PRODUCT_TYPE_NOT_FOUND`), which the mobile app's
`NotFoundFailure` shows as a dead-end generic message — deliberately, since a
404 is supposed to mean "this URL resource genuinely doesn't exist" and there
is nothing more to say about that. But this isn't a URL resource: it's a
reference inside the request body, the same category of error as
`CAMPAIGN_NOT_FOUND` a few lines above it in `IntakeService.create`, which
already answers 400. Moving this one to match lets the client show its
own named-code copy ("actualiza el catálogo") instead of the dead end.
"""

import uuid


def test_unknown_product_type_is_a_business_rule_not_a_missing_resource(client, world):
    res = client.post(
        "/v1/intakes",
        json={
            "campaign_id": str(world.campaign.id),
            "boxes": [{
                "product_type_id": str(uuid.uuid4()),
                "quantity": 1,
                "unit": "unidades",
            }],
        },
        headers=world.token(world.coordinator_a),
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "PRODUCT_TYPE_NOT_FOUND"
