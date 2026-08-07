"""Emparejamiento de necesidades y resumen nacional (Fase 23, tasks 6, 7 y 9).

Las dos capacidades comparten la decisión que las hace seguras: **el modelo
interpreta lenguaje y nada más**. El stock lo cuenta la base; las cifras del
resumen llegan ya sumadas.

Importa porque la alternativa es peor de lo que parece. Un modelo estimando
inventario produce un número creíble y falso, y alguien planea un envío sobre él
o lo publica en un boletín. Un número falso en un boletín no se corrige.

Sin red: el proveedor es un doble.
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

from app.models.box import Box  # noqa: E402
from app.models.product_type import ProductType  # noqa: E402
from app.services.ai import budget, national_summary, needs_matching  # noqa: E402
from app.services.ai.provider import AIResult, AIUnavailable  # noqa: E402

USER = uuid4()
CENTER = uuid4()
OTHER_CENTER = uuid4()


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
def stock(db):
    """Medicamento en el centro propio, alimento en el ajeno."""
    medicina = ProductType(category="MEDICINE", display_name="Paracetamol 500 mg",
                           inn_name="Paracetamol", default_unit="tableta")
    comida = ProductType(category="FOOD", display_name="Atún en lata", default_unit="lata")
    db.add_all([medicina, comida])
    db.flush()

    db.add_all([
        Box(code="BX-MED1", center_id=CENTER, product_type_id=medicina.id,
            quantity=100, unit="tableta", status="SEALED"),
        Box(code="BX-FOOD1", center_id=OTHER_CENTER, product_type_id=comida.id,
            quantity=50, unit="lata", status="SEALED"),
    ])
    db.commit()


class _Provider:
    def __init__(self, data):
        self.data = data
        self.calls = 0

    def classify_text(self, prompt, text, *, max_tokens=400):
        self.calls += 1
        return AIResult(data=self.data, input_tokens=200, output_tokens=20)

    def summarize(self, prompt, data, *, max_tokens=400):
        self.calls += 1
        self.received = data
        return AIResult(data=self.data, input_tokens=300, output_tokens=120)


def _encendida(capacidad, proveedor, modulo):
    return (
        patch.object(budget.settings, "ai_api_key", "sk-de-prueba"),
        patch.object(budget.settings, f"ai_enable_{capacidad}", True),
        patch.object(budget.settings, "ai_monthly_budget_usd", 20.0),
        patch(f"app.services.ai.{modulo}.get_provider", return_value=proveedor),
        patch("app.utils.cache.get_redis_client", return_value=None),
    )


def _emparejar(db, texto, proveedor, center_id=None, user_id=USER):
    a, b, c, d, e = _encendida("needs_matching", proveedor, "needs_matching")
    with a, b, c, d, e:
        return needs_matching.match(db, texto, user_id=user_id, center_id=center_id)


def _resumir(db, proveedor, user_id=USER):
    a, b, c, d, e = _encendida("national_summary", proveedor, "national_summary")
    with a, b, c, d, e:
        return national_summary.summarize(db, user_id=user_id)


# ── Emparejamiento: el stock lo cuenta la base ───────────────────────────────

def test_the_counts_come_from_the_database_not_the_model(db, stock):
    """El modelo dice qué se pide; cuánto hay lo dice la base. Un modelo
    inventando cantidades sería inventario imaginario."""
    proveedor = _Provider({"categories": ["MEDICINE"]})

    resultado = _emparejar(db, "necesitamos algo para la fiebre", proveedor)

    assert resultado == [{"category": "MEDICINE", "total_units": 100, "box_count": 1}]


def test_an_invented_category_is_discarded(db, stock):
    proveedor = _Provider({"categories": ["MEDICINE", "UNICORNIOS"]})

    resultado = _emparejar(db, "medicinas", proveedor)

    assert [r["category"] for r in resultado] == ["MEDICINE"]


def test_a_requested_category_with_no_stock_reports_zero(db, stock):
    """Saber que nadie tiene algo es información, no un vacío que ocultar."""
    proveedor = _Provider({"categories": ["WATER"]})

    resultado = _emparejar(db, "agua potable", proveedor)

    assert resultado == [{"category": "WATER", "total_units": 0, "box_count": 0}]


def test_the_stock_is_scoped_to_the_center(db, stock):
    """Un coordinador no descubre por aquí el inventario de otro centro."""
    proveedor = _Provider({"categories": ["FOOD"]})

    propio = _emparejar(db, "comida", proveedor, center_id=CENTER)
    nacional = _emparejar(db, "comida", proveedor, center_id=None)

    assert propio[0]["total_units"] == 0      # el alimento está en el otro centro
    assert nacional[0]["total_units"] == 50


def test_a_request_asking_for_nothing_material_returns_empty(db, stock):
    proveedor = _Provider({"categories": []})

    assert _emparejar(db, "¿cómo cambio mi contraseña?", proveedor) == []


def test_without_a_user_it_does_not_call(db, stock):
    proveedor = _Provider({"categories": ["MEDICINE"]})

    assert _emparejar(db, "medicinas", proveedor, user_id=None) == []
    assert proveedor.calls == 0


def test_a_provider_failure_leaves_the_board_as_it_was(db, stock):
    class _Caido:
        def classify_text(self, *a, **k):
            raise AIUnavailable("se cayó")

    a, b, c, d, e = _encendida("needs_matching", _Caido(), "needs_matching")
    with a, b, c, d, e:
        assert needs_matching.match(db, "medicinas", user_id=USER) == []


# ── Resumen: el modelo redacta, no calcula ───────────────────────────────────

def test_the_summary_is_written_over_figures_already_computed(db, stock):
    proveedor = _Provider({"summary": "La red acumula inventario en dos categorías."})

    texto = _resumir(db, proveedor)

    assert texto == "La red acumula inventario en dos categorías."
    # Lo que recibió son cifras sumadas, no filas que tenga que agregar.
    assert "por_categoria" in proveedor.received


def test_no_personal_data_reaches_the_prompt(db, stock):
    """Viajan categorías y conteos. Ni donantes, ni centros, ni nadie."""
    proveedor = _Provider({"summary": "texto"})

    _resumir(db, proveedor)

    enviado = str(proveedor.received)
    assert str(CENTER) not in enviado and str(USER) not in enviado
    assert set(proveedor.received) == {"por_categoria", "centros_con_stock"}


def test_without_inventory_there_is_nothing_to_summarise(db):
    """Pedir un párrafo sobre la nada produce una frase de relleno que parece
    un dato."""
    proveedor = _Provider({"summary": "algo"})

    assert _resumir(db, proveedor) is None
    assert proveedor.calls == 0


def test_an_empty_paragraph_is_reported_as_no_summary(db, stock):
    proveedor = _Provider({"summary": "   "})

    assert _resumir(db, proveedor) is None


def test_the_summary_prompt_forbids_calculating():
    """Un modelo haciendo aritmética sobre inventario humanitario produce un
    número creíble y falso, y eso acaba en un boletín de prensa."""
    assert "No calcules" in national_summary._PROMPT


def test_without_a_user_there_is_no_summary(db, stock):
    proveedor = _Provider({"summary": "texto"})

    assert _resumir(db, proveedor, user_id=None) is None
    assert proveedor.calls == 0
