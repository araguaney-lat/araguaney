"""Fase 21: pesaje por tarima y perfil de altura del envío

El peso que rige en la cadena aérea es el bruto de báscula por bulto, no la suma
de renglones. La tarima gana ese dato y su altura; el envío, la restricción de
altura contra la que se advierte.

Revision ID: 036
Revises: 035
"""

import sqlalchemy as sa
from alembic import op

revision = "036"
down_revision = "035"
branch_labels = None
depends_on = None

_PROFILES = ("LOWER_DECK_160", "XRAY_170", "MAIN_DECK_180", "SIN_RESTRICCION")


def upgrade() -> None:
    op.add_column("pallets", sa.Column("gross_weight_kg", sa.Numeric(8, 3), nullable=True))
    op.add_column("pallets", sa.Column("height_cm", sa.Integer(), nullable=True))
    op.add_column("shipments", sa.Column("height_profile", sa.String(), nullable=True))

    valores = ", ".join(f"'{p}'" for p in _PROFILES)
    op.create_check_constraint(
        "ck_shipments_height_profile",
        "shipments",
        f"height_profile IS NULL OR height_profile IN ({valores})",
    )


def downgrade() -> None:
    op.drop_constraint("ck_shipments_height_profile", "shipments", type_="check")
    op.drop_column("shipments", "height_profile")
    op.drop_column("pallets", "height_cm")
    op.drop_column("pallets", "gross_weight_kg")
