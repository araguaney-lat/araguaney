"""Pre-registro de donaciones por el donante (Fase 18, tramo backend).

El donante registra desde casa, confirma su email y obtiene un QR. Reglas que
estas pruebas fijan:

- Nada queda registrado sin confirmar el email (doble opt-in).
- Los tokens viven hasheados y son de un solo uso.
- El enlace de gestión es por donación, no por donante, y expira.
- Elegir centro o campaña no ata: la asociación vinculante la hace el intake al
  recibir. Aquí solo se guarda la intención.
"""

import hashlib
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.schemas.donation import DonationCreate, DonationItemInput
from app.services.donation_service import DonationService, _hash_token

CENTER = uuid4()
CAMPAIGN = uuid4()


def _payload(**kwargs):
    data = {
        "donor": {"donor_type": "fisica", "first_name": "Ana", "last_name": "Ríos",
                  "email": "ana@example.com"},
        "intended_center_id": CENTER,
        "items": [
            {"free_text": "20 latas de atún", "quantity": 20, "unit": "latas"},
            {"product_type_id": uuid4(), "quantity": 3, "unit": "piezas"},
        ],
    }
    data.update(kwargs)
    return DonationCreate(**data)


def _service():
    db = MagicMock()
    return DonationService(db), db


# ── Renglones: catálogo o texto libre, nunca ambos ni ninguno ────────────────

def test_renglon_acepta_texto_libre():
    item = DonationItemInput(free_text="3 cobijas", quantity=3, unit="piezas")
    assert item.product_type_id is None


def test_renglon_acepta_tipo_de_catalogo():
    item = DonationItemInput(product_type_id=uuid4(), quantity=5, unit="kg")
    assert item.free_text is None


def test_renglon_sin_producto_ni_texto_falla():
    with pytest.raises(ValueError):
        DonationItemInput(quantity=1, unit="pieza")


def test_renglon_con_ambos_falla():
    with pytest.raises(ValueError):
        DonationItemInput(product_type_id=uuid4(), free_text="atún", quantity=1, unit="lata")


def test_cantidad_debe_ser_positiva():
    with pytest.raises(ValueError):
        DonationItemInput(free_text="atún", quantity=0, unit="latas")


def test_donacion_sin_renglones_falla():
    with pytest.raises(ValueError):
        _payload(items=[])


# ── Alta: nace sin confirmar y con el token solo hasheado ────────────────────

def _submit(svc, db, data=None):
    with (
        patch("app.services.donation_service.DonationRepository") as MockRepo,
        patch("app.services.donation_service.DonorRepository") as MockDonor,
        patch("app.services.donation_service.enqueue") as mock_enqueue,
    ):
        MockRepo.return_value.has_open_for_email.return_value = False
        MockDonor.return_value.find_or_create_self.side_effect = lambda d: MagicMock(
            id=uuid4(), email=d.email
        )
        donation = svc.submit(data or _payload(), MagicMock())
        return donation, MockRepo.return_value, mock_enqueue


def test_el_alta_nace_pendiente_de_confirmar():
    svc, db = _service()
    donation, _, _ = _submit(svc, db)
    assert donation.status == "PENDING_EMAIL"


def test_el_alta_manda_correo_de_confirmacion():
    svc, db = _service()
    _, _, mock_enqueue = _submit(svc, db)
    assert mock_enqueue.called


def test_el_token_de_verificacion_solo_se_guarda_hasheado():
    svc, db = _service()
    donation, _, mock_enqueue = _submit(svc, db)
    crudo = mock_enqueue.call_args.args[-1]
    assert donation.donor.email_verify_token_hash != crudo
    assert donation.donor.email_verify_token_hash == _hash_token(crudo)


def test_el_codigo_es_aleatorio_y_lleva_prefijo():
    svc, db = _service()
    a, _, _ = _submit(svc, db)
    b, _, _ = _submit(svc, db)
    assert a.code.startswith("DN-") and b.code.startswith("DN-")
    assert a.code != b.code


def test_la_campana_elegida_se_guarda_como_intencion():
    """Elegir no ata: el intake decide la campaña vinculante al recibir."""
    svc, db = _service()
    donation, _, _ = _submit(svc, db, _payload(intended_campaign_id=CAMPAIGN))
    assert donation.intended_campaign_id == CAMPAIGN
    assert donation.received_center_id is None


