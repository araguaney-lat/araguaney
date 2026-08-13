"""Comprueba que la credencial de FCM sirve, sin necesidad de una app.

Existe porque "probar el push" son tres cosas distintas y solo una necesita un
teléfono:

1. La lógica alrededor del envío. La cubre la suite de pruebas.
2. Que la credencial funcione y que FCM nos acepte. **Esto.**
3. Que un aviso llegue a un dispositivo. Necesita la aplicación instalada.

La comprobación se apoya en que el error de FCM distingue los dos fallos que
importan. Con una credencial mala, el intercambio OAuth2 falla antes de llegar a
FCM. Con una credencial buena y un token inventado, FCM responde que ese token
no existe, y esa respuesta es un éxito disfrazado: significa que el JWT se
firmó, que Google lo aceptó y que FCM procesó la petición.

**No manda ningún aviso real.** El token es deliberadamente inválido, así que no
hay un teléfono al otro lado que pueda recibir nada.

Uso, dentro del servicio del backend, que es donde vive la credencial y donde ya
están las dependencias:

    railway ssh --service <servicio-backend>
    python -m scripts.check_push_credential

No confundir con `railway run`, que ejecuta el comando en la máquina de quien lo
teclea con las variables inyectadas: eso pediría tener instalado aquí todo el
backend.

Sirve igual para verificar una rotación de llave: si la nueva no está bien
puesta, esto lo dice en segundos en vez de descubrirlo cuando un aviso no llegue.
"""

import asyncio
import sys

from app.config import settings
from app.services.push.fcm_client import FcmClient, PushNotConfigured

# Un token que FCM va a rechazar sí o sí. No imita la forma de uno real a
# propósito: lo que se busca es que FCM conteste **algo** sobre el token, porque
# para contestar eso ya tuvo que aceptar la credencial.
_TOKEN_INVENTADO = "credential-check-" + "x" * 140


async def main() -> int:
    if not settings.firebase_service_account_json.strip():
        print("✗ FIREBASE_SERVICE_ACCOUNT_JSON está vacía en este entorno.")
        return 1

    if not settings.push_enabled:
        # No impide la comprobación: el interruptor gobierna el despacho del
        # dominio, no este diagnóstico. Pero conviene decirlo, porque explica
        # por qué no sale ningún aviso aunque la credencial esté bien.
        print("· PUSH_ENABLED está en false: los eventos no despacharán todavía.")

    try:
        resultado = await FcmClient().send(
            token=_TOKEN_INVENTADO,
            title="Comprobación de credencial",
            body="Este mensaje no llega a ningún dispositivo.",
            data={},
        )
    except PushNotConfigured as exc:
        print(f"✗ La credencial no se puede leer: {exc}")
        return 1
    except Exception as exc:
        # Un fallo aquí es del intercambio OAuth2 o de la red. Si dice 401 o
        # 403, la credencial no sirve o le falta el rol de mensajería.
        print(f"✗ No se pudo hablar con Google: {type(exc).__name__}: {exc}")
        return 1

    if resultado.unregistered:
        print("✓ La credencial funciona: Google la aceptó y FCM procesó la petición.")
        print("  FCM rechazó el token de prueba, que es exactamente lo esperado.")
        print("  Falta solo la última capa: que un dispositivo real registre su token.")
        return 0

    if resultado.delivered:
        # No debería pasar con un token inventado; si pasa, algo entendemos mal.
        print("? FCM aceptó un token que no existe. Revisa antes de confiar en esto.")
        return 1

    print(f"✗ FCM respondió un error que no esperábamos: {resultado.error}")
    return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
