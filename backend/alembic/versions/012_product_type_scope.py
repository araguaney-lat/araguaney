"""product_types.campaign_id for campaign-scoped catalog + unaccent extension

Revision ID: 012
Revises: 011
Create Date: 2026-06-30

NULL campaign_id = global (seeds + promoted by national_admin).
campaign_id = X = visible to all centers in campaign X.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # unaccent needed for dedup check in ProductTypeRepository
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")

    op.add_column(
        "product_types",
        sa.Column("campaign_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_product_types_campaign_id",
        "product_types",
        "campaigns",
        ["campaign_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_product_types_campaign_id", "product_types", ["campaign_id"])


def downgrade() -> None:
    op.drop_index("ix_product_types_campaign_id", table_name="product_types")
    op.drop_constraint("fk_product_types_campaign_id", "product_types", type_="foreignkey")
    op.drop_column("product_types", "campaign_id")
