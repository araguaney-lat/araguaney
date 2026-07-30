"""Fase 21: siembra los pesos de referencia por unidad del catálogo

Rellena `product_types.unit_weight_kg` para los tipos más comunes (alimentos,
higiene y agua). Es una referencia de contenido para que quien captura note un
dedazo, no el peso de la caja: la caja se pesa en báscula.

**Solo llena lo vacío.** Si un centro ya curó el peso de un producto, ese valor
manda: el nuestro es un tamaño comercial típico, el suyo es su realidad.

Revision ID: 037
Revises: 036
"""

import sqlalchemy as sa
from alembic import op

from app.seeds._base import seed_id
from app.seeds.common_food import FOOD
from app.seeds.iom_nonfood import NONFOOD
from app.seeds.unit_weights import ALL_WEIGHTS

revision = "037"
down_revision = "036"
branch_labels = None
depends_on = None


def _filas() -> list[tuple[str, float]]:
    """(id determinista del seed, peso) para cada nombre con referencia."""
    filas = []
    for row in [*FOOD, *NONFOOD]:
        peso = ALL_WEIGHTS.get(row["display_name"])
        if peso is not None:
            filas.append((str(seed_id(row)), peso))
    return filas


def upgrade() -> None:
    bind = op.get_bind()
    for pt_id, peso in _filas():
        bind.execute(
            sa.text(
                "UPDATE product_types SET unit_weight_kg = :peso "
                "WHERE id = :id AND unit_weight_kg IS NULL"
            ),
            {"peso": peso, "id": pt_id},
        )


def downgrade() -> None:
    # Solo se revierte lo que esta migración puso: un valor distinto al sembrado
    # lo escribió alguien más, y no es nuestro para borrarlo.
    bind = op.get_bind()
    for pt_id, peso in _filas():
        bind.execute(
            sa.text(
                "UPDATE product_types SET unit_weight_kg = NULL "
                "WHERE id = :id AND unit_weight_kg = :peso"
            ),
            {"peso": peso, "id": pt_id},
        )
