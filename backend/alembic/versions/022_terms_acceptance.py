"""add accepted_terms_at / accepted_terms_version to users

Fase 13 tarea 3 — LFPDPPP: registrar cuándo y qué versión de los documentos
legales (Aviso de Privacidad / Términos) aceptó cada usuario.

Revision ID: 022
Revises: 021
Create Date: 2026-07-03
"""
from alembic import op
import sqlalchemy as sa

revision = "022"
down_revision = "021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("accepted_terms_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("accepted_terms_version", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "accepted_terms_version")
    op.drop_column("users", "accepted_terms_at")
