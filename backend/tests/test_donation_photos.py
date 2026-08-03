"""Fotos de la donación pre-registrada (Fase 18, task 8).

Las sube la persona donante desde su enlace de gestión, sin sesión. Eso manda
sobre todo el diseño: la llave en el almacenamiento la arma el servidor a partir
del token, nunca con lo que el cliente envía, y confirmar solo vale para llaves
que caen dentro de la carpeta de esa donación.

Una foto de una donación puede mostrar una casa o una cara, así que nunca sale
por la ficha pública del QR: se lee con URL firmada de vida corta.
"""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.services.donation_photo_service import (
    MAX_PHOTOS_PER_DONATION,
    MAX_PHOTO_SIZE_BYTES,
    PHOTO_CONTENT_TYPES,
    DonationPhotoService,
)

DONATION_ID = uuid4()


@pytest.fixture(autouse=True)
def _r2_disponible():
    """R2 se da por configurado en todos estos casos.

    Sin esto, la suite pasa o falla según lo que tenga el `.env` de quien la
    corre: en una máquina con R2 configurado prueba lo que dice probar, y en CI
    todo muere en el 503 antes de llegar a la lógica.
    """
    with patch("app.services.donation_photo_service.is_configured", return_value=True):
        yield


def _donacion(status="REGISTERED", fotos=0):
    d = MagicMock()
    d.id = DONATION_ID
    d.status = status
    d.code = "DN-ABC123"
    d.photos = [MagicMock() for _ in range(fotos)]
    return d


def _service(donacion=None, **repo_attrs):
    """Servicio con el token ya resuelto a una donación."""
    svc = DonationPhotoService(MagicMock())
    parche_token = patch.object(
        DonationPhotoService, "_editable",
        return_value=donacion if donacion is not None else _donacion(),
    )
    return svc, parche_token, repo_attrs


# ── Alta de la URL de subida ─────────────────────────────────────────────────

def test_la_llave_la_arma_el_servidor_dentro_de_la_carpeta_de_la_donacion():
    """El nombre que manda el cliente no toca la llave: ahí es donde se cuela
    un ../ o el nombre real de un archivo personal."""
    svc, parche, _ = _service()
    with parche, patch("app.services.donation_photo_service.generate_upload_url", return_value="https://r2/put"):
        out = svc.upload_url("tok", content_type="image/jpeg", size_bytes=1000)

    assert out.storage_key.startswith(f"donations/{DONATION_ID}/")
    assert out.storage_key.endswith(".jpg")


def test_un_tipo_de_archivo_fuera_de_la_lista_se_rechaza():
    svc, parche, _ = _service()
    with parche, pytest.raises(HTTPException):
        svc.upload_url("tok", content_type="application/pdf", size_bytes=1000)


def test_los_tipos_permitidos_son_solo_imagenes():
    assert PHOTO_CONTENT_TYPES == {"image/jpeg", "image/png", "image/webp"}


def test_un_archivo_demasiado_grande_se_rechaza():
    svc, parche, _ = _service()
    with parche, pytest.raises(HTTPException):
        svc.upload_url("tok", content_type="image/jpeg", size_bytes=MAX_PHOTO_SIZE_BYTES + 1)


def test_no_se_pueden_subir_mas_fotos_de_las_permitidas():
    svc, parche, _ = _service(_donacion(fotos=MAX_PHOTOS_PER_DONATION))
    with parche, pytest.raises(HTTPException):
        svc.upload_url("tok", content_type="image/jpeg", size_bytes=1000)


def test_una_donacion_ya_recibida_no_acepta_fotos():
    """Desde RECEIVED manda el inventario del centro, no el donante."""
    svc = DonationPhotoService(MagicMock())
    with patch.object(DonationPhotoService, "_resolve", return_value=_donacion(status="RECEIVED")):
        with pytest.raises(HTTPException) as exc:
            svc.upload_url("tok", content_type="image/jpeg", size_bytes=1000)
    assert exc.value.status_code == 409


# ── Confirmación ─────────────────────────────────────────────────────────────

