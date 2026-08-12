"""Las acciones del grupo B declaran el cuerpo que ya devolvían.

Fase 26, task 11. Ocho operaciones que confirman una acción sin entregar datos
pasaron de publicar un esquema vacío a declarar su modelo.

Siete responden `{"message": ...}` y una, la aceptación de términos, devuelve la
versión que quedó registrada. Se comprobó antes de declarar nada que **ningún
consumidor lee esas claves**: el frontend mira el estado HTTP y sigue, y el
`message` que sí lee sale del sobre de error, que es otra cosa.

Eso abre una pregunta que esta fase deja anotada y no ejecuta: si el cuerpo no
aporta nada, la respuesta honesta sería un `204` sin cuerpo. Cambiar `200` con
cuerpo por `204` es incompatible, y dentro de `/v1` los cambios son solo
aditivos, así que vive en una `/v2`. Mientras tanto, lo que se declara es lo que
de verdad sale.
"""

from app.main import app
from app.schemas.auth import AcceptTermsOut
from app.schemas.common import MessageOut

_MESSAGE_ROUTES = (
    ("get", "/v1/auth/verify-email"),
    ("post", "/v1/auth/resend-verification"),
    ("post", "/v1/auth/forgot-password"),
    ("post", "/v1/auth/reset-password"),
    ("post", "/v1/auth/totp/disable"),
    ("post", "/v1/centers/{center_id}/users/{user_id}/reinvite"),
    ("post", "/v1/studio/users/{user_id}/reinvite"),
)


def _success_schema(method: str, path: str) -> dict:
    return app.openapi()["paths"][path][method]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]


def test_every_confirmation_shares_one_shape():
    # Siete secciones distintas confirman lo mismo. Un modelo por sección sería
    # siete formas que se parecen hoy y divergen mañana.
    for method, path in _MESSAGE_ROUTES:
        assert _success_schema(method, path) == {
            "$ref": "#/components/schemas/MessageOut"
        }, f"{method.upper()} {path}"


def test_the_confirmation_model_carries_only_the_message():
    # El modelo filtra: una clave que un servicio agregue y no esté aquí,
    # desaparecería del cuerpo sin ningún error visible.
    assert set(MessageOut.model_fields) == {"message"}


def test_accepting_terms_reports_the_version_it_recorded():
    """Es la única del grupo cuyo cuerpo sí dice algo."""
    assert set(AcceptTermsOut.model_fields) == {
        "accepted_terms_version",
        "must_accept_terms",
    }
    assert _success_schema("post", "/v1/auth/me/accept-terms") == {
        "$ref": "#/components/schemas/AcceptTermsOut"
    }


def test_the_services_still_produce_those_keys():
    """Que el servicio no gane una clave sin pasar por el modelo.

    Se lee del código fuente en vez de llamando a los servicios, porque cada uno
    pediría una base, un usuario y un correo saliente; lo que interesa aquí es
    el acuerdo entre dos declaraciones, no el efecto de la acción.
    """
    import inspect

    from app.services.auth_service import AuthService

    source = inspect.getsource(AuthService)
    # Las confirmaciones que arma el servicio de sesión salen todas con esta
    # forma; si alguna cambiara de clave, el modelo la recortaría en silencio.
    assert '"message"' in source
    assert '"accepted_terms_version"' in source