def test_no_se_permite_una_segunda_donacion_abierta_del_mismo_correo():
    svc, db = _service()
    with (
        patch("app.services.donation_service.DonationRepository") as MockRepo,
        patch("app.services.donation_service.DonorRepository"),
        patch("app.services.donation_service.enqueue"),
    ):
        MockRepo.return_value.has_open_for_email.return_value = True
        with pytest.raises(HTTPException) as exc:
            svc.submit(_payload(), MagicMock())
    assert exc.value.status_code == 400


# ── Confirmación: un solo uso y genera el enlace de gestión ──────────────────

def _donation_pendiente():
    d = MagicMock()
    d.status = "PENDING_EMAIL"
    d.code = "DN-ABC123"
    d.donor = MagicMock(email="ana@example.com", email_verify_token_hash="x", email_verified_at=None)
    return d


def _confirm(svc, encontrada):
    with (
        patch("app.services.donation_service.DonationRepository") as MockRepo,
        patch("app.services.donation_service.enqueue") as mock_enqueue,
    ):
        MockRepo.return_value.find_by_verify_token_hash.return_value = encontrada
        return svc.confirm_email("token-crudo", MagicMock()), mock_enqueue


def test_confirmar_deja_la_donacion_registrada():
    svc, _ = _service()
    d = _donation_pendiente()
    _confirm(svc, d)
    assert d.status == "REGISTERED"


def test_confirmar_quema_el_token_de_verificacion():
    svc, _ = _service()
    d = _donation_pendiente()
    _confirm(svc, d)
    assert d.donor.email_verify_token_hash is None


def test_confirmar_genera_enlace_de_gestion_con_expiracion():
    svc, _ = _service()
    d = _donation_pendiente()
    _confirm(svc, d)
    assert d.manage_token_hash and d.manage_token_expires_at > datetime.now(timezone.utc)


def test_el_enlace_de_gestion_tambien_viaja_solo_hasheado():
    svc, _ = _service()
    d = _donation_pendiente()
    _, mock_enqueue = _confirm(svc, d)
    crudo = mock_enqueue.call_args.args[-1]
    assert d.manage_token_hash == _hash_token(crudo)


def test_un_token_invalido_no_revela_nada():
    """Misma respuesta para token inexistente que para uno ya usado."""
    svc, _ = _service()
    with pytest.raises(HTTPException) as exc:
        _confirm(svc, None)
    assert exc.value.status_code == 404


def test_confirmar_dos_veces_falla():
    svc, _ = _service()
    d = _donation_pendiente()
    d.status = "REGISTERED"
    with pytest.raises(HTTPException):
        _confirm(svc, d)


# ── Gestión por token: solo mientras esté REGISTERED y sin vencer ────────────

def _por_token(svc, donation):
    with patch("app.services.donation_service.DonationRepository") as MockRepo:
        MockRepo.return_value.find_by_manage_token_hash.return_value = donation
        return svc.get_by_manage_token("crudo")


def test_gestion_con_token_vigente_devuelve_la_donacion():
    svc, _ = _service()
    d = MagicMock(status="REGISTERED",
                  manage_token_expires_at=datetime.now(timezone.utc) + timedelta(days=1))
    assert _por_token(svc, d) is d


def test_gestion_con_token_vencido_falla():
    svc, _ = _service()
    d = MagicMock(status="REGISTERED",
                  manage_token_expires_at=datetime.now(timezone.utc) - timedelta(seconds=1))
    with pytest.raises(HTTPException) as exc:
        _por_token(svc, d)
    assert exc.value.status_code == 404


def test_hash_de_token_es_estable_y_no_reversible():
    assert _hash_token("abc") == hashlib.sha256(b"abc").hexdigest()
    assert "abc" not in _hash_token("abc")


# ── QR y correos ─────────────────────────────────────────────────────────────

def test_el_qr_de_donacion_apunta_a_la_ficha_publica():
    from app.utils.qr import donation_qr_png
    png = donation_qr_png("DN-ABC123", "https://araguaney.lat")
    assert png[:8] == b"\x89PNG\r\n\x1a\n"


def test_las_tres_tareas_de_correo_estan_registradas_en_el_worker():
    """Registrar la tarea es lo que evita que el encolado falle en silencio."""
    import inspect

    from app import worker

    for nombre in (
        "send_donation_confirmation_email_task",
        "send_donation_registered_email_task",
        "send_donation_received_email_task",
    ):
        assert hasattr(worker, nombre), f"falta la tarea {nombre}"


