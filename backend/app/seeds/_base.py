"""Shared, dependency-free contract for the global catalog seeds.

Only stdlib here (uuid) so the Alembic migrations can import it safely without
pulling in the app/ODM layers. The same helpers back the data modules, the
migrations (025/026/027) and the tests, so validating the data validates what
the migrations insert.
"""
import uuid

# Fixed namespace → deterministic ids for seed rows (uuid5). Stable across runs
# so re-seeding is idempotent via ON CONFLICT (id) DO NOTHING.
SEED_NAMESPACE = uuid.UUID("8f5b3c1e-2a44-5d6e-9b0a-7c1d2e3f4a55")

PRODUCT_CATEGORIES = (
    "MEDICINE", "MEDICAL_SUPPLY", "FOOD", "WATER",
    "HYGIENE", "TOOL", "RESCUE_GEAR", "OTHER",
)

# Columns a seed row may set. category + display_name are required; the rest
# default to None (or the category default for min_shelf_life_days).
_OPTIONAL_FIELDS = (
    "unspsc_code", "inn_name", "brand", "strength", "form", "gtin",
    "default_unit", "is_controlled", "min_shelf_life_days", "unit_weight_kg",
)

# Per-category default remaining shelf life (WHO ≥365 for meds, ≥180 for food).
_DEFAULT_SHELF_LIFE = {"MEDICINE": 365, "FOOD": 180}


def natural_key(row: dict) -> str:
    """Stable identity of a seed row → drives its deterministic uuid5 id.

    Medicines are keyed by INN+strength+form (a SKU distinction per CLAUDE.md,
    e.g. Ibuprofen 400mg != 600mg); everything else by category+display_name.
    """
    cat = row["category"].strip().upper()
    if cat == "MEDICINE":
        parts = [cat, row.get("inn_name", ""), row.get("strength", ""), row.get("form", "")]
    else:
        parts = [cat, row.get("display_name", "")]
    return "|".join(p.strip().lower() for p in parts)


def seed_id(row: dict) -> uuid.UUID:
    return uuid.uuid5(SEED_NAMESPACE, natural_key(row))


def build_rows(rows: list[dict]) -> list[dict]:
    """Normalize raw seed dicts into full insert params.

    Validates required fields and category, applies per-category shelf-life
    default, computes the deterministic id. Raises ValueError on bad data so a
    malformed seed fails loudly at migration/test time instead of silently.
    """
    out: list[dict] = []
    for i, row in enumerate(rows):
        category = str(row.get("category", "")).strip().upper()
        display_name = str(row.get("display_name", "")).strip()
        if category not in PRODUCT_CATEGORIES:
            raise ValueError(f"row {i}: invalid category {row.get('category')!r}")
        if not display_name:
            raise ValueError(f"row {i}: empty display_name")

        params: dict = {
            "id": seed_id(row),
            "category": category,
            "display_name": display_name,
        }
        for field in _OPTIONAL_FIELDS:
            params[field] = row.get(field)
        if params["min_shelf_life_days"] is None:
            params["min_shelf_life_days"] = _DEFAULT_SHELF_LIFE.get(category)
        if params["is_controlled"] is None:
            params["is_controlled"] = False
        out.append(params)
    return out
