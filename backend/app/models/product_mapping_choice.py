import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from app.database import Base


class ProductMappingChoice(Base):
    """El par (texto libre, producto elegido) que hoy no queda en ningún lado.

    Fase 23 pide un conjunto de ~100 casos reales por capacidad antes de poder
    encender el mapeo de texto con confianza; hoy no existe ninguno, porque
    nada persiste qué producto termina eligiendo una coordinación para el
    renglón que escribió quien dona. Esta tabla existe solo para eso: no
    decide nada, no cambia ningún flujo, únicamente acumula la verdad que
    `evals/run.py` necesita para dejar de medir contra casos escritos a mano.

    `suggested_product_type_ids` guarda lo que la IA propuso (vacío si nunca
    hubo sugerencia, p. ej. quien capturó buscó o creó el producto a mano):
    sin eso no se puede saber después si el modelo acertó en el top-1, en el
    top-3, o si de plano no tenía nada que ver.
    """

    __tablename__ = "product_mapping_choices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    free_text = Column(String, nullable=False)
    suggested_product_type_ids = Column(JSONB, nullable=False, default=list)

    # SET NULL, no CASCADE: si el producto elegido se archiva después, el
    # renglón histórico sigue contando como una elección real, solo que ya sin
    # decir cuál. Perder la fila perdería la métrica de ese día.
    chosen_product_type_id = Column(
        UUID(as_uuid=True), ForeignKey("product_types.id", ondelete="SET NULL"), nullable=True,
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    center_id = Column(UUID(as_uuid=True), ForeignKey("centers.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
