import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class RiskReview(Base):
    """Revisión de una captura que levantó una bandera (Fase 20).

    Nace de una sola idea: el almacén no se detiene. Cuando llega una donación
    de volumen atípico, el camión ya está en la puerta y quien captura es un
    voluntario. Bloquear ahí traslada el costo a la operación en plena
    emergencia y no recupera nada — si la persona se negó a identificarse, ya se
    fue. Entonces la captura entra siempre, y lo que queda abierto es esta
    revisión, que un coordinador o el national_admin resuelve después.

    Dos motivos:

    - `ATYPICAL_VOLUME` — la donación superó el umbral. El donante quedó
      identificado; esto es un aviso para que se mire con la guía de banderas
      rojas a la mano.
    - `ANONYMOUS_EXCEPTION` — superó el umbral y la persona no quiso o no pudo
      identificarse. La negativa es en sí una bandera roja, así que el motivo
      que escribió quien capturó es la pieza central del expediente.

    Quien capturó no resuelve su propia revisión: ese es todo el punto de
    escalar. El `national_admin` es la excepción, porque es el escalamiento
    final — si él no pudiera, la revisión quedaría muerta.
    """

    __tablename__ = "risk_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    center_id = Column(
        UUID(as_uuid=True), ForeignKey("centers.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    intake_id = Column(
        UUID(as_uuid=True), ForeignKey("intakes.id", ondelete="CASCADE"),
        nullable=True, index=True,
    )

    kind = Column(String, nullable=False)      # ATYPICAL_VOLUME | ANONYMOUS_EXCEPTION
    status = Column(String, nullable=False, server_default="PENDING")

    # Lo que escribió quien capturó al pedir la excepción.
    reason = Column(Text, nullable=True)
    # Volumen que disparó la bandera, para que quien revisa no tenga que ir a
    # reconstruirlo desde las cajas.
    boxes = Column(String, nullable=True)

    created_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    reviewed_by_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_note = Column(Text, nullable=True)