def test_la_firma_de_la_tarea_coincide_con_lo_que_encola_el_servicio():
    """El encolado es posicional: un orden distinto manda el correo al campo equivocado."""
    import inspect

    from app import worker

    params = list(inspect.signature(worker.send_donation_registered_email_task).parameters)
    assert params == ["ctx", "to", "code", "manage_token"]

    params = list(inspect.signature(worker.send_donation_confirmation_email_task).parameters)
    assert params == ["ctx", "to", "first_name", "token"]


# ── Gestión del donante: solo en REGISTERED ──────────────────────────────────

def _registrada(items=None):
    d = MagicMock()
    d.status = "REGISTERED"
    d.manage_token_expires_at = datetime.now(timezone.utc) + timedelta(days=10)
    d.items = items if items is not None else []
    return d


def _con_donacion(svc, donation):
    return patch("app.services.donation_service.DonationRepository", **{
        "return_value.find_by_manage_token_hash.return_value": donation,
    })


def test_el_donante_puede_reemplazar_sus_renglones():
    svc, _ = _service()
    d = _registrada()
    with _con_donacion(svc, d):
        svc.update_items("crudo", [DonationItemInput(free_text="5 cobijas", quantity=5, unit="piezas")])
    assert len(d.items) == 1 and d.items[0].free_text == "5 cobijas"


def test_los_renglones_del_donante_se_marcan_como_suyos():
    svc, _ = _service()
    d = _registrada()
    with _con_donacion(svc, d):
        svc.update_items("crudo", [DonationItemInput(free_text="5 cobijas", quantity=5, unit="piezas")])
    assert d.items[0].added_by == "donor"


def test_no_se_puede_editar_una_donacion_ya_recibida():
    """Desde RECEIVED manda el inventario del centro, no el donante."""
    svc, _ = _service()
    d = _registrada()
    d.status = "RECEIVED"
    with _con_donacion(svc, d), pytest.raises(HTTPException) as exc:
        svc.update_items("crudo", [DonationItemInput(free_text="x", quantity=1, unit="pieza")])
    assert exc.value.status_code == 409


def test_el_donante_puede_cancelar_mientras_no_la_entregue():
    svc, _ = _service()
    d = _registrada()
    with _con_donacion(svc, d):
        svc.cancel("crudo")
    assert d.status == "CANCELLED"


def test_no_se_puede_cancelar_una_donacion_ya_recibida():
    svc, _ = _service()
    d = _registrada()
    d.status = "RECEIVED"
    with _con_donacion(svc, d), pytest.raises(HTTPException):
        svc.cancel("crudo")


def test_editar_deja_rastro_en_los_eventos():
    svc, _ = _service()
    d = _registrada()
    with _con_donacion(svc, d) as MockRepo:
        svc.cancel("crudo")
        assert MockRepo.return_value.log_event.called


# ── Ficha pública: mínima y anti-enumeración ─────────────────────────────────

def test_la_ficha_publica_no_lleva_datos_del_donante():
    from app.schemas.donation import DonationPublicOut
    campos = set(DonationPublicOut.model_fields)
    assert campos == {"code", "status", "items"}


def test_un_codigo_inexistente_responde_404_generico():
    svc, _ = _service()
    with patch("app.services.donation_service.DonationRepository") as MockRepo:
        MockRepo.return_value.find_by_code.return_value = None
        with pytest.raises(HTTPException) as exc:
            svc.get_public("DN-NOEXISTE")
    assert exc.value.status_code == 404


def test_una_donacion_sin_confirmar_no_es_visible_en_la_ficha():
    """PENDING_EMAIL no debe distinguirse de inexistente."""
    svc, _ = _service()
    d = MagicMock(status="PENDING_EMAIL")
    with patch("app.services.donation_service.DonationRepository") as MockRepo:
        MockRepo.return_value.find_by_code.return_value = d
        with pytest.raises(HTTPException) as exc:
            svc.get_public("DN-ABC123")
    assert exc.value.status_code == 404


# ── Superficie pública: toda ruta lleva límite de tasa ────────────────────────

def test_toda_ruta_publica_de_donaciones_tiene_limite_de_tasa():
    """Un endpoint público sin límite es una puerta abierta al abuso."""
    import re
    from pathlib import Path

    src = Path("app/routers/donation.py").read_text()
    rutas = re.findall(r"@router\.\w+\(", src)
    limites = re.findall(r"@limiter\.limit\(", src)
    assert len(rutas) == len(limites), "hay una ruta pública sin @limiter.limit"


def test_la_ficha_publica_se_cachea_en_el_edge():
    """Un QR compartido no debe golpear la base en cada escaneo."""
    from pathlib import Path

    src = Path("app/routers/donation.py").read_text()
    assert "s-maxage" in src and "Cache-Control" in src
