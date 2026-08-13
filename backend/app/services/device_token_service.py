from app.models.device_token import DeviceToken
from app.models.user import User
from app.repositories.device_token_repository import DeviceTokenRepository
from app.services.base import BaseService


class DeviceTokenService(BaseService):
    """Alta y baja de los destinos de aviso de una persona."""

    def register(
        self,
        *,
        user: User,
        token: str,
        platform: str,
        app_version: str | None,
    ) -> DeviceToken:
        """Deja el token vivo y apuntando a quien tiene la sesión.

        Un token identifica una instalación, no a una persona, y en un centro el
        teléfono se comparte. Si el token ya existía a nombre de alguien más es
        porque esa persona cerró sesión (o la aplicación no alcanzó a darlo de
        baja) y ahora usa el aparato otra: **se reasigna**. Insertar una fila
        nueva dejaría dos destinos vivos para la misma instalación y la persona
        anterior seguiría recibiendo avisos en un teléfono que ya no tiene.
        """
        repo = DeviceTokenRepository(self.db)
        existing = repo.find_by_token(token)

        if existing is None:
            return repo.save(
                DeviceToken(
                    user_id=user.id,
                    token=token,
                    platform=platform,
                    app_version=app_version,
                )
            )

        existing.user_id = user.id
        existing.platform = platform
        existing.app_version = app_version
        existing.revoked_at = None
        existing.revoked_reason = None
        repo.touch(existing)
        return existing

    def unregister(self, *, user: User, token: str) -> None:
        """Da de baja el token, solo si es de quien lo pide.

        La comprobación de dueño evita que alguien con sesión silencie los
        avisos de otra persona mandando su token. Cuando no coincide no se
        levanta un error: el endpoint responde igual, para no revelar si ese
        token existe.
        """
        repo = DeviceTokenRepository(self.db)
        row = repo.find_active_by_token(token)
        if row is None or row.user_id != user.id:
            return
        repo.revoke(row, reason="logout")
