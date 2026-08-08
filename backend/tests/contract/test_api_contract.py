"""Guarda contra cambios de contrato que romperían a un cliente ya instalado.

La web se despliega junto al backend; una app nativa no. Un cambio de schema
rutinario —quitar un endpoint, o volver obligatorio un campo que antes no lo
era— rompe en silencio al binario de hace meses: con `extra="forbid"`, un campo
nuevo obligatorio devuelve 422, y en la cola offline eso se marca como rechazo
definitivo y se pierde la captura.

Esta prueba no falla ante cambios **aditivos** (endpoints nuevos, campos
opcionales nuevos): esos son compatibles y no deben hacer ruido. Falla solo ante
los dos cambios **incompatibles** que importan:

1. Una operación (método + ruta) que estaba y ya no está.
2. Una operación que gana un campo de entrada **obligatorio** que antes no tenía.

Cuando un cambio incompatible es intencional (una `/v2`, p. ej.), se regenera la
huella a propósito:

    python -m tests.contract.test_api_contract

Regenerarla es un acto consciente, igual que subir una regla de lint a error: la
prueba existe para que nadie rompa el contrato **sin querer**.
"""

import json
from pathlib import Path

from app.main import app

_SNAPSHOT = Path(__file__).parent / "api_contract.json"
_METHODS = ("get", "post", "put", "patch", "delete")


def _required_fields(schema: dict | None, schemas: dict) -> list[str]:
    """Campos obligatorios del cuerpo de una operación, resolviendo un $ref."""
    if not schema:
        return []
    if "$ref" in schema:
        name = schema["$ref"].split("/")[-1]
        schema = schemas.get(name, {})
    return sorted(schema.get("required", []))


def _fingerprint() -> dict[str, list[str]]:
    """Huella del contrato: por cada operación, sus campos de entrada obligatorios."""
    openapi = app.openapi()
    schemas = openapi.get("components", {}).get("schemas", {})
    ops: dict[str, list[str]] = {}
    for path, methods in openapi.get("paths", {}).items():
        for method, operation in methods.items():
            if method not in _METHODS:
                continue
            body_schema = (
                operation.get("requestBody", {})
                .get("content", {})
                .get("application/json", {})
                .get("schema")
            )
            ops[f"{method.upper()} {path}"] = _required_fields(body_schema, schemas)
    return ops


def _load_snapshot() -> dict[str, list[str]]:
    return json.loads(_SNAPSHOT.read_text())


def test_no_operation_was_removed():
    """Quitar o renombrar una operación rompe a quien la llamaba."""
    current = _fingerprint()
    snapshot = _load_snapshot()
    removed = sorted(op for op in snapshot if op not in current)
    assert not removed, (
        "Operaciones eliminadas del contrato (romperían clientes instalados): "
        f"{removed}. Si es intencional (p. ej. una /v2), regenera la huella: "
        "python -m tests.contract.test_api_contract"
    )


def test_no_operation_gained_a_required_field():
    """Un campo antes opcional que se vuelve obligatorio da 422 a clientes viejos."""
    current = _fingerprint()
    snapshot = _load_snapshot()
    newly_required: dict[str, list[str]] = {}
    for op, fields in current.items():
        if op in snapshot:
            added = [f for f in fields if f not in snapshot[op]]
            if added:
                newly_required[op] = added
    assert not newly_required, (
        "Campos de entrada ahora obligatorios (422 en clientes instalados): "
        f"{newly_required}. Hazlos opcionales con default, o si es intencional "
        "regenera la huella: python -m tests.contract.test_api_contract"
    )


def _regenerate() -> None:
    _SNAPSHOT.write_text(json.dumps(_fingerprint(), indent=2, sort_keys=True) + "\n")
    print(f"Huella de contrato regenerada: {_SNAPSHOT}")


if __name__ == "__main__":
    _regenerate()
