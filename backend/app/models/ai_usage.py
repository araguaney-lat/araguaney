"""Registro de gasto de IA (Fase 23, task 2).

Una fila por llamada. Se guarda el costo estimado en el momento de producirlo,
no se reconstruye después desde un log: reconstruir es como se pierde la cuenta,
y una cuenta que no se lleva es un tope que no existe.

No guarda el texto del prompt ni la respuesta. Interesa cuánto costó y a qué
capacidad, no qué se dijo; almacenar el contenido metería datos de donantes en
una tabla que nadie está mirando con esa expectativa.
"""

import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base

# Las cuatro capacidades de la fase. Cada una se enciende por separado.
AI_CAPABILITIES = ("text_mapping", "label_ocr", "needs_matching", "national_summary")


class AIUsage(Base):
    __tablename__ = "ai_usage"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    capability = Column(String, nullable=False, index=True)
    model = Column(String, nullable=False)

    input_tokens = Column(Integer, nullable=False, server_default="0")
    output_tokens = Column(Integer, nullable=False, server_default="0")
    cost_usd = Column(Float, nullable=False, server_default="0")

    # Quién y desde dónde: sirve para encontrar el origen de un pico, no para
    # cobrarle a nadie.
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    center_id = Column(UUID(as_uuid=True), ForeignKey("centers.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
