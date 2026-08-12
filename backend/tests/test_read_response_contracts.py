"""Las lecturas del grupo D declaran su respuesta sin recortar lo que devolvían.

Fase 26, task 13. Seis operaciones de lectura pasaron de publicar un esquema
vacío a declarar su modelo. En FastAPI eso no es solo documentación: un
`response_model` **filtra** el cuerpo, así que una clave que el modelo no
declare desaparece sin error.

Estas pruebas cubren esa frontera para cada forma:

- Las que entregan una URL firmada y el contador de no leídos son de una sola
  clave, y lo que se fija es que siga siendo exactamente esa.
- La consulta por código de barras tiene dos formas según encuentre el producto
  en la base o lo traiga del catálogo externo, y el modelo tiene que admitir las
  dos.
- La ficha pública de QR se declara sin `response_model`, porque devuelve un
  `JSONResponse` para poder servir la copia cacheada tal cual. Esa diferencia se
  fija aquí: si alguien le pusiera un `response_model`, el filtrado empezaría a
  aplicarse sobre una respuesta que hoy sale intacta.
"""

from app.main import app
from app.schemas.common import SignedUrlOut
from app.schemas.messaging import UnreadCountOut
from app.schemas.product_type import BarcodeResult

_SIGNED_URL_ROUTES = (
    "/v1/messages/attachments/{attachment_id}/url",
    "/v1/donations/{code}/photos/{photo_id}/url",
    "/v1/public/donations/manage/{token}/photos/{photo_id}/url",
)


def _success_schema(path: str) -> dict:
    return app.openapi()["paths"][path]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"]


def test_the_signed_url_routes_share_one_shape():
    # Tres secciones distintas entregan lo mismo. Si divergieran, quien las
    # consume tendría que recordar cuál devuelve qué.
    for path in _SIGNED_URL_ROUTES:
        assert _success_schema(path) == {
            "$ref": "#/components/schemas/SignedUrlOut"
        }, path


def test_the_signed_url_model_carries_only_the_url():
    # El modelo filtra: cualquier clave que se agregue al diccionario del
    # servicio y no aquí, desaparecería del cuerpo.
    assert set(SignedUrlOut.model_fields) == {"url"}


def test_the_unread_count_keeps_the_key_the_menu_badge_reads():
    assert set(UnreadCountOut.model_fields) == {"unread"}
    assert _success_schema("/v1/messages/unread-count") == {
        "$ref": "#/components/schemas/UnreadCountOut"
    }


def test_the_barcode_lookup_admits_both_of_its_outcomes():
    """Encontrado en la base local, o traído del catálogo externo."""
    fields = BarcodeResult.model_fields
    assert set(fields) == {"source", "product_type", "prefill"}
    # Las dos ramas devuelven solo una de las dos, así que ambas han de ser
    # opcionales o la respuesta fallaría al validarse.
    assert not fields["product_type"].is_required()
    assert not fields["prefill"].is_required()
    assert _success_schema("/v1/product-types/barcode/{gtin}") == {
        "$ref": "#/components/schemas/BarcodeResult"
    }


def test_the_public_qr_record_declares_both_shapes():
    schema = _success_schema("/v1/public/qr/{code}")
    refs = {option.get("$ref") for option in schema.get("anyOf", [])}
    assert refs == {
        "#/components/schemas/QrBoxFicha",
        "#/components/schemas/QrPalletFicha",
    }, "La ficha pública sirve códigos de caja y de tarima; el contrato debe decirlo"


def test_the_public_qr_record_is_not_filtered_by_a_response_model():
    """Devuelve un `JSONResponse`, y declararlo por `responses` lo deja intacto.

    Importa porque la respuesta cacheada se sirve tal como se guardó. Un
    `response_model` la haría pasar por una validación que hoy no ocurre, y una
    forma que el modelo no contemple dejaría de servirse.
    """
    from app.routers.dashboard import router

    route = next(
        r
        for r in router.routes
        if getattr(r, "path", None) == "/public/qr/{code}"
        and "GET" in getattr(r, "methods", set())
    )

    assert route.response_model is None, (
        "La ficha pública devuelve un JSONResponse ya construido y se declara "
        "por `responses`. Ponerle un response_model haría que FastAPI validara "
        "y filtrara una respuesta que hoy sale intacta desde la caché."
    )
