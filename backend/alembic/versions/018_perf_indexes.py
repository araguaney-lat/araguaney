"""Performance indexes — Fase 12 Grupo A.

Review de DB (2026-07-01) found several missing indexes behind the app's
heaviest read paths: reports joining Box→Intake, the dashboard's
filter+sort query on boxes, panel nacional's date-range scans, and audit
log lookups by user/entity.

All indexes use CREATE INDEX CONCURRENTLY so they don't block writes in
production. CONCURRENTLY cannot run inside a transaction, hence
autocommit_block(). If a CONCURRENTLY build fails mid-way it can leave an
INVALID index behind that needs a manual DROP — see docs/roadmap/phase-12-optimization.md.

Revision ID: 018
Revises: 017
"""

from alembic import op

revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None

_INDEXES = [
    ("ix_boxes_intake_id", "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_boxes_intake_id ON boxes (intake_id)"),
    (
        "ix_boxes_center_status_created",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_boxes_center_status_created "
        "ON boxes (center_id, status, created_at DESC)",
    ),
    ("ix_boxes_created_at", "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_boxes_created_at ON boxes (created_at)"),
    ("ix_audit_user", "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_audit_user ON audit_log (user_id)"),
    (
        "ix_audit_entity_created",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_audit_entity_created "
        "ON audit_log (entity_type, created_at DESC)",
    ),
    (
        "ix_boxes_sealed_center",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_boxes_sealed_center "
        "ON boxes (center_id) WHERE status = 'SEALED'",
    ),
    (
        "ix_shipments_center_status_created",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_shipments_center_status_created "
        "ON shipments (center_id, status, created_at DESC)",
    ),
    (
        "ix_pallets_center_status_created",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_pallets_center_status_created "
        "ON pallets (center_id, status, created_at DESC)",
    ),
    (
        "ix_requests_center_status_created",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_requests_center_status_created "
        "ON requests (center_id, status, created_at DESC)",
    ),
]


def upgrade() -> None:
    with op.get_context().autocommit_block():
        for _, sql in _INDEXES:
            op.execute(sql)
        op.execute("ANALYZE boxes")
        op.execute("ANALYZE audit_log")
        op.execute("ANALYZE shipments")
        op.execute("ANALYZE pallets")
        op.execute("ANALYZE requests")


def downgrade() -> None:
    with op.get_context().autocommit_block():
        for name, _ in reversed(_INDEXES):
            op.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {name}")
