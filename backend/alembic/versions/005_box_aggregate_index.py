"""add ix_boxes_pt_status for aggregate dashboard query

Revision ID: 005
Revises: 004_campaigns
Create Date: 2026-06-30
"""
from alembic import op

revision = "005"
down_revision = "004_campaigns"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_boxes_pt_status",
        "boxes",
        ["product_type_id", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_boxes_pt_status", table_name="boxes")
