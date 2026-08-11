"""Guarda contra defectos del contrato **publicado**, no de su comportamiento.

Mientras cada cliente se escribía a mano, un endpoint que no declaraba su
respuesta era una omisión inocua: quien lo consumía leía el JSON y ya. La
aplicación móvil consume esta API con un cliente Dart **generado** desde este
mismo `openapi.json`, y ahí las omisiones dejan de ser inocuas:

- Una operación sin esquema de respuesta produce un método generado que devuelve
  `void` y **descarta** lo que el endpoint sí manda. Fue exactamente lo que pasó
  con `POST /v1/auth/login`, que entrega una sesión y el cliente la tiraba.
- Dos operaciones con el mismo `operationId` producen dos métodos con el mismo
  nombre: el código generado no compila. La especificación OpenAPI exige que ese
  identificador sea único en todo el documento.

Ambas se corrigieron en la Fase 26. Estas pruebas existen para que no vuelvan.

**Sobre la lista de excepciones.** Quedan 18 operaciones de `/v1` que todavía no
declaran su respuesta. No se arreglan de una sentada a propósito: declarar un
`response_model` no solo documenta, también **filtra** la respuesta, así que
hacerlo a ciegas podría quitar en silencio campos que alguien ya consume. Cada
una pide la misma comprobación que se hizo para el login, y por eso van por
grupos (Fase 26, tasks 10 a 13). El grupo de imágenes ya salió. Mientras tanto
la lista funciona como trinquete: impide que nazca la número 19 y obliga a que
quien arregle una la quite de aquí.
"""

from app.main import app

_METHODS = ("get", "post", "put", "patch", "delete", "head")

# Operaciones de /v1 que hoy no declaran el esquema de su respuesta exitosa.
# La lista solo puede encoger. Al arreglar una, quítala de aquí: hay una prueba
# que falla si sigue listada y ya no hace falta.
_UNDECLARED_RESPONSES = {
    "GET /v1/auth/verify-email",
    "POST /v1/auth/resend-verification",
    "POST /v1/auth/forgot-password",
    "POST /v1/auth/me/accept-terms",
    "POST /v1/auth/reset-password",
    "POST /v1/auth/totp/disable",
    "POST /v1/centers/{center_id}/users/{user_id}/reinvite",
    "POST /v1/studio/users/{user_id}/reinvite",
    "GET /v1/product-types/barcode/{gtin}",
    "GET /v1/messages/unread-count",
    "GET /v1/messages/attachments/{attachment_id}/url",
    "GET /v1/donations/{code}/photos/{photo_id}/url",
    "GET /v1/public/donations/manage/{token}/photos/{photo_id}/url",
    "GET /v1/public/qr/{code}",
    # Devuelven 201 con un cuerpo sin describir.
    "POST /v1/auth/register",
    "POST /v1/campaigns/{campaign_id}/members",
    "POST /v1/public/donations",
    "POST /v1/public/donations/resend",
}


def _operations() -> dict[str, dict]:
    """Todas las operaciones del documento, indexadas por `MÉTODO /ruta`."""
    openapi = app.openapi()
    return {
        f"{method.upper()} {path}": operation
        for path, methods in openapi.get("paths", {}).items()
        for method, operation in methods.items()
        if method in _METHODS
    }


def _declares_success_schema(operation: dict) -> bool:
    """Si la operación describe el cuerpo que devuelve al salir bien."""
    for status in ("200", "201", "202", "204"):
        response = operation.get("responses", {}).get(status)
        if response is None:
            continue
        # 204 no lleva cuerpo: no tener contenido es lo correcto, no un hueco.
        if status == "204":
            return True
        content = response.get("content", {})
        if not content:
            continue
        # Cualquier tipo de contenido sirve mientras traiga esquema; una imagen
        # documentada como `image/png` está tan declarada como un JSON.
        if any(media.get("schema") for media in content.values()):
            return True
    return False


def test_operation_ids_are_unique():
    """La especificación OpenAPI lo exige y un generador se rompe sin ello."""
    seen: dict[str, str] = {}
    duplicates: list[str] = []
    for name, operation in _operations().items():
        operation_id = operation.get("operationId")
        if operation_id is None:
            continue
        if operation_id in seen:
            duplicates.append(f"{operation_id}: {seen[operation_id]} y {name}")
        seen[operation_id] = name

    assert not duplicates, (
        "Hay operationId repetidos, así que el documento OpenAPI no es válido y "
        "un cliente generado no compilará. Da un `operation_id` explícito a cada "
        f"ruta: {duplicates}"
    )


def test_v1_operations_declare_their_success_response():
    """Un endpoint nuevo de /v1 no puede nacer sin describir lo que devuelve."""
    undeclared = sorted(
        name
        for name, operation in _operations().items()
        if name.split(" ", 1)[1].startswith("/v1/")
        and not _declares_success_schema(operation)
        and name not in _UNDECLARED_RESPONSES
    )

    assert not undeclared, (
        "Estas operaciones de /v1 no declaran el cuerpo que devuelven, así que un "
        "cliente generado lo descartaría. Declara `response_model` (comprobando "
        "antes que el modelo no recorte campos que alguien ya consume) o, si "
        "devuelve algo que no es JSON, declara su `responses` con el tipo de "
        f"contenido: {undeclared}"
    )


def test_the_exception_list_only_shrinks():
    """Al arreglar una operación hay que quitarla de la lista.

    Sin esta prueba la lista se queda con nombres de endpoints ya arreglados o
    ya borrados, y deja de decir la verdad sobre la deuda que queda.
    """
    operations = _operations()
    stale = sorted(
        name
        for name in _UNDECLARED_RESPONSES
        if name not in operations or _declares_success_schema(operations[name])
    )

    assert not stale, (
        "Estas operaciones ya no necesitan la excepción, porque se arreglaron o "
        f"dejaron de existir. Quítalas de _UNDECLARED_RESPONSES: {stale}"
    )
