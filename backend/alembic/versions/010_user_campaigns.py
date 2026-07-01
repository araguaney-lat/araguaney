"""user_campaigns table + is_general flag + seed Donaciones Generales

Revision ID: 010
Revises: 009
Create Date: 2026-06-30
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None

# Fixed UUID for "Donaciones Generales" — referenced by subsequent migrations.
DONACIONES_GENERALES_ID = "00000000-0000-4000-8000-000000000001"


def upgrade() -> None:
    # 1. Mark campaigns that are the permanent fallback
    op.add_column(
        "campaigns",
        sa.Column("is_general", sa.Boolean(), nullable=False, server_default="false"),
    )

    # 2. Seed "Donaciones Generales" with a fixed well-known UUID
    op.execute(
        f"""
        INSERT INTO campaigns (id, name, is_general, is_active, created_at)
        VALUES (
            '{DONACIONES_GENERALES_ID}'::uuid,
            'Donaciones Generales',
            true,
            true,
            now()
        )
        ON CONFLICT (id) DO NOTHING
        """
    )

    # 3. user_campaigns — many-to-many with composite PK
    op.create_table(
        "user_campaigns",
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("campaign_id", UUID(as_uuid=True), sa.ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("assigned_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("user_id", "campaign_id"),
    )
    op.create_index("ix_user_campaigns_campaign_id", "user_campaigns", ["campaign_id"])

    # 4. Assign every existing user to "Donaciones Generales"
    op.execute(
        f"""
        INSERT INTO user_campaigns (user_id, campaign_id, assigned_at)
        SELECT id, '{DONACIONES_GENERALES_ID}'::uuid, now()
        FROM users
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_index("ix_user_campaigns_campaign_id", table_name="user_campaigns")
    op.drop_table("user_campaigns")
    op.execute(
        f"DELETE FROM campaigns WHERE id = '{DONACIONES_GENERALES_ID}'::uuid"
    )
    op.drop_column("campaigns", "is_general")
