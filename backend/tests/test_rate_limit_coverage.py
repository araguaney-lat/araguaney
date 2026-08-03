"""Cobertura de rate limiting sobre las rutas registradas.

La convención del proyecto (CLAUDE.md, sección 10) pide `@limiter.limit()` en
todo endpoint público o autenticado. Una convención que solo vive en un documento
se rompe sin que nadie lo note: cuatro rutas se habían quedado sin límite, entre
ellas una pública que consulta la base en cada visita.

Este test recorre las rutas reales de la aplicación y falla cuando aparece una
sin límite que no esté en la lista de excepciones declaradas. La lista existe
para que una excepción sea una decisión escrita y no un olvido.
"""

from app.main import app
from app.utils.rate_limit import limiter

# Rutas que van sin límite a propósito. Cada entrada necesita su razón.
EXEMPT = {
    # La plataforma golpea /health para decidir si el contenedor está vivo: un
    # límite que la bloquee convierte un pico de tráfico en un reinicio en bucle.
    # Puede permitírselo porque devuelve una constante, sin base y sin Redis.
    "health",
}

# Rutas que FastAPI registra por su cuenta y no son endpoints del proyecto.
_FRAMEWORK = {"swagger_ui_html", "openapi", "redoc_html", "swagger_ui_redirect"}


def _limited_endpoints() -> set[str]:
    """Nombres de función que slowapi tiene marcados como limitados."""
    marked = getattr(limiter, "_Limiter__marked_for_limiting")
    return {qualified.rsplit(".", 1)[-1] for qualified in marked}


def _walk(routes):
    """Recorre las rutas reales, incluidas las que cuelgan de un router incluido.

    Esta versión de FastAPI **no aplana** los routers en `app.routes`: deja un
    envoltorio por `include_router` y las rutas verdaderas quedan dentro, en
    `original_router`. Un recorrido ingenuo ve dos rutas y da por buena una
    aplicación con ciento cuarenta y ocho sin revisar.
    """
    for route in routes:
        included = getattr(route, "original_router", None)
        if included is not None:
            yield from _walk(included.routes)
            continue
        if getattr(route, "endpoint", None) is not None:
            yield route


def _project_routes():
    for route in _walk(app.routes):
        name = route.endpoint.__name__
        if name in _FRAMEWORK:
            continue
        if not getattr(route.endpoint, "__module__", "").startswith("app."):
            continue
        yield route, name


def test_every_route_is_rate_limited_or_explicitly_exempt():
    limited = _limited_endpoints()

    unlimited = sorted(
        f"{sorted(route.methods or [])} {route.path} ({name})"
        for route, name in _project_routes()
        if name not in limited and name not in EXEMPT
    )

    assert not unlimited, (
        "Estas rutas no tienen rate limit ni excepción declarada:\n  "
        + "\n  ".join(unlimited)
    )


def test_the_exemption_list_stays_short():
    """Una lista de excepciones que crece es la convención muriendo despacio."""
    assert len(EXEMPT) <= 3


def test_exempt_routes_still_exist():
    """Una excepción para una ruta borrada esconde la siguiente que se agregue."""
    names = {name for _, name in _project_routes()}
    assert EXEMPT <= names


def test_the_public_job_health_endpoint_is_limited():
    """Es público y consulta la base en cada visita: sin límite es un grifo abierto."""
    assert "health_jobs" in _limited_endpoints()


def test_the_walk_reaches_the_routes_behind_included_routers():
    """Guardia del propio recorrido.

    Esta versión de FastAPI deja las rutas de cada `include_router` dentro de un
    envoltorio, así que un recorrido superficial encuentra dos rutas y declara
    que todo está bien. Si eso vuelve a pasar, esta cuenta lo delata.
    """
    assert len(list(_project_routes())) > 100
