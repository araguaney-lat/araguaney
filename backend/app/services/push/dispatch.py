"""Decide a quién avisar y limpia los destinos que ya no existen.

Separado del cliente de FCM a propósito: aquí vive la regla de dominio (quién
recibe qué) y allá el protocolo. Probar la regla no debería necesitar una red.

**Un aviso nunca tumba la operación que lo provoca.** Una revisión de riesgo se
abre, un envío se marca entregado y un mensaje se guarda, aunque el aviso falle
o Firebase esté caído. Por eso el despacho va encolado y por eso este módulo se
traga sus errores: la promesa del dominio es el hecho, no la notificación.
"""

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.config import settings
from app.repositories.device_token_repository import DeviceTokenRepository
from app.services.push.fcm_client import FcmClient, PushNotConfigured

logger = logging.getLogger(__name__)


async def notify_user(
    db: Session,
    *,
    user_id: UUID,
    title: str,
    body: str,
    data: dict[str, str] | None = None,
) -> int:
    """Manda un aviso a todos los dispositivos vivos de una persona.

    Devuelve cuántos se entregaron. Los que FCM rechaza por inexistentes se dan
    de baja aquí mismo: es el único momento en que el servidor se entera de que
    un destino murió, y desaprovecharlo dejaría la tabla llenándose de
    direcciones muertas que se reintentan para siempre.
    """
    if not settings.push_enabled:
        return 0

    repo = DeviceTokenRepository(db)
    targets = repo.active_for_user(user_id)
    if not targets:
        return 0

    client = FcmClient()
    delivered = 0

    for row in targets:
        try:
            result = await client.send(
                token=row.token, title=title, body=body, data=data or {}
            )
        except PushNotConfigured:
            # Sin credencial no hay nada que reintentar por dispositivo: se sale.
            logger.warning("Push habilitado sin credencial configurada")
            return delivered
        except Exception:
            # Un fallo de red no dice nada del token, así que no se da de baja.
            logger.exception("Fallo al enviar el aviso a un dispositivo")
            continue

        if result.delivered:
            delivered += 1
            repo.touch(row)
        elif result.unregistered:
            repo.revoke(row, reason="unregistered")

    return delivered
