import uuid
from sqlalchemy import Boolean, Column, Date, Numeric, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    destination_country = Column(String(2), nullable=True)   # ISO 3166-1 alpha-2
    description = Column(String, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default="true")
    is_general = Column(Boolean, nullable=False, server_default="false")
    weight_goal_kg = Column(Numeric(10, 3), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
