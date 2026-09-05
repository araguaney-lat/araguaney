"""`POST /v1/intakes/read-label`: leer la etiqueta sin una foto previa.

La otra ruta de OCR cuelga de una foto que el donante ya subió a su
pre-registro. Esta existe para el mostrador, donde no hay tal foto, y por eso
no pide ninguna: recibe la imagen, la lee y la descarta.
"""

from unittest.mock import patch

from app.services.ai import budget
from app.services.ai.provider import AIResult

JPEG = b"\xff\xd8\xff\xe0" + b"0" * 64


class _Provider:
    def __init__(self):
        self.calls = 0

    def extract_from_image(self, prompt, image_url, *, max_tokens=500):
        self.calls += 1
        return AIResult(
            data={"inn_name": "Paracetamol", "batch": "L2291", "expiry_date": "2028-03-31"},
            input_tokens=800,
            output_tokens=40,
        )


def _encendido():
    return (
        patch.object(budget.settings, "ai_api_key", "sk-de-prueba"),
        patch.object(budget.settings, "ai_enable_label_ocr", True),
        patch.object(budget.settings, "ai_monthly_budget_usd", 20.0),
    )


def test_it_reads_a_photo_that_was_never_uploaded_anywhere(client, world):
    proveedor = _Provider()
    a, b, c = _encendido()

    with a, b, c, patch("app.services.ai.label_ocr.get_provider", return_value=proveedor), \
         patch("app.utils.cache.get_redis_client", return_value=None):
        res = client.post(
            "/v1/intakes/read-label",
            files={"file": ("etiqueta.jpg", JPEG, "image/jpeg")},
            headers=world.token(world.coordinator_a),
        )

    assert res.status_code == 200
    assert res.json()["suggested"]["batch"] == "L2291"
    assert proveedor.calls == 1


def test_it_refuses_a_file_that_is_not_an_image(client, world):
    a, b, c = _encendido()

    with a, b, c:
        res = client.post(
            "/v1/intakes/read-label",
            files={"file": ("manifiesto.pdf", b"%PDF-1.4", "application/pdf")},
            headers=world.token(world.coordinator_a),
        )

    assert res.status_code == 400
    assert res.json()["error"]["code"] == "UNSUPPORTED_IMAGE"


def test_it_needs_a_session(client, world):
    """Ninguna ruta anónima llega a la IA: es la regla de la fase, y aquí la
    sostiene la dependencia de rol, no la buena voluntad del cliente."""
    res = client.post(
        "/v1/intakes/read-label",
        files={"file": ("etiqueta.jpg", JPEG, "image/jpeg")},
    )

    assert res.status_code in (401, 403)
