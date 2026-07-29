import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class ProductGtin(Base):
    """Código de barras asociado a un tipo de producto.

    Tabla aparte y no una columna en `product_types` porque un mismo SKU del
    catálogo ("Atún en lata") corresponde a decenas de marcas y presentaciones,
    cada una con su propio GTIN. Con una sola columna, cada captura pisaría a la
    anterior y el catálogo nunca acumularía conocimiento.

    El GTIN es único en toda la tabla: un código de barras identifica un producto
    concreto y no puede apuntar a dos tipos a la vez.
    """

    __tablename__ = "product_type_gtins"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_type_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_types.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    gtin = Column(String, nullable=False, unique=True, index=True)
    # De dónde salió la asociación: 'intake' (capturada por el centro),
    # 'catalog' (migrada de product_types.gtin) o 'seed'.
    source = Column(String, nullable=False, server_default="intake")
    created_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
