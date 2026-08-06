"""Fase 22: trazabilidad extendida — hitos, recepción en destino e incidencias

La trazabilidad terminaba en SHIPPED: el envío salía y el sistema se quedaba
ciego justo en el tramo donde más importa, que es el que cruza una aduana.

Tres piezas, una sola migración porque comparten el mismo hecho de dominio:

- `shipment_events.milestone`: un hito es un evento con from_status = to_status.
  Registra el suceso sin inventar estados intermedios, así que la máquina de
  estados no crece por cada paso logístico que alguien quiera anotar.
- `shipment_receptions` + `reception_lines`: qué llegó de verdad, caja por caja.
  Vive aparte del inventario a propósito. Lo despachado sigue congelado: enviado
  y recibido son dos hechos distintos y el sistema guarda ambos, en vez de
  reescribir el primero con el segundo.
- `incidents`: cada faltante, daño, retención o diferencia de peso con dueño y
  resolución, en lugar de un mensaje suelto.

Revision ID: 041
Revises: 040
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "041"
down_revision = "040"
branch_labels = None
depends_on = None

SHIPMENT_STATUSES = ("OPEN", "CLOSED", "SHIPPED", "DELIVERED", "RECONCILED")

MILESTONES = (
    "DEPARTED_WAREHOUSE",
    "ARRIVED_AIRPORT",
    "LOADED_AIRCRAFT",
    "DEPARTED_FLIGHT",
    "ARRIVED_DESTINATION",
    "CUSTOMS_CLEARED",
    "DELIVERED_CONSIGNEE",
)

RECEPTION_OUTCOMES = ("RECEIVED", "MISSING", "DAMAGED", "RETAINED_CUSTOMS")

INCIDENT_TYPES = ("WEIGHT_DIFF", "MISSING_BOX", "DAMAGE", "CUSTOMS_RETENTION", "OTHER")
INCIDENT_STATUSES = ("OPEN", "RESOLVED")


def _in(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN (" + ", ".join(f"'{v}'" for v in values) + ")"


def upgrade() -> None:
    # El envío ya no muere en SHIPPED.
    op.drop_constraint("ck_shipments_status", "shipments", type_="check")
    op.create_check_constraint(
        "ck_shipments_status", "shipments", _in("status", SHIPMENT_STATUSES)
    )
    op.add_column("shipments", sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("shipments", sa.Column("reconciled_at", sa.DateTime(timezone=True), nullable=True))

    # Hitos: nullable porque la inmensa mayoría de los eventos son transiciones
    # de estado y no hitos logísticos.
    op.add_column("shipment_events", sa.Column("milestone", sa.String(), nullable=True))
    op.create_check_constraint(
        "ck_shipment_events_milestone",
        "shipment_events",
        f"milestone IS NULL OR {_in('milestone', MILESTONES)}",
    )

    # Una recepción por envío en el MVP: el unique lo garantiza en la base y no
    # en una validación que alguien pueda saltarse desde otro camino.
    op.create_table(
        "shipment_receptions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("shipment_id", UUID(as_uuid=True),
                  sa.ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("received_by_user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("consignee_name", sa.String(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "reception_lines",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("reception_id", UUID(as_uuid=True),
                  sa.ForeignKey("shipment_receptions.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("box_id", UUID(as_uuid=True),
                  sa.ForeignKey("boxes.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("outcome", sa.String(), nullable=False, server_default="RECEIVED"),
        sa.Column("note", sa.String(), nullable=True),
        sa.CheckConstraint(_in("outcome", RECEPTION_OUTCOMES), name="ck_reception_lines_outcome"),
        sa.UniqueConstraint("reception_id", "box_id", name="uq_reception_lines_reception_box"),
    )

    # Peso bruto recibido por tarima. Tabla propia y no JSON: la diferencia
    # contra `pallets.gross_weight_kg` se consulta y se agrega.
    op.create_table(
        "reception_pallet_weights",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("reception_id", UUID(as_uuid=True),
                  sa.ForeignKey("shipment_receptions.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("pallet_id", UUID(as_uuid=True),
                  sa.ForeignKey("pallets.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("gross_weight_kg", sa.Numeric(10, 3), nullable=False),
        sa.UniqueConstraint("reception_id", "pallet_id", name="uq_reception_weights_reception_pallet"),
        sa.CheckConstraint("gross_weight_kg > 0", name="ck_reception_weights_positive"),
    )

    op.create_table(
        "incidents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("shipment_id", UUID(as_uuid=True),
                  sa.ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("pallet_id", UUID(as_uuid=True),
                  sa.ForeignKey("pallets.id", ondelete="SET NULL"), nullable=True),
        sa.Column("box_id", UUID(as_uuid=True),
                  sa.ForeignKey("boxes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="OPEN"),
        sa.Column("created_by_user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resolved_by_user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("resolution_note", sa.String(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
        sa.CheckConstraint(_in("type", INCIDENT_TYPES), name="ck_incidents_type"),
        sa.CheckConstraint(_in("status", INCIDENT_STATUSES), name="ck_incidents_status"),
    )
    op.create_index("ix_incidents_status", "incidents", ["status"])


def downgrade() -> None:
    op.drop_index("ix_incidents_status", table_name="incidents")
    op.drop_table("incidents")
    op.drop_table("reception_pallet_weights")
    op.drop_table("reception_lines")
    op.drop_table("shipment_receptions")

    op.drop_constraint("ck_shipment_events_milestone", "shipment_events", type_="check")
    op.drop_column("shipment_events", "milestone")

    op.drop_column("shipments", "reconciled_at")
    op.drop_column("shipments", "delivered_at")

    # Los envíos que ya pasaron de SHIPPED no caben en el CHECK viejo: se
    # devuelven a SHIPPED, que es el último estado que ese vocabulario conoce.
    op.execute("UPDATE shipments SET status = 'SHIPPED' WHERE status IN ('DELIVERED', 'RECONCILED')")
    op.drop_constraint("ck_shipments_status", "shipments", type_="check")
    op.create_check_constraint(
        "ck_shipments_status", "shipments", _in("status", ("OPEN", "CLOSED", "SHIPPED"))
    )
