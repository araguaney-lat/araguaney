"""make intakes.campaign_id NOT NULL, backfill with Donaciones Generales

Revision ID: 011
Revises: 010
Create Date: 2026-06-30
"""
import sqlalchemy as sa
from alembic import op

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None

DONACIONES_GENERALES_ID = "00000000-0000-4000-8000-000000000001"


def upgrade() -> None:
    # 1. Backfill intakes that have no campaign yet
    op.execute(
        f"""
        UPDATE intakes
        SET campaign_id = '{DONACIONES_GENERALES_ID}'::uuid
        WHERE campaign_id IS NULL
        """
    )

    # 2. Drop the existing FK (ondelete=SET NULL is incompatible with NOT NULL)
    op.drop_constraint("fk_intakes_campaign_id", "intakes", type_="foreignkey")

    # 3. Apply NOT NULL
    op.alter_column("intakes", "campaign_id", nullable=False)

    # 4. Recreate FK with RESTRICT — the general campaign must never be deleted
    op.create_foreign_key(
        "fk_intakes_campaign_id",
        "intakes",
        "campaigns",
        ["campaign_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint("fk_intakes_campaign_id", "intakes", type_="foreignkey")
    op.alter_column("intakes", "campaign_id", nullable=True)
    op.create_foreign_key(
        "fk_intakes_campaign_id",
        "intakes",
        "campaigns",
        ["campaign_id"],
        ["id"],
        ondelete="SET NULL",
    )
