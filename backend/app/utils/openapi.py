"""Descripciones de respuesta para lo que no es JSON.

FastAPI infiere el contrato de una operación desde su `response_model`, y cuando
no hay ninguno asume `application/json` con un esquema vacío. Para un endpoint
que devuelve una imagen eso publica una mentira: el contrato dice "JSON sin
forma" y por el cable viaja un PNG.

Mientras cada cliente se escribía a mano nadie lo notaba. Un cliente generado sí:
produce un método que promete JSON y falla al leer bytes. De ahí que estas
respuestas se declaren, aunque no haya modelo que declarar.
"""

from typing import Any

from fastapi import Response

# `string` con formato `binary` es como OpenAPI describe un cuerpo de bytes.
_BINARY_SCHEMA = {"type": "string", "format": "binary"}


def png_response(description: str) -> dict[int | str, dict[str, Any]]:
    """Declaración de un 200 que devuelve una imagen PNG.

    Va junto con `response_class=Response` en la ruta: sin eso FastAPI añade
    `application/json` de todos modos y la operación queda documentada con dos
    tipos de contenido, uno de los cuales no existe.
    """
    return {
        200: {
            "content": {"image/png": {"schema": _BINARY_SCHEMA}},
            "description": description,
        }
    }
