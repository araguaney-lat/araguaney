"""Leer la etiqueta desde la captura, sin que la foto exista antes.

El OCR de la Fase 23 solo se alcanzaba desde una foto que el donante ya había
subido a su pre-registro. En el mostrador no hay tal foto: hay una caja física
en la mano, y quien captura teclea lote y caducidad de la cajita. Estos tests
fijan la versión que recibe la imagen directamente.

Dos propiedades que importan más que el resto:

- **La foto no se guarda.** El ground truth del OCR sale de fotos curadas
  aparte, así que esta ruta no necesita persistir nada — y una foto de etiqueta
  tomada en un centro puede llevar datos personales de refilón.
- **Un archivo que no es imagen falla distinto a "no pude leer".** Lo primero
  es un error de quien lo eligió y se corrige cambiando el archivo; lo segundo
  es la IA no disponible, y ahí se teclea como siempre.
"""

from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    return "JSON"


import app.models  # noqa: E402,F401
from app.database import Base  # noqa: E402
from app.models.ai_usage import AIUsage  # noqa: E402
from app.services.ai import budget, label_ocr  # noqa: E402
from app.services.ai.provider import AIResult, AIUnavailable  # noqa: E402

# Un JPEG mínimo: los bytes de cabecera bastan, nadie los decodifica aquí.
JPEG = b"\xff\xd8\xff\xe0" + b"0" * 64


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
    """Doble que devuelve los campos que se le digan y cuenta las llamadas."""

    def __init__(self, fields):
        self.fields = fields
        self.calls = 0
        self.last_image = ""

    def extract_from_image(self, prompt, image_url, *, max_tokens=500):
        self.calls += 1
        self.last_image = image_url
        return AIResult(data=self.fields, input_tokens=800, output_tokens=40)


def _encendido():
    return (
        patch.object(budget.settings, "ai_api_key", "sk-de-prueba"),
        patch.object(budget.settings, "ai_enable_label_ocr", True),
        patch.object(budget.settings, "ai_monthly_budget_usd", 20.0),
    )


def _leer(db, proveedor, data=JPEG, content_type="image/jpeg", user_id="u"):
    from uuid import uuid5, NAMESPACE_DNS

    a, b, c = _encendido()
    with a, b, c, patch("app.services.ai.label_ocr.get_provider", return_value=proveedor), \
         patch("app.utils.cache.get_redis_client", return_value=None):
        return label_ocr.extract_from_bytes(
            db, data, content_type, user_id=uuid5(NAMESPACE_DNS, user_id)
        )


# ── Lo que lee ───────────────────────────────────────────────────────────────

def test_it_reads_the_fields_from_an_uploaded_photo(db):
    proveedor = _Provider({
        "inn_name": "Paracetamol", "form": "Tableta", "strength": "500 mg",
        "batch": "L2291", "expiry_date": "2028-03-31",
    })

    campos = _leer(db, proveedor)

    assert campos["inn_name"] == "Paracetamol"
    assert campos["expiry_date"] == "2028-03-31"


def test_the_photo_travels_inline_and_is_never_stored(db):
    """La imagen va incrustada en la petición a la IA, no como una URL que
    alguien pueda volver a pedir: no hay objeto guardado al que apuntar."""
    proveedor = _Provider({"batch": "L1"})

    _leer(db, proveedor)

    assert proveedor.last_image.startswith("data:image/jpeg;base64,")


def test_the_same_photo_is_not_charged_twice(db):
    """Volver a leer la misma cajita es el caso normal cuando la primera foto
    salió movida. La caché va por contenido, así que la segunda no se cobra."""
    proveedor = _Provider({"batch": "L1"})
    guardado: dict[str, object] = {}

    with patch.object(budget, "cached", side_effect=lambda k: guardado.get(k)), \
         patch.object(budget, "store", side_effect=lambda k, v: guardado.__setitem__(k, v)):
        _leer(db, proveedor)
        _leer(db, proveedor)

    assert proveedor.calls == 1
    assert db.query(AIUsage).count() == 1


def test_a_different_photo_is_a_different_question(db):
    proveedor = _Provider({"batch": "L1"})
    guardado: dict[str, object] = {}

    with patch.object(budget, "cached", side_effect=lambda k: guardado.get(k)), \
         patch.object(budget, "store", side_effect=lambda k, v: guardado.__setitem__(k, v)):
        _leer(db, proveedor)
        _leer(db, proveedor, data=JPEG + b"otra")

    assert proveedor.calls == 2


# ── Lo que rechaza, y cómo ───────────────────────────────────────────────────

def test_a_file_that_is_not_an_image_is_refused(db):
    """Elegir un PDF es un error de quien lo eligió: se dice, no se devuelve
    vacío. Un diccionario vacío significa "la IA no está", y confundir las dos
    cosas deja a alguien esperando una lectura que nunca iba a llegar."""
    proveedor = _Provider({"batch": "L1"})

    with pytest.raises(Exception) as exc:
        _leer(db, proveedor, content_type="application/pdf")

    assert exc.value.detail["code"] == "UNSUPPORTED_IMAGE"
    assert proveedor.calls == 0


def test_an_oversized_photo_is_refused_before_reaching_the_model(db):
    """El tamaño se cobra en tokens. Rechazar antes de llamar es la diferencia
    entre un error y una factura."""
    proveedor = _Provider({"batch": "L1"})
    enorme = b"\xff\xd8\xff\xe0" + b"0" * (label_ocr.MAX_IMAGE_BYTES + 1)

    with pytest.raises(Exception) as exc:
        _leer(db, proveedor, data=enorme)

    assert exc.value.detail["code"] == "IMAGE_TOO_LARGE"
    assert proveedor.calls == 0


def test_an_empty_upload_is_refused(db):
    proveedor = _Provider({"batch": "L1"})

    with pytest.raises(Exception) as exc:
        _leer(db, proveedor, data=b"")

    assert exc.value.detail["code"] == "UNSUPPORTED_IMAGE"


# ── Cuándo no llama ──────────────────────────────────────────────────────────

def test_with_the_capability_off_it_returns_empty_without_calling(db):
    proveedor = _Provider({"batch": "L1"})

    with patch("app.services.ai.label_ocr.get_provider", return_value=proveedor):
        campos = label_ocr.extract_from_bytes(db, JPEG, "image/jpeg", user_id=None)

    assert campos == {}
    assert proveedor.calls == 0


def test_a_provider_failure_does_not_break_the_capture(db):
    """Que la IA no esté nunca puede impedir registrar una donación: se teclea
    como siempre."""
    class _Caido:
        calls = 0

        def extract_from_image(self, *a, **k):
            raise AIUnavailable("se cayó")

    assert _leer(db, _Caido()) == {}
