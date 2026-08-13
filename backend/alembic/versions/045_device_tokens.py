"""Registro de dispositivos para avisos push

La aplicación instalada necesita un lugar donde decir "entrégame aquí". La fila
es por token y no por usuario ni por dispositivo: el teléfono de un centro se
comparte entre varias personas en una jornada, así que una fila por dispositivo
pisaría a quien entró antes, y una por usuario dejaría sin avisos a quien tiene
dos aparatos.

Un token no se borra al dejar de servir, se marca. Distinguir el que alguien dio
de baja al cerrar sesión del que FCM rechazó por inexistente es lo que permite
ver si el despacho está perdiendo destinos.

Revision ID: 045
Revises: 044
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "045"
down_revision = "044"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "device_tokens",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("platform", sa.String(), nullable=False),
        sa.Column("app_version", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_reason", sa.String(), nullable=True),
        sa.UniqueConstraint("token", name="uq_device_tokens_token"),
        sa.CheckConstraint(
            "platform IN ('android', 'ios')", name="ck_device_tokens_platform"
        ),
    )
    op.create_index("ix_device_tokens_user_id", "device_tokens", ["user_id"])
    # El despacho pregunta siempre lo mismo: los tokens vivos de un usuario.
    op.create_index(
        "ix_device_tokens_active_by_user",
        "device_tokens",
        ["user_id"],
        postgresql_where=sa.text("revoked_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_device_tokens_active_by_user", table_name="device_tokens")
    op.drop_index("ix_device_tokens_user_id", table_name="device_tokens")
    op.drop_table("device_tokens")
