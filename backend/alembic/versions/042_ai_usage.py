"""Fase 23: registro de gasto de IA

Una fila por llamada, con el costo estimado en el momento de producirlo. Es la
base del tope mensual: sin registro no hay interruptor, y sin interruptor el
riesgo de la fase deja de ser el precio unitario y pasa a ser el volumen.

No guarda prompts ni respuestas. Interesa cuánto costó y a qué capacidad; el
contenido metería datos de donantes en una tabla que nadie mira con esa
expectativa.

Revision ID: 042
Revises: 041
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "042"
down_revision = "041"
branch_labels = None
depends_on = None

CAPABILITIES = ("text_mapping", "label_ocr", "needs_matching", "national_summary")


def upgrade() -> None:
    op.create_table(
        "ai_usage",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("capability", sa.String(), nullable=False),
        sa.Column("model", sa.String(), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cost_usd", sa.Float(), nullable=False, server_default="0"),
        sa.Column("user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("center_id", UUID(as_uuid=True),
                  sa.ForeignKey("centers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.CheckConstraint(
            "capability IN (" + ", ".join(f"'{c}'" for c in CAPABILITIES) + ")",
            name="ck_ai_usage_capability",
        ),
    )
    op.create_index("ix_ai_usage_capability", "ai_usage", ["capability"])
    # El tope se consulta por mes en cada llamada: el índice por fecha es lo que
    # evita que el guardarraíl se vuelva más caro que lo que protege.
    op.create_index("ix_ai_usage_created_at", "ai_usage", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_ai_usage_created_at", table_name="ai_usage")
    op.drop_index("ix_ai_usage_capability", table_name="ai_usage")
    op.drop_table("ai_usage")
