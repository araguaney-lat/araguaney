"""Fase 20: aceptación de términos de donación y marca de volumen atípico

`donations` gana la versión y fecha de los términos que la persona aceptó, más
la marca de volumen atípico que la vista de recepción usa para pedir el doble
check con la guía de banderas rojas a la mano.

`intakes` gana la versión aceptada por el donante identificado en ventanilla.
Nula cuando la captura es anónima: no hay a quién atribuirle una aceptación.

Revision ID: 034
Revises: 033
"""

import sqlalchemy as sa
from alembic import op

revision = "034"
down_revision = "033"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("donations", sa.Column("terms_version", sa.String(), nullable=True))
    op.add_column(
        "donations", sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "donations",
        sa.Column("atypical_volume", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("intakes", sa.Column("donor_terms_version", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("intakes", "donor_terms_version")
    op.drop_column("donations", "atypical_volume")
    op.drop_column("donations", "terms_accepted_at")
    op.drop_column("donations", "terms_version")
