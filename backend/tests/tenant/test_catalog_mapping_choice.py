"""Task 8 follow-up (roadmap Fase 23): the real ground truth the evaluation
harness needs doesn't exist anywhere in the schema — nothing records what a
coordinator actually chose for a donor's free text. `POST
/v1/catalog/mapping-choices` is the panel's hook for logging that choice, so
a real ~100-case dataset can accumulate instead of staying hand-written.
"""

from app.models.product_mapping_choice import ProductMappingChoice


def test_recording_a_choice_persists_the_real_pair(client, world):
    res = client.post(
        "/v1/catalog/mapping-choices",
        json={
            "free_text": "3 cobijas",
            "suggested_product_type_ids": [str(world.product_type.id)],
            "chosen_product_type_id": str(world.product_type.id),
        },
        headers=world.token(world.coordinator_a),
    )
    assert res.status_code == 204

    row = world.db.query(ProductMappingChoice).one()
    assert row.free_text == "3 cobijas"
    assert row.chosen_product_type_id == world.product_type.id
    assert row.suggested_product_type_ids == [str(world.product_type.id)]
    assert row.user_id == world.coordinator_a.id
    assert row.center_id == world.center_a.id


def test_a_choice_made_without_any_suggestion_is_still_worth_recording(client, world):
    """Nobody proposed anything and the person searched or created the
    product themselves — that the shortlist had nothing to offer is itself
    signal, not a case to discard."""
    res = client.post(
        "/v1/catalog/mapping-choices",
        json={
            "free_text": "un producto rarísimo",
            "suggested_product_type_ids": [],
            "chosen_product_type_id": str(world.product_type.id),
        },
        headers=world.token(world.coordinator_a),
    )
    assert res.status_code == 204
    row = world.db.query(ProductMappingChoice).one()
    assert row.suggested_product_type_ids == []


def test_rejects_an_unknown_field(client, world):
    res = client.post(
        "/v1/catalog/mapping-choices",
        json={
            "free_text": "3 cobijas",
            "chosen_product_type_id": str(world.product_type.id),
            "donor_name": "no debería aceptarse aquí",
        },
        headers=world.token(world.coordinator_a),
    )
    assert res.status_code == 422
