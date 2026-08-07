"""Recepción en destino (Fase 22).

Vive aparte del inventario a propósito. Lo despachado sigue congelado en
`SHIPPED`: enviado y recibido son dos hechos distintos, y el sistema guarda los
dos en vez de reescribir el primero con el segundo. Esa separación es lo que
permite medir merma; si la recepción mutara las cajas, la diferencia entre lo
que salió y lo que llegó dejaría de existir en el momento de registrarla.
"""

import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base

RECEPTION_OUTCOMES = ("RECEIVED", "MISSING", "DAMAGED", "RETAINED_CUSTOMS")


class ShipmentReception(Base):
    """Una por envío. El unique en `shipment_id` lo sostiene la base."""

    __tablename__ = "shipment_receptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    shipment_id = Column(
        UUID(as_uuid=True), ForeignKey("shipments.id", ondelete="CASCADE"),
        nullable=False, unique=True,
    )
    received_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    received_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    # Quién recibió del otro lado. Texto libre: el consignatario no tiene cuenta
    # en el sistema y forzar una entidad para nombrarlo sería inventar burocracia.
    consignee_name = Column(String, nullable=True)
    notes = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())


class ReceptionLine(Base):
    """Una por caja del envío, pre-llenada como RECEIVED.

    El formulario optimiza para el caso normal: la merma es la minoría, así que
    solo se marcan las excepciones.
    """

    __tablename__ = "reception_lines"
    __table_args__ = (
        UniqueConstraint("reception_id", "box_id", name="uq_reception_lines_reception_box"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reception_id = Column(
        UUID(as_uuid=True), ForeignKey("shipment_receptions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    box_id = Column(
        UUID(as_uuid=True), ForeignKey("boxes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    outcome = Column(String, nullable=False, server_default="RECEIVED")
    note = Column(String, nullable=True)


class ReceptionPalletWeight(Base):
    """Peso bruto recibido por tarima, opcional.

    Su diferencia contra `pallets.gross_weight_kg` (Fase 21) alimenta las
    incidencias de tipo WEIGHT_DIFF.
    """

    __tablename__ = "reception_pallet_weights"
    __table_args__ = (
        UniqueConstraint("reception_id", "pallet_id", name="uq_reception_weights_reception_pallet"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reception_id = Column(
        UUID(as_uuid=True), ForeignKey("shipment_receptions.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    pallet_id = Column(
        UUID(as_uuid=True), ForeignKey("pallets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    gross_weight_kg = Column(Numeric(10, 3), nullable=False)
