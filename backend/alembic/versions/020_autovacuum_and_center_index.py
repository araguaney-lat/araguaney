"""Fase 12 Grupo B — autovacuum tuning + partial index on centers.is_active.

Revision ID: 020
Revises: 019

Autovacuum tuning (tarea 9): audit_log/box_events/pallet_events/shipment_events
are append-heavy — they only ever grow (audit_log is purged by cron, the
*_events tables are not, see tarea 10 for that decision). Postgres defaults
(autovacuum_vacuum_scale_factor=0.2, autovacuum_analyze_scale_factor=0.1) mean
autovacuum waits for 20%/10% of the table to change before running — on a
large, mostly-insert-only table that's a long time between ANALYZE runs,
so the planner works off increasingly stale row-count estimates as the table
grows. Lower both scale factors so stats stay fresh without waiting for a
huge fraction of the (ever-growing) table to change.

Partial index (tarea 11): Center.is_active is filtered on every national
dashboard load (CenterRepository.find_all(active_only=True)) — currently a
full index scan. Optional per the roadmap ("si crece el número de centros"),
cheap to add now with CREATE INDEX CONCURRENTLY.
"""

from alembic import op

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None

_TUNED_TABLES = ("audit_log", "box_events", "pallet_events", "shipment_events")


def upgrade() -> None:
    for table in _TUNED_TABLES:
        op.execute(
            f"ALTER TABLE {table} SET ("
            "autovacuum_vacuum_scale_factor = 0.05, "
            "autovacuum_analyze_scale_factor = 0.02"
            ")"
        )

    with op.get_context().autocommit_block():
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_centers_active "
            "ON centers (id) WHERE is_active = true"
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_centers_active")

    for table in _TUNED_TABLES:
        op.execute(f"ALTER TABLE {table} RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor)")
