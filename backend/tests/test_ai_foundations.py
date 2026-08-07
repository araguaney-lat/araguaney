"""Cimientos de la IA asistida: adaptador y control de gasto (Fase 23, tasks 1 y 2).

Ninguno de estos tests toca la red. El adaptador existe justamente para que la
IA sea sustituible por un doble, y una suite que dependa de un proveedor externo
falla los días que el proveedor tiene un mal día.

Lo que fijan es el contrato de seguridad de la fase:

- **Apagado por defecto.** Sin llave y sin banderas, la aplicación se comporta
  exactamente como antes.
- **El tope apaga, no rompe.** Alcanzado el límite, las capacidades se caen
  solas y la operación sigue: capturar a mano es más lento, no imposible.
- **La misma pregunta no se cobra dos veces.**
- **Un tope en cero se lee como apagado**, no como "sin límite". La lectura
  contraria convertiría un dedazo en una factura.
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

from app.models.ai_usage import AI_CAPABILITIES, AIUsage  # noqa: E402
from app.services.ai import budget  # noqa: E402
from app.services.ai.budget import AIDisabled  # noqa: E402
from app.services.ai.provider import AIResult, AIUnavailable, get_provider  # noqa: E402


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


class _FakeProvider:
    """El doble que usa la suite. Devuelve lo que le digan y cuenta llamadas."""

    def __init__(self, data=None):
        self.data = data or {"ok": True}
        self.calls = 0

    def classify_text(self, prompt, text, *, max_tokens=400):
        self.calls += 1
        return AIResult(data=self.data, input_tokens=100, output_tokens=50)


# ── Adaptador ────────────────────────────────────────────────────────────────

def test_without_a_key_there_is_no_provider():
    """Sin llave, la IA no existe. Y lo dice: no devuelve un resultado vacío."""
    with patch.object(budget.settings, "ai_api_key", ""):
        with pytest.raises(AIUnavailable):
            get_provider()


def test_the_double_satisfies_the_interface():
    doble = _FakeProvider({"suggestions": []})

    resultado = doble.classify_text("clasifica", "20 latas de atún")

    assert resultado.data == {"suggestions": []}
    assert resultado.input_tokens == 100


# ── Banderas por capacidad ───────────────────────────────────────────────────

def test_every_capability_is_off_by_default():
    with patch.object(budget.settings, "ai_api_key", "sk-de-prueba"):
        for capacidad in AI_CAPABILITIES:
            assert budget.capability_enabled(capacidad) is False


def test_turning_one_capability_on_does_not_turn_on_the_rest():
    with patch.object(budget.settings, "ai_api_key", "sk-de-prueba"), \
         patch.object(budget.settings, "ai_enable_text_mapping", True):
        assert budget.capability_enabled("text_mapping") is True
        assert budget.capability_enabled("label_ocr") is False


def test_a_capability_stays_off_without_a_key():
    """La bandera encendida y sin llave no enciende nada: no hay a quién llamar."""
    with patch.object(budget.settings, "ai_api_key", ""), \
         patch.object(budget.settings, "ai_enable_text_mapping", True):
        assert budget.capability_enabled("text_mapping") is False


def test_an_unknown_capability_is_a_programming_error():
    with pytest.raises(ValueError):
        budget.capability_enabled("adivinar_el_futuro")


# ── Tope de gasto ────────────────────────────────────────────────────────────

def test_spending_accumulates_by_month(db):
    budget.record_usage(db, "text_mapping", input_tokens=1_000_000, output_tokens=0)
    budget.record_usage(db, "label_ocr", input_tokens=1_000_000, output_tokens=0)

    assert budget.month_spend_usd(db) == pytest.approx(0.30)
    assert budget.month_spend_usd(db, capability="label_ocr") == pytest.approx(0.15)


def test_the_gate_opens_while_there_is_budget(db):
    with patch.object(budget.settings, "ai_api_key", "sk-de-prueba"), \
         patch.object(budget.settings, "ai_enable_text_mapping", True), \
         patch.object(budget.settings, "ai_monthly_budget_usd", 20.0):
        budget.ensure_available(db, "text_mapping", user_id=uuid4())  # no levanta


def test_reaching_the_cap_turns_the_capability_off(db):
    """Apaga, no rompe: capturar a mano es más lento, no imposible."""
    budget.record_usage(db, "text_mapping", input_tokens=100_000_000, output_tokens=0)

    with patch.object(budget.settings, "ai_api_key", "sk-de-prueba"), \
         patch.object(budget.settings, "ai_enable_text_mapping", True), \
         patch.object(budget.settings, "ai_monthly_budget_usd", 1.0):
        with pytest.raises(AIDisabled):
            budget.ensure_available(db, "text_mapping", user_id=uuid4())


def test_a_zero_cap_reads_as_off(db):
    """Lo contrario convertiría un dedazo en una factura."""
    with patch.object(budget.settings, "ai_monthly_budget_usd", 0.0):
        assert budget.budget_exhausted(db) is True


def test_recording_usage_never_breaks_the_call(db):
    """Perder el registro deja el tope ciego, pero no puede tumbar la captura."""
    db.close()  # sesión inservible a propósito

    costo = budget.record_usage(db, "text_mapping", input_tokens=1000, output_tokens=100)

    assert costo > 0


def test_usage_rows_do_not_store_prompts(db):
    budget.record_usage(db, "label_ocr", input_tokens=10, output_tokens=5,
                        user_id=uuid4(), center_id=uuid4())

    fila = db.query(AIUsage).first()
    columnas = {c.name for c in AIUsage.__table__.columns}
    assert not {"prompt", "response", "content", "text"} & columnas
    assert fila.capability == "label_ocr"


# ── Caché ────────────────────────────────────────────────────────────────────

def test_the_same_question_shares_a_key():
    a = budget.cache_key("text_mapping", {"texto": "20 latas de atún"})
    b = budget.cache_key("text_mapping", {"texto": "20 latas de atún"})
    c = budget.cache_key("text_mapping", {"texto": "3 cobijas"})

    assert a == b != c


def test_the_key_separates_capabilities():
    """La misma foto leída para OCR y para otra cosa no comparte respuesta."""
    assert budget.cache_key("label_ocr", {"x": 1}) != budget.cache_key("text_mapping", {"x": 1})


def test_without_redis_the_cache_is_a_miss_and_not_a_crash():
    """`app.utils.cache` es no-op sin Redis: el llamador trata el miss como carga."""
    with patch("app.utils.cache.get_redis_client", return_value=None):
        budget.store("ai:text_mapping:loquesea", {"a": 1})
        assert budget.cached("ai:text_mapping:loquesea") is None


# ── Sesión obligatoria ───────────────────────────────────────────────────────

def test_without_an_authenticated_user_there_is_no_ai(db):
    """La regla "ningún endpoint público invoca IA", vuelta mecanismo.

    Una ruta anónima no tiene usuario que pasar, así que no puede llegar a la
    IA ni por descuido de quien la escriba dentro de seis meses. Sin esto, la
    regla dependería de que alguien la recuerde.
    """
    with patch.object(budget.settings, "ai_api_key", "sk-de-prueba"), \
         patch.object(budget.settings, "ai_enable_text_mapping", True), \
         patch.object(budget.settings, "ai_monthly_budget_usd", 20.0):
        with pytest.raises(AIDisabled) as exc:
            budget.ensure_available(db, "text_mapping", user_id=None)

    assert "autenticado" in str(exc.value)


def test_the_session_check_comes_before_the_others(db):
    """Un anónimo no debe poder distinguir si la capacidad existe o está apagada.

    Comprobar primero la sesión evita que la respuesta filtre configuración a
    quien no debería estar preguntando.
    """
    with patch.object(budget.settings, "ai_api_key", ""), \
         patch.object(budget.settings, "ai_enable_text_mapping", False):
        with pytest.raises(AIDisabled) as exc:
            budget.ensure_available(db, "text_mapping", user_id=None)

    assert "autenticado" in str(exc.value)
