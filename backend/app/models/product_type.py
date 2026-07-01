import uuid
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

PRODUCT_CATEGORIES = (
    "MEDICINE", "MEDICAL_SUPPLY", "FOOD", "WATER",
    "HYGIENE", "TOOL", "RESCUE_GEAR", "OTHER",
)


class ProductType(Base):
    __tablename__ = "product_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    unspsc_code = Column(String, nullable=True)
    inn_name = Column(String, nullable=True)
    brand = Column(String, nullable=True)
    strength = Column(String, nullable=True)
    form = Column(String, nullable=True)
    gtin = Column(String, nullable=True)
    default_unit = Column(String, nullable=True)
    is_controlled = Column(Boolean, nullable=False, server_default="false")
    min_shelf_life_days = Column(Integer, nullable=True)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
