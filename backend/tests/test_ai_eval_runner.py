"""`evals/run.py` measures the real pipeline, not a stand-in.

The previous version of the script asked the provider with its own prompt and
no catalog — a different, ungrounded task from what `text_mapping.suggest()`
actually does. These tests pin the parts that make the new version honest:
it seeds the real global catalog (the same lists the migrations insert, not a
shortened copy for the test) and calls `text_mapping.suggest()` itself, with
a stub provider standing in for the network call so the suite never needs one.
"""

from unittest.mock import patch
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    return "JSON"


import app.models  # noqa: E402,F401
from app.database import Base  # noqa: E402
from app.services.ai import budget, text_mapping  # noqa: E402
from app.services.ai.evaluation import evaluate_mapping  # noqa: E402
from app.services.ai.provider import AIResult  # noqa: E402

from evals.run import _resolve_mapping_cases, _run_mapping, _seed_catalog  # noqa: E402


def _capability_on():
    """The two settings `budget.capability_enabled()` checks, auto-restored —
    same convention as `tests/test_ai_text_mapping.py`."""
    return (
        patch.object(budget.settings, "ai_api_key", "test-key"),
        patch.object(budget.settings, "ai_enable_text_mapping", True),
    )


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def test_seeding_loads_the_real_global_catalog(db):
    """Not a shortened stand-in: the same three lists the migrations insert."""
    ids_by_name = _seed_catalog(db)

    # One item from each of the three real seed sources.
    assert "Atún en lata" in ids_by_name           # common_food.FOOD
    assert "Ibuprofeno 400mg tableta" in ids_by_name  # who_medicines.MEDICINES
    assert "Cobija de lana" in ids_by_name          # iom_nonfood.NONFOOD


def test_unmatched_slugs_are_skipped_not_guessed(db):
    """A slug with no real product behind it is reported, never faked into a
    match — a false pass would say a capability is ready when it isn't."""
    ids_by_name = _seed_catalog(db)
    cases, skipped = _resolve_mapping_cases(ids_by_name)

    assert "agua-botella" in skipped  # today's real catalog has no bottled water
    assert all(c.expected_slug != "agua-botella" for c in cases)
    assert len(cases) > 0


def test_run_mapping_calls_the_real_production_function(db):
    """The eval must exercise `text_mapping.suggest()` itself — shortlist,
    grounding against real catalog ids, budget gate — not a separate prompt
    that bypasses all of that."""
    # `_run_mapping` seeds on its own; a fresh, unseeded db is expected here.
    stub_result = AIResult(data={"ids": []}, input_tokens=10, output_tokens=5)
    key, flag = _capability_on()
    with key, flag, patch("app.services.ai.text_mapping.get_provider") as get_provider:
        get_provider.return_value.classify_text.return_value = stub_result
        reporte, skipped = _run_mapping(db)

    assert reporte.total > 0
    assert isinstance(skipped, list) and skipped
    # The budget gate must have let the call through to reach this: proves it
    # is the stub's empty answer that scored zero, not `AIDisabled` short-
    # circuiting `suggest()` before ever calling the provider.
    get_provider.return_value.classify_text.assert_called()
    assert reporte.metrics["top1"] == 0.0


def test_a_perfect_classifier_scores_above_zero(db):
    """Sanity check the wiring end to end: a provider that always finds the
    right id in whatever shortlist it was shown should score well — proving
    ids flow correctly from seed → shortlist → prompt → parsed answer →
    report, without depending on the model actually being any good."""
    ids_by_name = _seed_catalog(db)
    cases, _ = _resolve_mapping_cases(ids_by_name)
    known_ids = {c.expected_slug for c in cases}  # real product UUIDs as str

    def always_find_the_right_one(prompt, question, **kwargs):
        # The shortlist is embedded as "- <uuid> · <name> ...\n" lines.
        shortlisted = [
            line.split(" ")[1]
            for line in question.split("\n\nCatálogo:\n")[1].splitlines()
        ]
        hit = next((i for i in shortlisted if i in known_ids), None)
        return AIResult(
            data={"ids": [hit] if hit else []}, input_tokens=10, output_tokens=5
        )

    key, flag = _capability_on()
    with key, flag, patch("app.services.ai.text_mapping.get_provider") as get_provider:
        get_provider.return_value.classify_text.side_effect = always_find_the_right_one
        user_id = uuid4()
        reporte = evaluate_mapping(
            cases,
            lambda texto: [
                str(pt.id)
                for pt in text_mapping.suggest(db, texto, user_id=user_id, campaign_ids=None)
            ],
        )

    assert reporte.metrics["top3"] > 0.0
