"""donations.confirmation_sent_at — reloj de la purga tras un reenvío

El plazo de vencimiento se medía desde `created_at`, así que pedir de nuevo el
correo de confirmación el último día no daba tiempo de nada. Con esta columna la
purga mide desde el último envío, y `created_at` sigue siendo el hecho histórico.

Revision ID: 033
Revises: 032
"""

import sqlalchemy as sa
from alembic import op

revision = "033"
down_revision = "032"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "donations",
        sa.Column("confirmation_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Las que ya existen nunca se reenviaron: su reloj sigue siendo el alta.
    op.execute("UPDATE donations SET confirmation_sent_at = created_at")


def downgrade() -> None:
    op.drop_column("donations", "confirmation_sent_at")
