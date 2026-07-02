"""Fase 12 tarea 12 — covering index for stock_by_center / summary_totals / weight_by_center.

Revision ID: 021
Revises: 020

Grupo A (migración 018) created `ix_boxes_sealed_center` as a plain partial
index `(center_id) WHERE status = 'SEALED'`. This migration replaces it with
the same index plus `INCLUDE (quantity, weight_kg)` — the two columns every
national-dashboard aggregation actually needs (AggregateRepository.stock_by_center,
weight_by_center, summary_totals). With the extra columns carried in the index
itself, Postgres can satisfy these queries via an Index Only Scan — no heap
fetch — instead of an Index Scan that still visits the table row-by-row.

Tarea 12 was deliberately deferred until there was real measurement (Fase 12
tarea 26, load testing): at ~6000 boxes the existing partial index isn't even
adopted by the planner for the full-aggregation case (Postgres correctly
prefers a Seq Scan at that low selectivity/volume) — this migration is
explicitly preventive work for when volume grows, not a response to an
observed slowdown.

`ALTER INDEX ... ADD INCLUDE` doesn't exist in Postgres — replacing the index
means dropping and recreating it, both via CREATE/DROP INDEX CONCURRENTLY so
neither blocks writes.
"""

from alembic import op

revision = "021"
down_revision = "020"
branch_labels = None
depends_on = None

_OLD_INDEX = "ix_boxes_sealed_center"
_NEW_INDEX = "ix_boxes_sealed_center_covering"


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute(
            f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {_NEW_INDEX} "
            f"ON boxes (center_id) INCLUDE (quantity, weight_kg) WHERE status = 'SEALED'"
        )
        op.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {_OLD_INDEX}")


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute(
            f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {_OLD_INDEX} "
            f"ON boxes (center_id) WHERE status = 'SEALED'"
        )
        op.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {_NEW_INDEX}")
