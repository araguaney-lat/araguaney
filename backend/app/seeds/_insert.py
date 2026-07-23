"""DB-side helpers for the catalog seed migrations (025/026/027).

Kept separate from _base.py (which is stdlib-only data) because this imports
SQLAlchemy. Uses an idempotent ON CONFLICT (id) DO NOTHING insert keyed on the
deterministic seed id, so re-running a migration never duplicates rows.
"""
from sqlalchemy import MetaData, Table, text
from sqlalchemy.dialects.postgresql import insert as pg_insert

# Columns build_rows() produces (+ campaign_id, always NULL for global seeds).
_COLUMNS = (
    "id", "category", "display_name", "unspsc_code", "inn_name", "brand",
    "strength", "form", "gtin", "default_unit", "is_controlled",
    "min_shelf_life_days", "unit_weight_kg",
)


def seed_insert(bind, rows: list[dict]) -> None:
    """Insert normalized seed rows (from build_rows) as global product types."""
    product_types = Table("product_types", MetaData(), autoload_with=bind)
    params = [
        {**{col: row.get(col) for col in _COLUMNS}, "campaign_id": None}
        for row in rows
    ]
    stmt = pg_insert(product_types).on_conflict_do_nothing(index_elements=["id"])
    bind.execute(stmt, params)


def seed_delete(bind, ids: list) -> None:
    """Remove only the seeded global rows (by id), leaving user catalog intact."""
    bind.execute(
        text("DELETE FROM product_types WHERE id = ANY(:ids) AND campaign_id IS NULL"),
        {"ids": ids},
    )
