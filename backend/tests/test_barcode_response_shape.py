"""La consulta por código de barras, recorrida entera con su modelo declarado.

Fase 26, task 13. `GET /v1/product-types/barcode/{gtin}` pasó de publicar un
esquema vacío a declarar `BarcodeResult`, y esa ruta es la única del grupo que
merecía una prueba de recorrido completo en vez de una comprobación de esquema.

El motivo: devuelve un **diccionario**, no un modelo ya construido, y con
`response_model` declarado FastAPI lo valida y lo filtra. La rama que trae el
producto del catálogo externo entrega un diccionario anidado donde el modelo
espera `BarcodePrefill`, y su ruta hermana en `catalog.py` lo construye a mano
(`BarcodePrefill(**data)`), lo que hacía razonable dudar de si el diccionario
crudo sobreviviría la validación. Sobrevive, y esta prueba lo fija.
"""

import os

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests-only-32-chars")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.dependencies import get_current_user
from app.main import app
from app.models.user import User
from app.routers import product_type as product_type_router
from app.utils.rate_limit import limiter

limiter.enabled = False

_OFF_PREFILL = {
    "gtin": "7501055300150",
    "display_name": "Atún en agua",
    "brand": "Marca",
    "category": "FOOD",
}


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = lambda: None
    app.dependency_overrides[get_current_user] = lambda: User(
        email="operadora@test.local", username="operadora", role="user"
    )
    yield TestClient(app)
    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_user, None)


def test_a_local_hit_keeps_the_product_and_adds_no_noise(client, monkeypatch):
    class _Repo:
        def __init__(self, db):
            pass

        def find_by_gtin(self, gtin):
            from datetime import datetime, timezone
            from uuid import uuid4

            return type(
                "Row",
                (),
                {
                    "id": uuid4(),
                    "category": "FOOD",
                    "display_name": "Atún en agua",
                    "campaign_id": None,
                    "unspsc_code": None,
                    "inn_name": None,
                    "strength": None,
                    "form": None,
                    "brand": None,
                    "gtin": gtin,
                    "is_controlled": False,
                    "min_shelf_life_days": None,
                    "unit_weight_kg": None,
                    "default_unit": None,
                    "created_at": datetime.now(timezone.utc),
                },
            )()

    monkeypatch.setattr(
        "app.repositories.product_type_repository.ProductTypeRepository", _Repo
    )

    response = client.get("/v1/product-types/barcode/7501055300150")

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "local"
    assert body["product_type"]["display_name"] == "Atún en agua"
    # El modelo declara tres campos, así que la rama local gana un `prefill`
    # nulo. Es aditivo y ningún consumidor lo lee, pero conviene que la prueba
    # lo diga en vez de que alguien lo descubra en un diff de producción.
    assert body["prefill"] is None


def test_an_external_hit_survives_the_response_model(client, monkeypatch):
    """El diccionario del catálogo externo pasa la validación anidada."""

    class _EmptyRepo:
        def __init__(self, db):
            pass

        def find_by_gtin(self, gtin):
            return None

    async def _fake_lookup(gtin):
        return _OFF_PREFILL

    monkeypatch.setattr(
        "app.repositories.product_type_repository.ProductTypeRepository", _EmptyRepo
    )
    monkeypatch.setattr(product_type_router, "lookup_barcode", _fake_lookup)

    response = client.get("/v1/product-types/barcode/7501055300150")

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "open_food_facts"
    assert body["prefill"] == _OFF_PREFILL
    assert body["product_type"] is None


def test_a_miss_returns_an_empty_prefill_instead_of_failing(client, monkeypatch):
    class _EmptyRepo:
        def __init__(self, db):
            pass

        def find_by_gtin(self, gtin):
            return None

    async def _no_result(gtin):
        return None

    monkeypatch.setattr(
        "app.repositories.product_type_repository.ProductTypeRepository", _EmptyRepo
    )
    monkeypatch.setattr(product_type_router, "lookup_barcode", _no_result)

    response = client.get("/v1/product-types/barcode/7501055300150")

    assert response.status_code == 200
    assert response.json()["prefill"] is None
