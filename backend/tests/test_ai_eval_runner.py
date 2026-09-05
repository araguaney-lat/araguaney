"""`evals/run.py` measures the real pipeline, not a stand-in.

The previous version of the script asked the provider with its own prompt and
no catalog — a different, ungrounded task from what `text_mapping.suggest()`
actually does. These tests pin the parts that make the new version honest:
it seeds the real global catalog (the same lists the migrations insert, not a
shortened copy for the test) and calls `text_mapping.suggest()` itself, with
a stub provider standing in for the network call so the suite never needs one.
"""

import os
import pathlib
import sys
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

from evals.run import (  # noqa: E402
    _check_photos,
    _load_ocr_cases,
    _resolve_mapping_cases,
    _run_mapping,
    _run_ocr,
    _seed_catalog,
)


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


def test_the_script_runs_as_a_real_subprocess_without_its_own_test_shim():
    """`_seed_catalog` needs a JSONB-to-JSON compile shim for SQLite
    (`audit_log` and every other JSONB column, not just this module's own
    table). Every fixture in this suite registers one, and that's exactly
    what let a version of `evals/run.py` missing its own shim pass every test
    here while still crashing for real: `python -m evals.run` runs in a fresh
    process that never imports this file. Only a real subprocess catches
    that; mocking `subprocess` would just re-hide the same gap. Pointing at
    an address nothing listens on, instead of the real OpenAI API, still
    exercises `create_all` and the whole seed-shortlist-prompt pipeline for
    real, stays offline like the rest of this suite, and fails fast at the
    connection rather than a real network call.
    """
    import subprocess

    result = subprocess.run(
        [sys.executable, "-m", "evals.run", "--capability", "mapping"],
        cwd=str(pathlib.Path(__file__).parent.parent),
        env={
            **os.environ,
            "AI_API_KEY": "sk-test-key-for-ci",
            "AI_BASE_URL": "http://127.0.0.1:1",
        },
        capture_output=True,
        text=True,
        timeout=60,
    )

    assert "Traceback" not in result.stderr, result.stderr
    assert "30 casos" in result.stdout
    assert result.returncode == 1  # nothing listening there can't pass the threshold


# ── OCR: the label photos live outside the repository ────────────────────────
#
# Label photos are never committed (they can carry incidental personal data and
# they are heavy), so the runner reads them from a local folder the person
# running the eval controls. That makes "the file isn't there" the normal
# failure, not an exotic one — and it must be caught before any money is spent.


def _write_photo(directory: pathlib.Path, name: str, size: int = 32) -> pathlib.Path:
    path = directory / name
    path.write_bytes(b"\xff\xd8\xff" + b"0" * size)
    return path


@pytest.fixture()
def labels_dir(tmp_path):
    directory = tmp_path / "labels"
    directory.mkdir()
    return directory


def _cases_file(tmp_path, entries):
    import json

    path = tmp_path / "ocr_cases.json"
    path.write_text(json.dumps({"cases": entries}))
    return path


_EXPECTED = {"inn_name": "Paracetamol", "batch": "L1", "expiry_date": "2028-03-31"}


def test_a_photo_that_is_not_there_is_reported_and_nothing_is_spent(tmp_path, labels_dir):
    """Half of a hundred hand-curated photos is easy to mistype. Finding out at
    case 60, after paying for 59 calls, is the outcome worth preventing."""
    cases_file = _cases_file(tmp_path, [{"image_path": "no-existe.jpg", "expected": _EXPECTED}])
    cases = _load_ocr_cases(cases_file, labels_dir)

    problems = _check_photos(cases)

    assert len(problems) == 1
    assert "no-existe.jpg" in problems[0]


def test_an_unsupported_format_is_reported_before_the_call(tmp_path, labels_dir):
    """The backend refuses anything but JPEG, PNG and WebP. Learning that from
    a paid round trip, one photo at a time, is the slow way to learn it."""
    _write_photo(labels_dir, "etiqueta.gif")
    cases_file = _cases_file(tmp_path, [{"image_path": "etiqueta.gif", "expected": _EXPECTED}])

    problems = _check_photos(_load_ocr_cases(cases_file, labels_dir))

    assert len(problems) == 1
    assert "etiqueta.gif" in problems[0]


def test_a_photo_over_the_limit_is_reported_before_the_call(tmp_path, labels_dir):
    """`extract_from_bytes` rejects above 5 MB, so an un-downscaled phone photo
    would fail anyway — but only after the whole file went over the wire."""
    from app.services.ai.label_ocr import MAX_IMAGE_BYTES

    _write_photo(labels_dir, "pesada.jpg", size=MAX_IMAGE_BYTES + 1)
    cases_file = _cases_file(tmp_path, [{"image_path": "pesada.jpg", "expected": _EXPECTED}])

    problems = _check_photos(_load_ocr_cases(cases_file, labels_dir))

    assert len(problems) == 1
    assert "pesada.jpg" in problems[0]


def test_photos_that_are_all_fine_report_no_problems(tmp_path, labels_dir):
    for name in ("uno.jpg", "dos.png", "tres.webp"):
        _write_photo(labels_dir, name)
    cases_file = _cases_file(
        tmp_path,
        [{"image_path": n, "expected": _EXPECTED} for n in ("uno.jpg", "dos.png", "tres.webp")],
    )

    assert _check_photos(_load_ocr_cases(cases_file, labels_dir)) == []


def test_the_ocr_run_sends_the_real_bytes_through_the_production_reader(
    db, tmp_path, labels_dir
):
    """The eval must exercise `label_ocr.extract_from_bytes()` — the same
    budget gate, cache and field cleaning the capture form goes through — so a
    passing score means that path works, not a parallel one built for the test.
    """
    _write_photo(labels_dir, "paracetamol.jpg")
    cases_file = _cases_file(tmp_path, [{"image_path": "paracetamol.jpg", "expected": _EXPECTED}])

    stub = AIResult(data=dict(_EXPECTED), input_tokens=10, output_tokens=5)
    with (
        patch.object(budget.settings, "ai_api_key", "test-key"),
        patch.object(budget.settings, "ai_enable_label_ocr", True),
        patch("app.services.ai.label_ocr.get_provider") as get_provider,
    ):
        get_provider.return_value.extract_from_image.return_value = stub
        reporte = _run_ocr(db, cases_file, labels_dir)

    get_provider.return_value.extract_from_image.assert_called()
    # A reader that returns exactly what was expected scores 100% per field:
    # proves bytes → provider → `_clean` → report is wired end to end.
    assert reporte.total == 1
    assert reporte.metrics["expiry_date"] == 1.0

    # The image reaches the provider embedded, never as a path: a local path
    # would be unreachable for it and would silently score zero.
    _, image_ref = get_provider.return_value.extract_from_image.call_args[0]
    assert image_ref.startswith("data:image/jpeg;base64,")
