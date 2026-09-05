import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class ProductAlias(Base):
    """Otro nombre por el que alguien pide el mismo producto.

    Tabla aparte y no una columna, por la misma razón que `product_type_gtins`:
    un producto tiene varios nombres —"cobija", "frazada", "manta"— y una sola
    columna haría que cada nombre nuevo pisara al anterior, así que el catálogo
    nunca acumularía lo que ya aprendió.

    **Global, nunca por centro.** Un alias es un hecho del idioma: "frazada"
    significa lo mismo en Monterrey que en Caracas. Tenerlo por centro
    fragmentaría el idioma sin ganar nada y obligaría a cada centro a redescubrir
    lo que otro ya sabe.

    El alias se guarda **dos veces**: `alias` tal como se escribió, para poder
    mostrarlo y editarlo, y `normalized` ya en minúsculas y sin acentos, que es
    lo que se compara. Sin la segunda, el buscador tendría que normalizar en SQL
    —donde `unaccent` es una extensión de Postgres que SQLite no tiene— y la
    prueba dejaría de vigilar la consulta que corre en producción.
    """

    __tablename__ = "product_aliases"
    __table_args__ = (
        # El mismo texto puede apuntar a productos distintos ("aspirina" a
        # varias presentaciones), pero repetirlo en el mismo producto solo
        # inflaría la tabla.
        UniqueConstraint("product_type_id", "normalized", name="uq_alias_per_product"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_type_id = Column(
        UUID(as_uuid=True),
        ForeignKey("product_types.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    alias = Column(String, nullable=False)
    normalized = Column(String, nullable=False, index=True)
    # De dónde salió: 'seed' (sembrado con el catálogo), 'manual' (lo agregó la
    # administración nacional) o 'learned' (graduado de elecciones reales de
    # captura). El origen importa para poder revisar y revertir: un alias
    # aprendido de lo que la gente teclea es también un camino de escritura
    # desde texto de usuario hacia lo que el sistema propone.
    source = Column(String, nullable=False, server_default="seed")
    created_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
