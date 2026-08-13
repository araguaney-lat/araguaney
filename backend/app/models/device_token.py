import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database import Base


class DeviceToken(Base):
    """Dónde entregar un aviso a la aplicación instalada.

    **La unicidad es por token, no por usuario ni por dispositivo.** El teléfono
    de un centro se comparte: durante una jornada entran y salen varias personas
    en el mismo aparato. Si la fila fuera por dispositivo, registrar a la
    siguiente pisaría a la anterior; si fuera por usuario, alguien con dos
    teléfonos recibiría el aviso en uno solo. Un token identifica la instalación
    para un destinatario, y es lo que FCM entiende.

    De ahí se sigue una consecuencia que importa en un dispositivo compartido:
    al cerrar sesión, la aplicación **da de baja su token**. Sin eso, quien use
    el aparato después recibiría los avisos de la persona anterior.

    Se guarda `revoked_at` en vez de borrar la fila. Un token que FCM rechaza
    por inexistente y uno que alguien dio de baja al cerrar sesión son hechos
    distintos, y distinguirlos es lo que permite ver si el despacho está
    perdiendo destinos.
    """

    __tablename__ = "device_tokens"
    __table_args__ = (
        # El mismo token no puede estar vivo dos veces. La restricción es del
        # esquema y no una comprobación previa: dos registros simultáneos desde
        # la misma instalación tienen una carrera en medio.
        UniqueConstraint("token", name="uq_device_tokens_token"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # El registro de FCM para esa instalación. Es largo y opaco; no se
    # interpreta ni se recorta.
    token = Column(String, nullable=False)

    # `android` | `ios`. Sirve para diagnosticar, no para decidir el envío:
    # FCM v1 entrega por token sin que el servidor sepa la plataforma.
    platform = Column(String, nullable=False)

    # Versión de la aplicación que registró el token. Cuando un aviso deja de
    # llegar, saber desde qué binario se registró ahorra media investigación.
    app_version = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_seen_at = Column(DateTime(timezone=True), nullable=True)

    # Fecha en que dejó de servir, y por qué. Nulo mientras está vivo.
    #
    # **No hay una columna `is_active` aparte.** Sería estado redundante que
    # puede contradecir a esta fecha, y además una bandera booleana con
    # `server_default` se guarda como texto en SQLite, donde corren las pruebas:
    # el filtro dejaría de encontrar filas que en Postgres sí encuentra, y la
    # prueba mediría algo distinto de lo que corre en producción. Un `IS NULL`
    # se comporta igual en los dos dialectos.
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    # `logout` (la persona cerró sesión) | `unregistered` (FCM lo rechazó).
    revoked_reason = Column(String, nullable=True)

    @property
    def is_active(self) -> bool:
        """Comodidad de lectura. No es columna: la verdad es `revoked_at`."""
        return self.revoked_at is None
