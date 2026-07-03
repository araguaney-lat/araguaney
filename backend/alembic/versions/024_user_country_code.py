"""add country_code to users

Scopes which centers a national_admin sees by default in the Team page's
center selector (null = no country assigned yet = see all centers, the
correct behavior for every national_admin created before this field
existed). Coordinator/volunteer accounts can carry it too, though their
own center's country_code already covers the functional need today.

Revision ID: 024
Revises: 023
Create Date: 2026-07-03
"""
from alembic import op
import sqlalchemy as sa

revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("country_code", sa.String(length=2), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "country_code")
