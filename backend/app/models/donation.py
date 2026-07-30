import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Donation(Base):
    """Donación pre-registrada por la persona donante, antes de llevarla al centro.

    Ciclo: PENDING_EMAIL → REGISTERED → RECEIVED, más CANCELLED (lo cancela el
    donante) y EXPIRED (purga de las no confirmadas).

    El centro y la campaña que elige el donante son **intención, no destino**:
    cualquier centro puede recibir el QR, y la asociación vinculante a campaña
    la hace el intake al recibir. Por eso hay dos columnas de centro.
    """

    __tablename__ = "donations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, nullable=False, unique=True, index=True)  # DN-XXXX → QR

    donor_id = Column(
        UUID(as_uuid=True), ForeignKey("donors.id", ondelete="CASCADE"), nullable=False, index=True
    )

    intended_center_id = Column(
        UUID(as_uuid=True), ForeignKey("centers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    intended_campaign_id = Column(
        UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True
    )
    received_center_id = Column(
        UUID(as_uuid=True), ForeignKey("centers.id", ondelete="SET NULL"), nullable=True, index=True
    )

    status = Column(String, nullable=False, server_default="PENDING_EMAIL")

    # El enlace de gestión es por donación, no por donante: una persona puede
    # tener varias donaciones y cada una se gestiona por separado.
    manage_token_hash = Column(String, nullable=True, index=True)
    manage_token_expires_at = Column(DateTime(timezone=True), nullable=True)

    # Se liga al recibir: trazabilidad donante → cajas → tarima → envío.
    intake_id = Column(
        UUID(as_uuid=True), ForeignKey("intakes.id", ondelete="SET NULL"), nullable=True
    )

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    registered_at = Column(DateTime(timezone=True), nullable=True)
    received_at = Column(DateTime(timezone=True), nullable=True)

    donor = relationship("Donor", lazy="joined")
    items = relationship(
        "DonationItem", cascade="all, delete-orphan", lazy="selectin", back_populates="donation"
    )


class DonationItem(Base):
    """Renglón de la donación: del catálogo o texto libre, nunca ambos.

    El texto libre existe porque un particular no conoce el catálogo INN. El
    centro lo mapea a un `product_type` durante la recepción.
    """

    __tablename__ = "donation_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donation_id = Column(
        UUID(as_uuid=True), ForeignKey("donations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    product_type_id = Column(
        UUID(as_uuid=True), ForeignKey("product_types.id", ondelete="SET NULL"), nullable=True
    )
    free_text = Column(String, nullable=True)

    quantity = Column(Integer, nullable=False)
    unit = Column(String, nullable=False)

    added_by = Column(String, nullable=False, server_default="donor")   # donor | center
    # Null hasta el doble check del centro.
    reception_status = Column(String, nullable=True)  # RECEIVED | MISSING | REJECTED

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    donation = relationship("Donation", back_populates="items")


class DonationPhoto(Base):
    __tablename__ = "donation_photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donation_id = Column(
        UUID(as_uuid=True), ForeignKey("donations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    storage_key = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    uploaded_by = Column(String, nullable=False, server_default="donor")  # donor | center
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class DonationEvent(Base):
    """Auditoría de cambios de estado. `user_id` nulo = acción del donante."""

    __tablename__ = "donation_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    donation_id = Column(
        UUID(as_uuid=True), ForeignKey("donations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    note = Column(String, nullable=True)
    ts = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
