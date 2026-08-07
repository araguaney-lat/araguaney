"""Mapeo de texto libre a catálogo (Fase 23, task 4).

La capacidad propone; la persona confirma. Estos tests fijan que proponer nunca
se convierta en decidir, y que la ausencia de IA no impida capturar.

Ninguno toca la red: el proveedor es un doble, que es para lo que existe el
adaptador.
"""

from unittest.mock import patch
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base


@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    return "JSON"


import app.models  # noqa: E402,F401

from app.models.ai_usage import AIUsage  # noqa: E402
from app.models.product_type import ProductType  # noqa: E402
from app.services.ai import budget, text_mapping  # noqa: E402
from app.services.ai.provider import AIResult, AIUnavailable  # noqa: E402

USER = uuid4()
CENTER = uuid4()


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def catalogo(db):
    productos = [
        ProductType(category="FOOD", display_name="Atún en lata 140 g", default_unit="lata"),
        ProductType(category="FOOD", display_name="Atún en agua 300 g", default_unit="lata"),
        ProductType(category="MEDICINE", display_name="Ibuprofeno 400 mg",
                    inn_name="Ibuprofeno", strength="400 mg", form="Tableta", default_unit="tableta"),
        ProductType(category="MEDICINE", display_name="Ibuprofeno 800 mg",
                    inn_name="Ibuprofeno", strength="800 mg", form="Tableta", default_unit="tableta"),
        ProductType(category="OTHER", display_name="Cobija matrimonial", default_unit="pieza"),
    ]
    db.add_all(productos)
    db.commit()
    return {p.display_name: p for p in productos}


class _Provider:
    """Doble que devuelve los ids que se le digan y cuenta las llamadas."""

    def __init__(self, ids):
        self.ids = ids
        self.calls = 0
        self.last_question = ""

    def classify_text(self, prompt, text, *, max_tokens=400):
        self.calls += 1
        self.last_question = text
        return AIResult(data={"ids": self.ids}, input_tokens=400, output_tokens=30)


def _encendido():
    """La capacidad encendida y con presupuesto."""
    return (
        patch.object(budget.settings, "ai_api_key", "sk-de-prueba"),
        patch.object(budget.settings, "ai_enable_text_mapping", True),
        patch.object(budget.settings, "ai_monthly_budget_usd", 20.0),
    )


def _sugerir(db, texto, proveedor, user_id=USER):
    a, b, c = _encendido()
    with a, b, c, patch("app.services.ai.text_mapping.get_provider", return_value=proveedor), \
         patch("app.utils.cache.get_redis_client", return_value=None):
        return text_mapping.suggest(db, texto, user_id=user_id, center_id=CENTER)


# ── Lo que propone ───────────────────────────────────────────────────────────

def test_it_suggests_the_products_the_model_picked(db, catalogo):
    atun = catalogo["Atún en lata 140 g"]
    proveedor = _Provider([str(atun.id)])

    sugerencias = _sugerir(db, "20 latas de atún", proveedor)

    assert [p.id for p in sugerencias] == [atun.id]


def test_it_never_returns_more_than_three(db, catalogo):
    proveedor = _Provider([str(p.id) for p in catalogo.values()])

    sugerencias = _sugerir(db, "atún ibuprofeno cobija", proveedor)

    assert len(sugerencias) <= text_mapping.MAX_SUGGESTIONS


def test_an_invented_id_is_discarded(db, catalogo):
    """Un modelo que inventa no puede meter un producto inexistente en la pantalla."""
    atun = catalogo["Atún en lata 140 g"]
    proveedor = _Provider([str(uuid4()), str(atun.id)])

    sugerencias = _sugerir(db, "atún", proveedor)

    assert [p.id for p in sugerencias] == [atun.id]


def test_an_empty_answer_is_a_valid_answer(db, catalogo):
    """Ninguna sugerencia obliga a buscar o crear, que es mejor que aceptar un
    parecido: un mapeo equivocado se descubre en la aduana, no aquí."""
    proveedor = _Provider([])

    assert _sugerir(db, "atún", proveedor) == []


def test_the_shortlist_reaches_the_model_with_real_candidates(db, catalogo):
    """El catálogo entero no viaja en el prompt: se preselecciona y el modelo
    desempata. Mandar mil productos por renglón cuesta más y acierta menos."""
    proveedor = _Provider([])

    _sugerir(db, "ibuprofeno", proveedor)

    assert "Ibuprofeno 400 mg" in proveedor.last_question
    assert "Cobija" not in proveedor.last_question


# ── Cuándo no llama ──────────────────────────────────────────────────────────

def test_with_the_capability_off_it_returns_empty_without_calling(db, catalogo):
    proveedor = _Provider([str(next(iter(catalogo.values())).id)])

    with patch("app.services.ai.text_mapping.get_provider", return_value=proveedor):
        sugerencias = text_mapping.suggest(db, "atún", user_id=USER)

    assert sugerencias == []
    assert proveedor.calls == 0


def test_without_a_user_it_does_not_call(db, catalogo):
    """La regla de la fase: ninguna ruta anónima llega a la IA."""
    proveedor = _Provider([])

    assert _sugerir(db, "atún", proveedor, user_id=None) == []
    assert proveedor.calls == 0


def test_empty_text_does_not_call(db, catalogo):
    proveedor = _Provider([])

    assert _sugerir(db, "   ", proveedor) == []
    assert proveedor.calls == 0


def test_without_candidates_it_does_not_pay_for_an_empty_answer(db, catalogo):
    """Sin nada que desempatar, preguntar sería pagar por una respuesta que solo
    puede venir vacía."""
    proveedor = _Provider([])

    assert _sugerir(db, "zzzzz qqqqq", proveedor) == []
    assert proveedor.calls == 0


def test_a_provider_failure_does_not_break_capture(db, catalogo):
    """Que la IA no esté nunca puede impedir registrar una donación."""
    class _Caido:
        calls = 0

        def classify_text(self, *a, **k):
            raise AIUnavailable("se cayó")

    a, b, c = _encendido()
    with a, b, c, patch("app.services.ai.text_mapping.get_provider", return_value=_Caido()), \
         patch("app.utils.cache.get_redis_client", return_value=None):
        assert text_mapping.suggest(db, "atún", user_id=USER) == []


def test_reaching_the_cap_stops_the_calls(db, catalogo):
    budget.record_usage(db, "text_mapping", input_tokens=100_000_000, output_tokens=0)
    proveedor = _Provider([])

    with patch.object(budget.settings, "ai_api_key", "sk-de-prueba"), \
         patch.object(budget.settings, "ai_enable_text_mapping", True), \
         patch.object(budget.settings, "ai_monthly_budget_usd", 1.0), \
         patch("app.services.ai.text_mapping.get_provider", return_value=proveedor):
        assert text_mapping.suggest(db, "atún", user_id=USER) == []
    assert proveedor.calls == 0


# ── Costo ────────────────────────────────────────────────────────────────────

def test_every_call_is_recorded(db, catalogo):
    """Sin registro no hay tope, y sin tope el riesgo pasa a ser el volumen."""
    proveedor = _Provider([])

    _sugerir(db, "atún", proveedor)

    fila = db.query(AIUsage).one()
    assert fila.capability == "text_mapping"
    assert fila.user_id == USER and fila.center_id == CENTER
    assert fila.cost_usd > 0
