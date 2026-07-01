"""Add transfers, transfer_items, transfer_events tables

Revision ID: 014
Revises: 013
Create Date: 2026-07-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "transfers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("from_center_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("centers.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("to_center_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("centers.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("status", sa.String, nullable=False, server_default="REQUESTED"),
        sa.Column("initiated_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("notes", sa.String, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('REQUESTED','APPROVED','IN_TRANSIT','RECEIVED','REJECTED')",
                           name="transfers_status_check"),
    )
    op.create_index("ix_transfers_status", "transfers", ["status"])

    op.create_table(
        "transfer_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("transfer_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("transfers.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("box_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("boxes.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.UniqueConstraint("transfer_id", "box_id", name="uq_transfer_items_transfer_box"),
    )

    op.create_table(
        "transfer_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("transfer_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("transfers.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("from_status", sa.String, nullable=True),
        sa.Column("to_status", sa.String, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("note", sa.String, nullable=True),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("transfer_events")
    op.drop_table("transfer_items")
    op.drop_index("ix_transfers_status", table_name="transfers")
    op.drop_table("transfers")
