"""add origin_country to campaigns

País de origen de la campaña, paralelo a destination_country (ambos ISO
3166-1 alpha-2, nullable). El destino puede coincidir con el origen — no
hay restricción de que sean distintos.

Revision ID: 023
Revises: 022
Create Date: 2026-07-03
"""
from alembic import op
import sqlalchemy as sa

revision = "023"
down_revision = "022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "campaigns",
        sa.Column("origin_country", sa.String(length=2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("campaigns", "origin_country")
