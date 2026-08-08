"""Versión mínima soportada del cliente nativo.

La web se despliega junto al backend, así que un cambio incompatible se coordina
en un PR. La app instalada no: puede estar corriendo el binario de hace meses,
y en un centro sin buena conexión nadie la actualiza. Este endpoint le da a la
app un lugar donde preguntar "¿sigo sirviendo?" y mostrar "actualiza para
continuar" en vez de romperse sola contra un contrato que cambió.

Es público y cacheable en el edge: no toca la base, no lleva datos por usuario y
se puede golpear sin sesión. Los valores viven en el entorno (los fija quien
opera cuando publica una versión de la app), no en este repositorio.
"""

from fastapi import APIRouter, Request
from fastapi.responses import Response

from app.config import settings
from app.schemas.client import ClientVersionOut
from app.utils.rate_limit import limiter

router = APIRouter(tags=["client"])

_PUBLIC_CACHE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"


@router.get("/client/version", response_model=ClientVersionOut)
@limiter.limit("60/minute")
def client_version(request: Request):
    payload = ClientVersionOut(
        min_supported=settings.min_supported_client_version,
        latest=settings.latest_client_version,
    )
    return Response(
        content=payload.model_dump_json(),
        media_type="application/json",
        headers={"Cache-Control": _PUBLIC_CACHE},
    )