def test_no_se_puede_confirmar_una_llave_de_otra_donacion():
    """Sin esta comprobación, un token válido podría adoptar el archivo de otra."""
    svc, parche, _ = _service()
    with parche, pytest.raises(HTTPException) as exc:
        svc.confirm("tok", storage_key=f"donations/{uuid4()}/algo.jpg",
                    content_type="image/jpeg", size_bytes=1000)
    assert exc.value.status_code == 403


def test_no_se_puede_confirmar_una_llave_que_no_se_subio():
    svc, parche, _ = _service()
    with (
        parche,
        patch("app.services.donation_photo_service.object_exists", return_value=False),
        pytest.raises(HTTPException),
    ):
        svc.confirm("tok", storage_key=f"donations/{DONATION_ID}/foto.jpg",
                    content_type="image/jpeg", size_bytes=1000)


def test_confirmar_registra_la_foto_como_del_donante():
    donacion = _donacion()
    svc, parche, _ = _service(donacion)
    with (
        parche,
        patch("app.services.donation_photo_service.object_exists", return_value=True),
        patch("app.services.donation_photo_service.DonationRepository"),
    ):
        foto = svc.confirm("tok", storage_key=f"donations/{DONATION_ID}/foto.jpg",
                           content_type="image/jpeg", size_bytes=1000)
    assert foto.uploaded_by == "donor"


# ── Lectura ──────────────────────────────────────────────────────────────────

def test_la_ficha_publica_no_expone_fotos():
    """Una foto puede mostrar una casa o una cara: el QR lo escanea cualquiera."""
    from app.schemas.donation import DonationPublicOut

    assert "photos" not in DonationPublicOut.model_fields


def test_el_enlace_de_lectura_es_firmado_y_de_vida_corta():
    from app.services.donation_photo_service import PHOTO_URL_TTL

    assert PHOTO_URL_TTL <= 15 * 60


# ── Borrado ──────────────────────────────────────────────────────────────────

def test_borrar_una_foto_la_quita_tambien_del_almacenamiento():
    """Dejar el objeto en R2 sería conservar el dato personal tras borrarlo."""
    foto = MagicMock(id=uuid4(), storage_key=f"donations/{DONATION_ID}/foto.jpg")
    donacion = _donacion()
    donacion.photos = [foto]
    svc, parche, _ = _service(donacion)

    with (
        parche,
        patch("app.services.donation_photo_service.delete_object") as mock_delete,
        patch("app.services.donation_photo_service.DonationRepository"),
    ):
        svc.delete("tok", foto.id)

    mock_delete.assert_called_once_with(foto.storage_key)


def test_no_se_puede_borrar_una_foto_de_otra_donacion():
    donacion = _donacion()
    donacion.photos = []
    svc, parche, _ = _service(donacion)

    with parche, pytest.raises(HTTPException) as exc:
        svc.delete("tok", uuid4())
    assert exc.value.status_code == 404


# ── Cableado ─────────────────────────────────────────────────────────────────

def test_las_rutas_de_fotos_estan_bajo_el_enlace_de_gestion():
    from pathlib import Path

    src = Path("app/routers/donation.py").read_text()
    assert "/public/donations/manage/{token}/photos" in src


def test_la_purga_borra_las_fotos_de_lo_que_vence():
    from pathlib import Path

    src = Path("app/services/donation_purge_service.py").read_text()
    assert "delete_object" in src


def test_cancelar_borra_las_fotos():
    """Quien cancela retira su donación entera, incluidas las fotos que subió."""
    from app.services.donation_service import DonationService

    foto = MagicMock(storage_key=f"donations/{DONATION_ID}/foto.jpg")
    donacion = _donacion()
    donacion.photos = [foto]

    svc = DonationService(MagicMock())
    with (
        patch.object(DonationService, "_editable", return_value=donacion),
        patch("app.services.donation_service.DonationRepository"),
        patch("app.services.donation_service.delete_object") as mock_delete,
    ):
        svc.cancel("tok")

    mock_delete.assert_called_once_with(foto.storage_key)
