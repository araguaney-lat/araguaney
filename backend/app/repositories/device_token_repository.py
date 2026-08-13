from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select

from app.models.device_token import DeviceToken
from app.repositories.base import BaseRepository


class DeviceTokenRepository(BaseRepository[DeviceToken]):
    """Acceso a los destinos de aviso.

    No extiende `TenantRepository` porque un token pertenece a una persona, no a
    un centro: la administración nacional no tiene centro y también recibe
    avisos. El alcance lo da el `user_id`, y siempre viene de la sesión, nunca
    de la petición.
    """

    model = DeviceToken

    def find_active_by_token(self, token: str) -> DeviceToken | None:
        return self.db.execute(
            select(DeviceToken).where(
                DeviceToken.token == token, DeviceToken.revoked_at.is_(None)
            )
        ).scalar_one_or_none()

    def find_by_token(self, token: str) -> DeviceToken | None:
        """Incluye los dados de baja: reactivar es más barato que insertar de nuevo."""
        return self.db.execute(
            select(DeviceToken).where(DeviceToken.token == token)
        ).scalar_one_or_none()

    def active_for_user(self, user_id: UUID) -> list[DeviceToken]:
        return list(
            self.db.execute(
                select(DeviceToken).where(
                    DeviceToken.user_id == user_id, DeviceToken.revoked_at.is_(None)
                )
            ).scalars()
        )

    def save(self, row: DeviceToken) -> DeviceToken:
        self.db.add(row)
        self.db.flush()
        return row

    def revoke(self, row: DeviceToken, reason: str) -> None:
        """Marca en vez de borrar.

        Un token que alguien dio de baja al cerrar sesión y uno que FCM rechazó
        por inexistente son hechos distintos; distinguirlos es lo que permite
        ver después si el despacho está perdiendo destinos.
        """
        row.revoked_at = datetime.now(timezone.utc)
        row.revoked_reason = reason

    def touch(self, row: DeviceToken) -> None:
        row.last_seen_at = datetime.now(timezone.utc)
