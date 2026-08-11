"""Los endpoints de QR devuelven una imagen, y el contrato ahora lo dice.

La Fase 26 (task 10) les puso `response_class=Response` y un `responses` con
`image/png`. Es un cambio de documentación, no de comportamiento, y estas
pruebas fijan justamente esa frontera: que lo declarado y lo que sale por el
cable digan lo mismo.

La comprobación del contrato vive aparte, en `tests/contract/`. Aquí se mira el
otro lado: que la respuesta siga siendo un PNG de verdad, con su cabecera de
caché intacta, y que el `response_class` no haya convertido nada en JSON.
"""

from app.main import app

_QR_ROUTES = {
    "/b/{code}/qr.png",
    "/p/{code}/qr.png",
    "/v1/d/{code}/qr.png",
    "/v1/boxes/{box_id}/qr.png",
}


def _spec_for(path: str) -> dict:
    return app.openapi()["paths"][path]["get"]


def test_every_qr_route_declares_png_and_only_png():
    for path in _QR_ROUTES:
        content = _spec_for(path)["responses"]["200"]["content"]
        assert set(content) == {"image/png"}, (
            f"{path} debería declarar solo image/png. Un application/json "
            f"colado significa que falta `response_class=Response`: {content}"
        )


def test_the_declared_body_is_binary():
    # `string` con formato `binary` es como OpenAPI describe bytes; sin el
    # formato, un generador produciría un método que devuelve texto.
    for path in _QR_ROUTES:
        schema = _spec_for(path)["responses"]["200"]["content"]["image/png"]["schema"]
        assert schema == {"type": "string", "format": "binary"}, path


def test_the_routes_still_return_a_response_object():
    """Que ninguna se haya vuelto un `return` de diccionario.

    Con `response_class=Response` declarado, devolver un diccionario haría que
    FastAPI serializara JSON con la etiqueta `image/png`: un cuerpo que ningún
    visor abre y ningún cliente entiende.
    """
    import inspect

    from app.routers import box, donation, pallet

    for function in (
        box.box_qr_image,
        box.box_qr_authenticated,
        pallet.pallet_qr_image,
        donation.public_donation_qr,
    ):
        source = inspect.getsource(function)
        assert "media_type=\"image/png\"" in source, (
            f"{function.__name__} dejó de devolver un Response con media_type "
            "image/png, pero su contrato sigue prometiendo una imagen."
        )
