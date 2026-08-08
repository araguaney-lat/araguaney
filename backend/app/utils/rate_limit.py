"""Rate limiting: por usuario cuando hay sesión, por IP cuando no.

Limitar solo por IP rompe en dos escenarios que este proyecto sí tiene:

- **CGNAT móvil.** Varias personas de la misma operadora comparten una IPv4
  pública. Con clave por IP, el intake de una deja sin cupo a las demás. Es el
  caso que más importa de cara a la app nativa (Fase futura), donde el tráfico
  llega por Cloudflare con la IP real del cliente.
- **Los route handlers de Vercel.** Llaman al backend desde el servidor de
  Vercel, así que todas esas peticiones comparten la IP de egreso de Vercel;
  con clave por IP caerían en la misma cubeta. Como reenvían el `Authorization`
  del usuario, la clave por `sub` las separa correctamente.

Cuando la petición trae un token válido se limita por el usuario del token; las
rutas anónimas (login, público) siguen por IP, que es donde tiene sentido. La
firma del token se verifica: sin eso, un cliente podría inventar un `sub` para
repartir su carga entre muchas cubetas y evadir el límite.

El contador vive en Redis cuando hay (`redis_url`), para que sobreviva a un
deploy y se comparta entre réplicas; sin Redis cae a memoria del proceso. Si
Redis está configurado pero inalcanzable, `in_memory_fallback_enabled` deja que
el proceso siga limitando en memoria en vez de tumbar cada petición: falla
abierto hacia el servicio, en línea con la política de observabilidad.
"""

import jwt
from slowapi import Limiter

from app.config import settings
from app.utils.cloudflare import get_client_ip


def rate_limit_key(request) -> str:
    """Clave de rate limiting: `user:<sub>` con token válido, `ip:<ip>` si no."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[len("Bearer "):].strip()
        try:
            payload = jwt.decode(
                token, settings.secret_key, algorithms=[settings.algorithm]
            )
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except jwt.PyJWTError:
            # Token vencido, mal firmado o basura: se limita por IP, sin fallar.
            pass
    return f"ip:{get_client_ip(request)}"


limiter = Limiter(
    key_func=rate_limit_key,
    storage_uri=settings.redis_url or "memory://",
    in_memory_fallback_enabled=True,
)
