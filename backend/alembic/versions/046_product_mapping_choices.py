"""Elecciones reales de mapeo de texto libre (Fase 23, task 8)

Nada persiste hoy el par (texto del donante, producto elegido): la sugerencia
de la IA se calcula y se muestra, y la elección final de quien captura se
pierde en cuanto responde la petición. Sin ese par no hay forma de construir
el conjunto de ~100 casos reales que la fase exige antes de encender el
mapeo con confianza — solo hay casos escritos a mano.

Esta tabla no decide nada ni cambia ningún flujo: solo acumula el hecho.

Revision ID: 046
Revises: 045
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "046"
down_revision = "045"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "product_mapping_choices",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("free_text", sa.String(), nullable=False),
        sa.Column(
            "suggested_product_type_ids", JSONB, nullable=False, server_default="[]",
        ),
        sa.Column(
            "chosen_product_type_id",
            UUID(as_uuid=True),
            sa.ForeignKey("product_types.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
        ),
        sa.Column(
            "center_id", UUID(as_uuid=True), sa.ForeignKey("centers.id", ondelete="SET NULL"), nullable=True,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_product_mapping_choices_created_at", "product_mapping_choices", ["created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_product_mapping_choices_created_at", table_name="product_mapping_choices")
    op.drop_table("product_mapping_choices")
