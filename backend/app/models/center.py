import uuid
from sqlalchemy import Boolean, Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class Center(Base):
    __tablename__ = "centers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    contact_name = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    country_code = Column(String(2), nullable=True)   # ISO 3166-1 alpha-2
    # Identidad del centro como emisor de documentos de transporte (Fase 21).
    # La captura el national_admin y Araguaney solo la imprime: no se valida el
    # formato, porque un RFC, un RIF y un EIN no se parecen en nada.
    legal_name = Column(String, nullable=True)
    tax_id = Column(String, nullable=True)
    state_name = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
