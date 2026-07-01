"""Add weight fields to product_types, pallets, and campaigns

Revision ID: 013
Revises: 012
Create Date: 2026-06-30

unit_weight_kg on product_types flows down:
  Box.weight_kg = unit_weight_kg × quantity (computed in BoxService.seal)
tare_weight_kg on pallets: empty-pallet tare for gross weight calc.
weight_goal_kg on campaigns: if NULL → show raw kg total; if set → show progress bar.
"""
import sqlalchemy as sa
from alembic import op

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "product_types",
        sa.Column("unit_weight_kg", sa.Numeric(8, 3), nullable=True),
    )
    op.add_column(
        "pallets",
        sa.Column("tare_weight_kg", sa.Numeric(8, 3), nullable=True),
    )
    op.add_column(
        "campaigns",
        sa.Column("weight_goal_kg", sa.Numeric(10, 3), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("campaigns", "weight_goal_kg")
    op.drop_column("pallets", "tare_weight_kg")
    op.drop_column("product_types", "unit_weight_kg")
