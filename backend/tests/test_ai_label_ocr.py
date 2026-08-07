"""OCR de etiqueta de medicamento (Fase 23, task 5).

Teclear cinco campos de una cajita es el trámite más lento del intake. La foto
los pre-llena, pero **pre-llenar no es confirmar**: los campos son sugerencia
hasta que una persona los mira, y la caducidad sigue pasando por la validación
de vida útil.

El grueso de estos tests es sobre qué se descarta. Un campo pre-llenado con
basura cuesta más de corregir que uno vacío, y en la caducidad no es cuestión de
comodidad: es el campo que decide si una caja se acepta o se rechaza.

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

from app.models.ai_usage import AIUsage  # noqa: E402
from app.services.ai import budget, label_ocr  # noqa: E402
from app.services.ai.provider import AIResult, AIUnavailable  # noqa: E402

USER = uuid4()
CENTER = uuid4()
FOTO = "https://r2.example/eval/labels/paracetamol.jpg?firma=abc123"

_COMPLETO = {
    "inn_name": "Paracetamol",
    "form": "Tableta",
    "strength": "500 mg",
    "batch": "L2291",
    "expiry_date": "2028-03-31",
}


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


class _Provider:
    def __init__(self, data):
        self.data = data
        self.calls = 0
        self.last_url = ""

    def extract_from_image(self, prompt, image_url, *, max_tokens=500):
        self.calls += 1
        self.last_url = image_url
        return AIResult(data=self.data, input_tokens=800, output_tokens=60)


def _leer(db, proveedor, url=FOTO, user_id=USER):
    with patch.object(budget.settings, "ai_api_key", "sk-de-prueba"), \
         patch.object(budget.settings, "ai_enable_label_ocr", True), \
         patch.object(budget.settings, "ai_monthly_budget_usd", 20.0), \
         patch("app.services.ai.label_ocr.get_provider", return_value=proveedor), \
         patch("app.utils.cache.get_redis_client", return_value=None):
        return label_ocr.extract(db, url, user_id=user_id, center_id=CENTER)


# ── Lo que lee ───────────────────────────────────────────────────────────────

def test_it_reads_the_five_fields_needed_to_seal(db):
    campos = _leer(db, _Provider(_COMPLETO))

    assert campos == _COMPLETO
    assert set(campos) == set(label_ocr.FIELDS)


def test_a_partial_read_returns_what_it_could_read(db):
    """Cuatro campos leídos y uno vacío siguen ahorrando cuatro campos de tecleo."""
    parcial = dict(_COMPLETO, batch=None)

    campos = _leer(db, _Provider(parcial))

    assert "batch" not in campos
    assert campos["inn_name"] == "Paracetamol"


# ── Lo que descarta ──────────────────────────────────────────────────────────

def test_extra_fields_never_reach_the_form(db):
    """Un modelo puede devolver de más; el formulario solo tiene cinco campos."""
    campos = _leer(db, _Provider(dict(_COMPLETO, quantity="20", weight_kg="1.2")))

    assert set(campos) == set(label_ocr.FIELDS)


def test_blank_values_are_dropped(db):
    """Un campo con espacios se ve lleno y está vacío: peor que no ponerlo."""
    campos = _leer(db, _Provider(dict(_COMPLETO, batch="   ", form="")))

    assert "batch" not in campos and "form" not in campos


@pytest.mark.parametrize("fecha", ["31/03/2028", "marzo 2028", "2028-03", "próximamente"])
def test_a_date_in_another_format_is_discarded(db, fecha):
    """Entra al campo que decide si la caja se acepta: o es una fecha o no va."""
    campos = _leer(db, _Provider(dict(_COMPLETO, expiry_date=fecha)))

    assert "expiry_date" not in campos


def test_an_impossible_date_is_discarded(db):
    """Un 31 de febrero tiene el formato correcto y no existe."""
    campos = _leer(db, _Provider(dict(_COMPLETO, expiry_date="2028-02-31")))

    assert "expiry_date" not in campos


# ── Cuándo no llama ──────────────────────────────────────────────────────────

def test_with_the_capability_off_it_does_not_call(db):
    proveedor = _Provider(_COMPLETO)

    with patch("app.services.ai.label_ocr.get_provider", return_value=proveedor):
        assert label_ocr.extract(db, FOTO, user_id=USER) == {}
    assert proveedor.calls == 0


def test_without_a_user_it_does_not_call(db):
    """La regla de la fase: ninguna ruta anónima llega a la IA."""
    proveedor = _Provider(_COMPLETO)

    assert _leer(db, proveedor, user_id=None) == {}
    assert proveedor.calls == 0


def test_without_an_image_it_does_not_call(db):
    proveedor = _Provider(_COMPLETO)

    assert _leer(db, proveedor, url="") == {}
    assert proveedor.calls == 0


def test_a_provider_failure_does_not_break_capture(db):
    class _Caido:
        def extract_from_image(self, *a, **k):
            raise AIUnavailable("se cayó")

    with patch.object(budget.settings, "ai_api_key", "sk-de-prueba"), \
         patch.object(budget.settings, "ai_enable_label_ocr", True), \
         patch.object(budget.settings, "ai_monthly_budget_usd", 20.0), \
         patch("app.services.ai.label_ocr.get_provider", return_value=_Caido()), \
         patch("app.utils.cache.get_redis_client", return_value=None):
        assert label_ocr.extract(db, FOTO, user_id=USER) == {}


def test_reaching_the_cap_stops_the_calls(db):
    budget.record_usage(db, "label_ocr", input_tokens=100_000_000, output_tokens=0)
    proveedor = _Provider(_COMPLETO)

    with patch.object(budget.settings, "ai_api_key", "sk-de-prueba"), \
         patch.object(budget.settings, "ai_enable_label_ocr", True), \
         patch.object(budget.settings, "ai_monthly_budget_usd", 1.0), \
         patch("app.services.ai.label_ocr.get_provider", return_value=proveedor):
        assert label_ocr.extract(db, FOTO, user_id=USER) == {}
    assert proveedor.calls == 0


# ── Caché y costo ────────────────────────────────────────────────────────────

def test_the_cache_key_ignores_the_signature(db):
    """La URL firmada cambia en cada petición aunque la foto sea la misma. Con
    la firma dentro, la caché nunca acertaría y cada vista se cobraría de nuevo."""
    una = budget.cache_key("label_ocr", {"objeto": label_ocr._storage_key(FOTO)})
    otra = budget.cache_key(
        "label_ocr",
        {"objeto": label_ocr._storage_key("https://r2.example/eval/labels/paracetamol.jpg?firma=zzz999")},
    )

    assert una == otra


def test_every_read_is_recorded(db):
    _leer(db, _Provider(_COMPLETO))

    fila = db.query(AIUsage).one()
    assert fila.capability == "label_ocr"
    assert fila.user_id == USER and fila.center_id == CENTER
    assert fila.cost_usd > 0


def test_the_prompt_forbids_estimating_quantities():
    """Sin referencia de escala no hay estimación posible, y los modelos cuentan
    mal. Un número inventado en un campo que nadie revisa es peor que uno vacío."""
    assert "No estimes cantidad ni peso" in label_ocr._PROMPT
