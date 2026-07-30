"""Fase 20: revisiones de riesgo sobre capturas de volumen atípico

La captura nunca se detiene — el camión ya está en la puerta y quien captura es
un voluntario. Lo que queda abierto es esta revisión, que la coordinación
resuelve después dejando por qué.

Revision ID: 035
Revises: 034
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "035"
down_revision = "034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "risk_reviews",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("center_id", UUID(as_uuid=True),
                  sa.ForeignKey("centers.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("intake_id", UUID(as_uuid=True),
                  sa.ForeignKey("intakes.id", ondelete="CASCADE"), nullable=True, index=True),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="PENDING"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("boxes", sa.String(), nullable=True),
        sa.Column("created_by_user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("reviewed_by_user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "kind IN ('ATYPICAL_VOLUME', 'ANONYMOUS_EXCEPTION')",
            name="ck_risk_reviews_kind",
        ),
        sa.CheckConstraint(
            "status IN ('PENDING', 'APPROVED', 'REJECTED')",
            name="ck_risk_reviews_status",
        ),
    )
    # La cola que la coordinación abre todos los días: pendientes de su centro.
    op.create_index(
        "ix_risk_reviews_center_status", "risk_reviews", ["center_id", "status"]
    )


def downgrade() -> None:
    op.drop_index("ix_risk_reviews_center_status", table_name="risk_reviews")
    op.drop_table("risk_reviews")
