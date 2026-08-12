"""Las creaciones del grupo C, y el cierre de la deuda de contrato.

Fase 26, task 12. Las últimas cuatro operaciones de `/v1` que publicaban un
esquema vacío pasan a declararlo, y con eso la lista de excepciones de
`tests/contract/test_openapi_quality.py` queda en cero.

Tres responden `{"ok": true}` y comparten `OkOut`. El alta de una cuenta es la
distinta: tiene dos formas según la verificación por correo esté exigida o no, y
declarar un token opcional es lo que permite describir ambas con un solo modelo.

Se comprobó consumidor por consumidor antes de declarar nada. Ninguno lee el
cuerpo: el alta redirige mirando solo el estado, y las dos de donación descartan
la respuesta y arman su propio resultado en el cliente. El pre-registro público
se había anticipado como el delicado del grupo porque su respuesta alimenta la
página de donación; resultó que devuelve `{"ok": true}` y que la página nunca lo
mira. La precaución era razonable y la comprobación la desmintió, que es para lo
que sirve comprobar.
"""

from app.main import app
from app.schemas.auth import RegistrationOut
from app.schemas.common import OkOut
from tests.contract.test_openapi_quality import _UNDECLARED_RESPONSES

_OK_ROUTES = (
    ("/v1/campaigns/{campaign_id}/members", "201"),
    ("/v1/public/donations", "202"),
    ("/v1/public/donations/resend", "202"),
)


def _schema(path: str, status: str) -> dict:
    return app.openapi()["paths"][path]["post"]["responses"][status]["content"][
        "application/json"
    ]["schema"]


def test_the_acknowledgements_share_one_shape():
    for path, status in _OK_ROUTES:
        assert _schema(path, status) == {"$ref": "#/components/schemas/OkOut"}, path


def test_the_acknowledgement_model_carries_only_the_flag():
    assert set(OkOut.model_fields) == {"ok"}


def test_registration_describes_both_of_its_outcomes():
    """Con sesión inmediata, o con un correo de verificación en camino."""
    fields = RegistrationOut.model_fields
    assert set(fields) == {"message", "access_token"}
    # El token falta en la rama que exige verificar el correo, así que ha de ser
    # opcional o esa respuesta fallaría al validarse.
    assert not fields["access_token"].is_required()
    assert fields["message"].is_required()
    assert _schema("/v1/auth/register", "201") == {
        "$ref": "#/components/schemas/RegistrationOut"
    }


def test_no_v1_operation_is_left_undeclared():
    """El cierre de la deuda, afirmado donde se puede leer.

    La prueba del trinquete ya falla ante una operación nueva sin declarar. Esta
    dice la otra mitad: hoy no queda ninguna pendiente. Si alguien vuelve a
    llenar la lista, que sea contra una prueba que afirmaba lo contrario y no
    contra un comentario.
    """
    assert _UNDECLARED_RESPONSES == set()
