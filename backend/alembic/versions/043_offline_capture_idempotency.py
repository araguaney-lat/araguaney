"""Fase 25: idempotencia de captura y códigos de caja pre-asignados

Dos piezas que sostienen la captura sin conexión, y que van antes que la cola:
encolar sin idempotencia convierte "se perdió una captura" en "hay inventario
fantasma", que es peor y mucho más difícil de detectar.

- `intakes.capture_id`: llave que genera el cliente **antes** del primer intento
  y conserva en su cola. Todo reintento lleva la misma, así que una respuesta
  perdida no duplica el inventario. Nullable porque las capturas en línea que ya
  existen no la tienen y no vamos a inventarles una; única porque la garantía
  tiene que vivir en la base y no en una comprobación con una carrera en medio.

- `box_code_reservations`: bloque de códigos que un centro reserva con conexión
  para consumirlos sin ella. Sin código no hay etiqueta imprimible, e imprimir
  después obliga a volver a tocar cada caja cerrada, cosa que en un centro con
  prisa no ocurre.

Revision ID: 043
Revises: 042
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "043"
down_revision = "042"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("intakes", sa.Column("capture_id", UUID(as_uuid=True), nullable=True))
    op.create_unique_constraint("uq_intakes_capture_id", "intakes", ["capture_id"])

    op.create_table(
        "box_code_reservations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        # El mismo formato que genera el intake en línea: la etiqueta impresa no
        # distingue si la caja se capturó con señal o sin ella.
        sa.Column("code", sa.String(), nullable=False, unique=True),
        sa.Column("center_id", UUID(as_uuid=True),
                  sa.ForeignKey("centers.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("reserved_by_user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reserved_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        # Mientras `used_at` sea NULL, esto es un código disponible y no una
        # caja: no aparece en ningún reporte ni en ningún conteo de inventario.
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("box_id", UUID(as_uuid=True),
                  sa.ForeignKey("boxes.id", ondelete="SET NULL"), nullable=True),
    )
    # Buscar los disponibles de un centro es la consulta caliente al reservar.
    op.create_index(
        "ix_box_code_reservations_available",
        "box_code_reservations",
        ["center_id", "used_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_box_code_reservations_available", table_name="box_code_reservations")
    op.drop_table("box_code_reservations")

    op.drop_constraint("uq_intakes_capture_id", "intakes", type_="unique")
    op.drop_column("intakes", "capture_id")
