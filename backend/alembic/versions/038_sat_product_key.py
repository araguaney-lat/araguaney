"""Fase 21: clave de producto/servicio del SAT en el catálogo

`ClaveProdServCP` para el complemento Carta Porte. Nullable y sin sembrar: la
clave correcta la confirma quien timbra, y una clave equivocada en un documento
fiscal es peor que una celda vacía. El anexo declara lo que falta.

Revision ID: 038
Revises: 037
"""

import sqlalchemy as sa
from alembic import op

revision = "038"
down_revision = "037"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("product_types", sa.Column("sat_product_key", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("product_types", "sat_product_key")
