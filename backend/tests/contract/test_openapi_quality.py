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

**La lista de excepciones está vacía.** Empezó con 20 operaciones y se saldó por
grupos (Fase 26, tasks 10 a 13): imágenes, lecturas, acciones y creaciones. No
se saldaron de una sentada porque declarar un `response_model` no solo documenta,
también **filtra** la respuesta, y hacerlo a ciegas habría quitado en silencio
campos que alguien ya consume; cada una recibió la comprobación que se hizo para
el login.

La lista se conserva vacía a propósito. El trinquete sigue sirviendo: una
operación nueva que nazca sin declarar su respuesta falla aquí, en vez de
sumarse a una deuda que ya no existe.
"""

from app.main import app

_METHODS = ("get", "post", "put", "patch", "delete", "head")

# Operaciones de /v1 sin esquema de respuesta declarado. **Está vacía**, y esa
# es la meta: toda operación de /v1 describe lo que devuelve.
#
# Se conserva la lista, y no se borra junto con su última entrada, porque el
# trinquete sigue siendo útil vacío: una operación nueva que nazca sin declarar
# su respuesta falla la prueba en vez de sumarse en silencio a una deuda que ya
# no existe. Si alguna vez hace falta añadir una excepción, que sea una decisión
# escrita y no el estado por omisión.
_UNDECLARED_RESPONSES: set[str] = set()


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
