"""Ninguna ruta pública invoca IA (Fase 23, task 9).

Los tests de cada capacidad prueban que ella respeta la regla. Este la prueba
transversalmente y sobre las rutas reales, que es lo que la sostiene cuando
alguien agregue la sexta capacidad dentro de un año sin haber leído nada de
esto.

Lo público es cacheable, anónimo y barato de golpear. Un costo por petición ahí
no es gasto, es un ataque de bajo presupuesto contra el presupuesto de una
organización humanitaria.
"""

import inspect

import pytest

from app.main import app
from app.services.ai import label_ocr, national_summary, needs_matching, text_mapping

# Los cuatro módulos de capacidad. Un módulo nuevo que no aparezca aquí lo
# delata el test de cobertura de abajo.
CAPABILITIES = (text_mapping, label_ocr, needs_matching, national_summary)

# Prefijos que se sirven sin sesión. **Sin `/v1`**: las rutas se registran en
# sus routers y el prefijo se aplica al montarlas, así que aquí llegan tal como
# el router las declara. Escribirlas con `/v1` no coincidiría con ninguna y este
# guardia pasaría por vacío, que es peor que no tenerlo.
PUBLIC_PREFIXES = ("/public/", "/b/", "/p/", "/d/", "/health", "/webhooks/")


def _walk(routes):
    for route in routes:
        incluido = getattr(route, "original_router", None)
        if incluido is not None:
            yield from _walk(incluido.routes)
        elif getattr(route, "endpoint", None) is not None:
            yield route


def _public_routes():
    for route in _walk(app.routes):
        if any(route.path.startswith(p) for p in PUBLIC_PREFIXES):
            yield route


def test_every_capability_goes_through_the_single_gate():
    """`ensure_available` exige un `user_id`: si una capacidad no lo llama, su
    llamada a la IA no está acotada por nada."""
    for modulo in CAPABILITIES:
        fuente = inspect.getsource(modulo)
        assert "ensure_available" in fuente, f"{modulo.__name__} no pasa por la puerta"
        assert "user_id=user_id" in fuente, f"{modulo.__name__} no propaga el usuario"


def test_no_public_route_reaches_a_capability():
    """La comprobación que importa: sobre las rutas reales, no sobre intenciones."""
    culpables = []

    for route in _public_routes():
        try:
            fuente = inspect.getsource(route.endpoint)
        except (OSError, TypeError):  # pragma: no cover
            continue
        for modulo in CAPABILITIES:
            nombre = modulo.__name__.rsplit(".", 1)[-1]
            if f"{nombre}." in fuente:
                culpables.append(f"{route.path} usa {nombre}")

    assert not culpables, "Rutas públicas invocando IA:\n  " + "\n  ".join(culpables)


def test_every_capability_module_is_covered_by_this_test():
    """Una capacidad nueva que nadie agregue aquí dejaría de estar vigilada, y
    el descuido no se notaría: los tests seguirían en verde."""
    import pathlib

    # Módulos del paquete que **no** son capacidades: no llaman al proveedor, así
    # que no hay nada que vigilar en ellos. La lista se enumera a mano y no se
    # deduce, para que agregar una quinta capacidad de verdad rompa este test en
    # vez de colarse por una regla genérica.
    NO_SON_CAPACIDADES = {
        "__init__",
        "provider",      # el adaptador
        "budget",        # los guardarraíles
        "evaluation",    # el conjunto de referencia
        "usage_report",  # lectura del gasto para el panel de /studio
    }

    modulos = {
        p.stem for p in pathlib.Path(national_summary.__file__).parent.glob("*.py")
        if p.stem not in NO_SON_CAPACIDADES
    }
    vigilados = {m.__name__.rsplit(".", 1)[-1] for m in CAPABILITIES}

    assert modulos == vigilados, f"Capacidades sin vigilar: {modulos - vigilados}"

    # La clasificación se comprueba, no se promete: sin esto, silenciar el
    # test bastaría con meter una capacidad de verdad en la lista de exentos.
    for stem in NO_SON_CAPACIDADES - {"__init__", "provider"}:
        fuente = (pathlib.Path(national_summary.__file__).parent / f"{stem}.py").read_text()
        assert "get_provider" not in fuente, (
            f"'{stem}' llama al proveedor: es una capacidad y tiene que vigilarse"
        )


@pytest.mark.parametrize("modulo", CAPABILITIES, ids=lambda m: m.__name__.rsplit(".", 1)[-1])
def test_a_capability_never_breaks_its_caller(modulo):
    """Todas devuelven vacío cuando la IA no está, en vez de propagar el fallo.

    Que la IA no esté nunca puede impedir capturar una donación, resolver una
    solicitud ni abrir el panel nacional.
    """
    fuente = inspect.getsource(modulo)
    assert "except AIDisabled" in fuente
    assert "except AIUnavailable" in fuente


def test_the_guard_actually_sees_public_routes():
    """Un guardia que no encuentra nada que vigilar pasa siempre.

    Este test existe porque ya ocurrió: los prefijos se escribieron con `/v1`,
    no coincidieron con ninguna ruta, y el guardia daba verde con una violación
    puesta a propósito.
    """
    rutas = list(_public_routes())

    assert len(rutas) >= 10, f"solo se ven {len(rutas)} rutas públicas: revisa PUBLIC_PREFIXES"
    caminos = {r.path for r in rutas}
    assert "/public/qr/{code}" in caminos
    assert "/b/{code}" in caminos
