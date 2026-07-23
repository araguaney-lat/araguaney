"""Tests for the global catalog seeds (Fase 6) — data-contract only, no DB.

Mirrors the repo's mock-based style: validates the seed data modules and the
_base helpers that the 025/026/027 migrations feed into product_types.
"""
import uuid

import pytest

from app.seeds._base import (
    PRODUCT_CATEGORIES,
    SEED_NAMESPACE,
    build_rows,
    natural_key,
    seed_id,
)
from app.seeds.common_food import FOOD
from app.seeds.iom_nonfood import NONFOOD
from app.seeds.who_medicines import MEDICINES

_NONFOOD_CATEGORIES = {"MEDICAL_SUPPLY", "HYGIENE", "TOOL", "RESCUE_GEAR", "WATER", "OTHER"}


# ── Volume (curated subset ranges) ────────────────────────────────────────────

def test_expected_volumes():
    assert 140 <= len(MEDICINES) <= 160
    assert 70 <= len(NONFOOD) <= 90
    assert 35 <= len(FOOD) <= 45


# ── Determinism & uniqueness of ids ───────────────────────────────────────────

def test_seed_id_is_deterministic():
    row = MEDICINES[0]
    assert seed_id(row) == uuid.uuid5(SEED_NAMESPACE, natural_key(row))
    assert seed_id(row) == seed_id(dict(row))  # stable across equal inputs


def test_all_ids_unique_across_every_seed():
    all_rows = build_rows(MEDICINES) + build_rows(NONFOOD) + build_rows(FOOD)
    ids = [r["id"] for r in all_rows]
    assert len(ids) == len(set(ids)), "deterministic ids collide across seeds"


# ── build_rows normalization / validation ─────────────────────────────────────

def test_build_rows_applies_category_shelf_life_defaults():
    [med] = build_rows([{"category": "MEDICINE", "display_name": "X", "inn_name": "X",
                         "form": "tablet", "strength": "1 mg"}])
    assert med["min_shelf_life_days"] == 365
    [food] = build_rows([{"category": "FOOD", "display_name": "Arroz"}])
    assert food["min_shelf_life_days"] == 180
    assert med["is_controlled"] is False


@pytest.mark.parametrize("bad", [
    {"category": "NOPE", "display_name": "x"},
    {"category": "FOOD", "display_name": "   "},
    {"category": "FOOD"},
])
def test_build_rows_rejects_bad_data(bad):
    with pytest.raises(ValueError):
        build_rows([bad])


# ── Category invariants ───────────────────────────────────────────────────────

def test_every_row_has_valid_category_and_name():
    for row in build_rows(MEDICINES) + build_rows(NONFOOD) + build_rows(FOOD):
        assert row["category"] in PRODUCT_CATEGORIES
        assert row["display_name"].strip()


def test_medicine_invariants():
    for m in build_rows(MEDICINES):
        assert m["category"] == "MEDICINE"
        assert m["inn_name"] and m["form"] and m["strength"]
        assert m["min_shelf_life_days"] == 365
        assert isinstance(m["is_controlled"], bool)


def test_medicine_natural_key_distinguishes_strength():
    # Ibuprofen 400mg != 600mg (SKU distinction, CLAUDE.md §6).
    a = seed_id({"category": "MEDICINE", "inn_name": "Ibuprofen", "strength": "400 mg", "form": "tablet"})
    b = seed_id({"category": "MEDICINE", "inn_name": "Ibuprofen", "strength": "600 mg", "form": "tablet"})
    assert a != b


def test_food_invariants():
    for f in build_rows(FOOD):
        assert f["category"] == "FOOD"
        assert f["min_shelf_life_days"] == 180


def test_nonfood_invariants():
    for n in build_rows(NONFOOD):
        assert n["category"] in _NONFOOD_CATEGORIES
        assert n["inn_name"] is None and n["strength"] is None  # not medicines


def test_some_controlled_medicines_present():
    # Catalog must flag internationally controlled substances so intake blocks them.
    assert sum(m["is_controlled"] for m in build_rows(MEDICINES)) >= 5
