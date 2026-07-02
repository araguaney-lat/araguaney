"""export_jobs table — Fase 12 tarea 15c (async PDF/XLSX/CSV generation via ARQ)

Revision ID: 019
Revises: 018
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "export_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("status", sa.String(), server_default="PENDING", nullable=False),
        sa.Column("params", postgresql.JSONB(), nullable=False),
        sa.Column("r2_key", sa.String(), nullable=True),
        sa.Column("error", sa.String(), nullable=True),
        sa.Column("requested_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("center_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["requested_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["center_id"], ["centers.id"], ondelete="SET NULL"),
        sa.CheckConstraint(
            "kind IN ('SHIPMENT_MANIFEST_PDF', 'SHIPMENT_MANIFEST_XLSX', 'BOX_LABELS_PDF', "
            "'PALLET_LABEL_PDF', 'TRANSFER_MANIFEST_PDF', 'REPORT_EXPORT_CSV')",
            name="ck_export_job_kind",
        ),
        sa.CheckConstraint("status IN ('PENDING', 'RUNNING', 'DONE', 'FAILED')", name="ck_export_job_status"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_export_jobs_requested_by", "export_jobs", ["requested_by"])
    op.create_index("ix_export_jobs_expires", "export_jobs", ["expires_at"])


def downgrade() -> None:
    op.drop_table("export_jobs")
