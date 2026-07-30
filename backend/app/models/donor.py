import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base


class Donor(Base):
    """Donante identificado. Anónimo sigue siendo el default: un intake sin
    `donor_id` es una donación anónima, que es la norma del dominio.

    Esquema compartido con el pre-registro de donaciones (Fase 18): `source`
    distingue quién capturó el registro.

    - `self`   — el donante se registró solo y verificó su email. `center_id` NULL.
    - `center` — lo capturó un centro durante el intake. `center_id` es su dueño.

    La unicidad de email es **por origen** (índices parciales en la migración):
    global entre los de autoservicio, y por `(email, center_id)` entre los
    capturados. Un único global filtraría la cartera de donantes de un centro a
    otro por canal lateral: bastaría intentar registrar un email para saber si
    otro centro ya lo tiene.
    """

    __tablename__ = "donors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    donor_type = Column(String, nullable=False, server_default="fisica")  # fisica | moral
    source = Column(String, nullable=False, server_default="center")      # self | center
    center_id = Column(
        UUID(as_uuid=True), ForeignKey("centers.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # Persona física: la persona. Persona moral: quien representa y lleva la donación.
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    legal_name = Column(String, nullable=True)   # razón social, solo persona moral

    # Opcionales en física capturada; obligatorios en moral (lo valida el schema).
    email = Column(String, nullable=True, index=True)
    phone = Column(String, nullable=True)

    # Solo aplican al autoservicio (source='self'); la captura de centro no verifica.
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    email_verify_token_hash = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True, onupdate=func.now())
