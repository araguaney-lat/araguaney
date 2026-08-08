"""Refresh tokens rotatorios con detección de reuso

El access token pasa a durar poco (30 min): si se filtra, la ventana de uso es
de minutos, no de un día. Para no obligar a re-teclear la contraseña a cada rato
—inviable en móvil— se añade un refresh token de larga vida que renueva el
access sin credenciales.

Se guarda el SHA-256 del token, nunca el token en claro: una filtración de la
base no entrega tokens usables. `family_id` agrupa la cadena que nace de un
login; `replaced_by` encadena la rotación. Si reaparece un token ya revocado es
señal de robo y se revoca la familia entera.

Revision ID: 044
Revises: 043
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "044"
down_revision = "043"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "refresh_tokens",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        # SHA-256 del token en claro; el token nunca se persiste.
        sa.Column("token_hash", sa.String(), nullable=False, unique=True, index=True),
        sa.Column("family_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("replaced_by", UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("refresh_tokens")
