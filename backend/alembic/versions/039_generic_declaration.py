"""Fase 21: la declaración de mercancías deja de ser específica de un país

Araguaney opera en varios países y es software, no una fundación ni un asesor
fiscal. Tres cambios que mueven la frontera a donde debe estar:

- `product_types.sat_product_key` → `hs_code`. El Sistema Armonizado lo usan
  casi 200 países en aduana; una clave de un solo régimen era el código
  equivocado para carga que cruza fronteras. La columna estaba vacía (nunca se
  sembró a propósito), así que el rename no pierde datos.
- `centers` gana razón social, identificación fiscal y país del emisor: los
  datos que el centro captura sobre sí mismo y que nosotros solo imprimimos.
- `shipments.declaration_profile`: qué perfil de país usar al generar el
  documento, si alguno.

Revision ID: 039
Revises: 038
"""

import sqlalchemy as sa
from alembic import op

revision = "039"
down_revision = "038"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("product_types", "sat_product_key", new_column_name="hs_code")

    op.add_column("centers", sa.Column("legal_name", sa.String(), nullable=True))
    op.add_column("centers", sa.Column("tax_id", sa.String(), nullable=True))

    op.add_column("shipments", sa.Column("declaration_profile", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("shipments", "declaration_profile")
    op.drop_column("centers", "tax_id")
    op.drop_column("centers", "legal_name")
    op.alter_column("product_types", "hs_code", new_column_name="sat_product_key")
