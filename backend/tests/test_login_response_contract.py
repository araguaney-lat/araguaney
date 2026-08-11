"""El inicio de sesión declara lo que devuelve, sin recortar lo que ya devolvía.

`POST /v1/auth/login` no declaraba `response_model`, así que el contrato
publicaba una respuesta sin esquema y un cliente generado desde él descartaba la
sesión. Declararlo lo arregla, pero en FastAPI un `response_model` no solo
documenta: también **filtra** el cuerpo. Si el modelo omitiera una clave que el
diccionario de la sesión sí trae, esa clave desaparecería en silencio de la
respuesta y la aplicación web dejaría de recibirla.

Estas pruebas fijan las dos mitades de esa afirmación, para que el día que
alguien agregue un campo a la sesión y olvide agregarlo al modelo, se entere
aquí y no en producción (Fase 26, task 2).
"""

from app.schemas.auth import Token, TotpPending
from app.services.auth_service import AuthService


def test_the_token_model_covers_every_key_the_session_carries():
    # `_issue_session` es el único sitio donde se arma la sesión: login, el paso
    # de 2FA y el cambio forzado de contraseña la comparten.
    session_keys = {
        "access_token",
        "refresh_token",
        "token_type",
        "role",
        "center_role",
        "center_id",
        "must_change_password",
        "must_accept_terms",
    }

    assert session_keys <= set(Token.model_fields), (
        "El modelo de respuesta del login no declara todas las claves que arma "
        "_issue_session. FastAPI filtra la respuesta con este modelo, así que "
        "las que falten desaparecerían del cuerpo sin ningún error visible: "
        f"{sorted(session_keys - set(Token.model_fields))}"
    )


def test_the_session_builder_still_produces_those_keys():
    """La otra mitad: que el diccionario no gane una clave sin pasar por el modelo.

    Se lee del código fuente del método y no llamándolo, porque construirlo pide
    un usuario, una base y una firma de tokens; lo que interesa aquí es el
    contrato entre dos declaraciones, no el valor de un token.
    """
    import inspect

    source = inspect.getsource(AuthService._issue_session)
    for field in Token.model_fields:
        assert f'"{field}"' in source, (
            f"El modelo Token declara `{field}` pero _issue_session ya no lo "
            "arma. Un modelo que promete más de lo que hay devuelve nulos o "
            "falla al validar."
        )


def test_the_second_factor_response_is_described_too():
    # El otro desenlace del login: credenciales correctas, sesión todavía no.
    assert set(TotpPending.model_fields) == {"requires_totp", "partial_token"}
