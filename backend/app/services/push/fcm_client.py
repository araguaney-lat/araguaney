"""Envío a Firebase Cloud Messaging por su API HTTP v1.

Se habla con FCM directamente en vez de usar el SDK de Firebase, por dos
razones. El SDK arrastra dependencias grandes para usar una sola operación
—mandar un mensaje a un token—, y trae su propio manejo de credenciales,
mientras que aquí la credencial ya viene del entorno como cualquier otra.

La autenticación es OAuth2 con cuenta de servicio: se firma un JWT con la llave
privada y se cambia por un access token de una hora. `PyJWT` ya está en el
proyecto y es todo lo que hace falta.
"""

import json
import logging
import time
from dataclasses import dataclass

import httpx
import jwt

from app.config import settings

logger = logging.getLogger(__name__)

_TOKEN_URL = "https://oauth2.googleapis.com/token"
_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
_JWT_LIFETIME_SECONDS = 3600
# Se renueva antes de que caduque: pedir con un token recién vencido costaría un
# 401 y un reintento en mitad de un despacho.
_RENEW_MARGIN_SECONDS = 300


class PushNotConfigured(RuntimeError):
    """Falta la credencial o el interruptor está apagado."""


@dataclass(frozen=True)
class PushResult:
    """Qué pasó con un envío.

    `unregistered` es el caso que más importa: FCM avisa así que ese token dejó
    de existir, y es la única forma de saber que un destino murió. Sin
    distinguirlo, la tabla acumularía direcciones muertas para siempre.
    """

    delivered: bool
    unregistered: bool = False
    error: str | None = None


class FcmClient:
    """Cliente mínimo de FCM. Cachea el access token mientras siga vivo."""

    def __init__(self) -> None:
        self._access_token: str | None = None
        self._expires_at: float = 0.0

    @staticmethod
    def _credentials() -> dict:
        raw = settings.firebase_service_account_json.strip()
        if not raw:
            raise PushNotConfigured("Falta FIREBASE_SERVICE_ACCOUNT_JSON")
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            # Se dice que es ilegible sin volcar el contenido: es una credencial.
            raise PushNotConfigured(
                "FIREBASE_SERVICE_ACCOUNT_JSON no es un JSON válido"
            ) from exc

    async def _get_access_token(self, client: httpx.AsyncClient) -> str:
        if self._access_token and time.time() < self._expires_at:
            return self._access_token

        creds = self._credentials()
        now = int(time.time())
        assertion = jwt.encode(
            {
                "iss": creds["client_email"],
                "scope": _SCOPE,
                "aud": _TOKEN_URL,
                "iat": now,
                "exp": now + _JWT_LIFETIME_SECONDS,
            },
            creds["private_key"],
            algorithm="RS256",
        )

        response = await client.post(
            _TOKEN_URL,
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": assertion,
            },
        )
        response.raise_for_status()
        payload = response.json()

        self._access_token = payload["access_token"]
        self._expires_at = time.time() + payload.get("expires_in", 3600) - _RENEW_MARGIN_SECONDS
        return self._access_token

    async def send(self, *, token: str, title: str, body: str, data: dict[str, str]) -> PushResult:
        """Manda un aviso a un token. No lanza por un destino muerto.

        Un token inexistente es un hecho normal —alguien desinstaló la
        aplicación— y no un error del despacho: se devuelve para que quien
        llama lo dé de baja y siga con los demás.
        """
        creds = self._credentials()
        project_id = creds["project_id"]
        url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"

        async with httpx.AsyncClient(timeout=10) as client:
            access_token = await self._get_access_token(client)
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                json={
                    "message": {
                        "token": token,
                        "notification": {"title": title, "body": body},
                        # Los datos viajan aparte de la notificación para que la
                        # aplicación pueda abrir la pantalla correcta al tocarla.
                        "data": data,
                    }
                },
            )

        if response.status_code == 200:
            return PushResult(delivered=True)

        # 404 con UNREGISTERED, y 400 con INVALID_ARGUMENT sobre el token, son
        # las dos formas en que FCM dice "ese destino ya no existe".
        detail = response.text[:300]
        if response.status_code == 404 or "UNREGISTERED" in detail:
            return PushResult(delivered=False, unregistered=True, error=detail)

        return PushResult(delivered=False, error=f"{response.status_code}: {detail}")
