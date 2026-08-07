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
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

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
        # Fase 20: el formulario público no deja registrar sin aceptar.
        "terms_accepted": True,
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
        MockRepo.return_value.find_open_for_email.return_value = None
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


def _submit_con_donacion_abierta(abierta):
    """Alta de un correo que ya tiene una donación abierta."""
    svc, _ = _service()
    with (
        patch("app.services.donation_service.DonationRepository") as MockRepo,
        patch("app.services.donation_service.DonorRepository"),
        patch("app.services.donation_service.enqueue") as mock_enqueue,
    ):
        MockRepo.return_value.find_open_for_email.return_value = abierta
        resultado = svc.submit(_payload(), MagicMock())
        return resultado, MockRepo.return_value, mock_enqueue


def test_no_se_crea_una_segunda_donacion_abierta_del_mismo_correo():
    abierta = MagicMock(status="PENDING_EMAIL")
    _, repo, _ = _submit_con_donacion_abierta(abierta)
    assert not repo.save.called


def test_el_alta_no_delata_que_un_correo_ya_tiene_donacion():
    """Antes respondía 400 DUPLICATE_DONATION: eso convertía al formulario
    público en un verificador de correos ajenos. Ahora no distingue."""
    resultado, _, _ = _submit_con_donacion_abierta(MagicMock(status="PENDING_EMAIL"))
    assert resultado is None      # el router responde igual con o sin donación


def test_un_reintento_reenvia_la_confirmacion_a_quien_si_es_dueno(monkeypatch):
    """Quien de verdad es dueño del correo recibe el enlace otra vez; quien solo
    está probando direcciones no recibe nada y no ve diferencia."""
    abierta = MagicMock(status="PENDING_EMAIL")
    abierta.donor = MagicMock(email="ana@example.com", first_name="Ana",
                              email_verify_token_hash="hash-viejo")
    _, _, mock_enqueue = _submit_con_donacion_abierta(abierta)

    assert mock_enqueue.call_args[0][1] == "send_donation_confirmation_email_task"
    assert abierta.donor.email_verify_token_hash != "hash-viejo"


def test_un_reintento_sobre_una_donacion_ya_confirmada_no_manda_nada():
    """Ya tiene su QR en el correo: reenviar solo daría ruido, y rotar su enlace
    de gestión dejaría que un tercero se lo tumbara a voluntad."""
    abierta = MagicMock(status="REGISTERED")
    _, _, mock_enqueue = _submit_con_donacion_abierta(abierta)
    assert not mock_enqueue.called


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


# ── Recepción en el centro ───────────────────────────────────────────────────

def _para_recibir():
    d = MagicMock()
    d.status = "REGISTERED"
    d.code = "DN-ABC123"
    d.received_center_id = None
    it1, it2 = MagicMock(reception_status=None), MagicMock(reception_status=None)
    it1.id, it2.id = uuid4(), uuid4()
    d.items = [it1, it2]
    return d


def _recibir(svc, donation, resultados=None, extras=None, centro=CENTER):
    with patch("app.services.donation_service.DonationRepository") as MockRepo:
        MockRepo.return_value.find_by_code.return_value = donation
        out = svc.receive(
            "DN-ABC123",
            resultados if resultados is not None else {},
            extras or [],
            center_id=centro,
            user_id=uuid4(),
        )
        return out, MockRepo.return_value


def test_recibir_marca_el_centro_que_realmente_recibio():
    """El centro elegido por el donante era intención; este es el hecho."""
    svc, _ = _service()
    d = _para_recibir()
    _recibir(svc, d)
    assert d.received_center_id == CENTER and d.status == "RECEIVED"


def test_lo_no_marcado_se_da_por_recibido():
    """El formulario optimiza para el caso normal: solo se marca la excepción."""
    svc, _ = _service()
    d = _para_recibir()
    _recibir(svc, d)
    assert all(i.reception_status == "RECEIVED" for i in d.items)


def test_se_registran_las_excepciones_marcadas():
    svc, _ = _service()
    d = _para_recibir()
    _recibir(svc, d, {str(d.items[0].id): "MISSING"})
    assert d.items[0].reception_status == "MISSING"
    assert d.items[1].reception_status == "RECEIVED"


def test_lo_que_vino_de_mas_se_marca_como_agregado_por_el_centro():
    svc, _ = _service()
    d = _para_recibir()
    _recibir(svc, d, None, [DonationItemInput(free_text="2 cajas de leche", quantity=2, unit="cajas")])
    agregados = [i for i in d.items if getattr(i, "added_by", None) == "center"]
    assert len(agregados) == 1


def test_no_se_puede_recibir_dos_veces():
    svc, _ = _service()
    d = _para_recibir()
    d.status = "RECEIVED"
    with pytest.raises(HTTPException) as exc:
        _recibir(svc, d)
    assert exc.value.status_code == 409


def test_no_se_puede_recibir_una_donacion_cancelada():
    svc, _ = _service()
    d = _para_recibir()
    d.status = "CANCELLED"
    with pytest.raises(HTTPException):
        _recibir(svc, d)


def test_recibir_deja_evento_de_auditoria():
    svc, _ = _service()
    d = _para_recibir()
    _, repo = _recibir(svc, d)
    assert repo.log_event.called


def test_un_estado_de_recepcion_invalido_se_rechaza():
    svc, _ = _service()
    d = _para_recibir()
    with pytest.raises(HTTPException):
        _recibir(svc, d, {str(d.items[0].id): "PERDIDO_EN_EL_CAMINO"})


def test_el_intake_creado_desde_una_donacion_queda_ligado():
    """Trazabilidad donante → cajas: sin esto el pre-registro se pierde al recibir."""
    from app.schemas.intake import IntakeCreate

    campos = IntakeCreate.model_fields
    assert "donation_id" in campos, "IntakeCreate debe aceptar la donación de origen"


def _box_draft():
    """Una caja mínima válida: el intake exige al menos una."""
    bd = MagicMock()
    bd.product_type_id = uuid4()
    bd.quantity = 1
    bd.unit = "cajas"
    bd.batch = None
    bd.expiry_date = None
    bd.weight_kg = None
    bd.gtin = None
    return bd


@contextmanager
def _intake_patches():
    """Aísla al IntakeService de todo lo que no es el vínculo con la donación."""
    with (
        patch("app.services.intake_service.CampaignRepository") as MockCampaign,
        patch("app.services.intake_service.ProductTypeRepository") as MockPt,
        patch("app.services.intake_service.IntakeRepository") as MockIntake,
        patch("app.services.intake_service.UserCampaignRepository") as MockMembership,
        patch("app.services.intake_service.validate_box", return_value=None),
        patch("app.services.intake_service.IntakeOut"),
        patch("app.services.intake_service.BoxOut"),
        # La respuesta no es lo que se prueba: armarla exigiría un donante ORM real.
        patch("app.services.intake_service.DonorOut"),
    ):
        campaign = MagicMock()
        campaign.is_active = True
        MockCampaign.return_value.find_by_id.return_value = campaign
        MockMembership.return_value.is_member.return_value = True
        MockPt.return_value.find_by_id.return_value = MagicMock(category="OTHER", min_shelf_life_days=None)
        MockIntake.return_value.save_intake.side_effect = lambda i: i
        yield MockIntake, MockPt


def test_el_intake_hereda_al_donante_del_pre_registro():
    """Quien ya se identificó al pre-registrarse no se vuelve a teclear.

    Si el mostrador lo recapturara a mano saldría un segundo donante con los
    mismos datos, y el histórico del donante quedaría partido en dos.
    """
    from app.services.intake_service import IntakeService

    center = uuid4()
    donor = MagicMock()
    donor.id = uuid4()
    donacion = MagicMock()
    donacion.received_center_id = center
    donacion.donor = donor

    db = MagicMock()
    db.get.return_value = donacion

    data = MagicMock()
    data.boxes = [_box_draft()]
    data.donor = None               # el mostrador no recaptura al donante
    data.donation_id = uuid4()
    data.capture_id = None      # captura en línea, sin llave de idempotencia
    data.donante_libre = None
    data.notes = None

    with _intake_patches() as (MockIntake, _):
        IntakeService(db).create(data, center, uuid4())
        intake = MockIntake.return_value.save_intake.call_args[0][0]

    assert intake.donor_id == donor.id
    assert donacion.intake_id == intake.id


def test_un_pre_registro_de_otro_centro_no_contamina_el_intake():
    """El scoping de tenant también aplica al pre-registro: una donación
    recibida en otro centro no puede ligarse ni prestar su donante."""
    from app.services.intake_service import IntakeService

    donacion = MagicMock()
    donacion.received_center_id = uuid4()      # otro centro
    donacion.intake_id = None

    db = MagicMock()
    db.get.return_value = donacion

    data = MagicMock()
    data.boxes = [_box_draft()]
    data.donor = None
    data.donation_id = uuid4()
    data.capture_id = None      # captura en línea, sin llave de idempotencia
    data.donante_libre = None
    data.notes = None

    with _intake_patches() as (MockIntake, _):
        IntakeService(db).create(data, uuid4(), uuid4())
        intake = MockIntake.return_value.save_intake.call_args[0][0]

    assert intake.donor_id is None
    assert donacion.intake_id is None


# ── Reenvío del correo de confirmación ───────────────────────────────────────

def _pendiente(email="quien@ejemplo.test"):
    d = MagicMock()
    d.status = "PENDING_EMAIL"
    d.donor = MagicMock(email=email, first_name="Quien", email_verify_token_hash="hash-viejo")
    return d


def test_reenviar_rota_el_token(monkeypatch):
    """El enlace anterior deja de servir: si no, un correo filtrado seguiría vivo."""
    svc, bg = _service()
    d = _pendiente()

    with patch("app.services.donation_service.DonationRepository") as MockRepo:
        MockRepo.return_value.find_pending_by_email.return_value = d
        svc.resend("quien@ejemplo.test", bg)

    assert d.donor.email_verify_token_hash != "hash-viejo"


def test_reenviar_manda_el_correo_con_el_token_nuevo():
    svc, bg = _service()
    d = _pendiente()

    with (
        patch("app.services.donation_service.DonationRepository") as MockRepo,
        patch("app.services.donation_service.enqueue") as mock_enqueue,
    ):
        MockRepo.return_value.find_pending_by_email.return_value = d
        svc.resend("quien@ejemplo.test", bg)

    nombre, destino, _, token = mock_enqueue.call_args[0][1:]
    assert nombre == "send_donation_confirmation_email_task"
    assert destino == "quien@ejemplo.test"
    assert _hash_token(token) == d.donor.email_verify_token_hash


def test_reenviar_a_un_correo_desconocido_no_lo_delata():
    """Misma respuesta exista o no: si no, el formulario sería un verificador de correos."""
    svc, bg = _service()

    with (
        patch("app.services.donation_service.DonationRepository") as MockRepo,
        patch("app.services.donation_service.enqueue") as mock_enqueue,
    ):
        MockRepo.return_value.find_pending_by_email.return_value = None
        svc.resend("nadie@ejemplo.test", bg)     # no levanta

    assert not mock_enqueue.called


def test_reenviar_reinicia_el_reloj_de_la_purga():
    """Sin esto, pedir el correo de nuevo el último día no serviría de nada."""
    svc, bg = _service()
    d = _pendiente()

    with patch("app.services.donation_service.DonationRepository") as MockRepo:
        MockRepo.return_value.find_pending_by_email.return_value = d
        svc.resend("quien@ejemplo.test", bg)

    assert d.confirmation_sent_at is not None


def test_el_reenvio_esta_en_el_router_publico():
    from pathlib import Path

    src = Path("app/routers/donation.py").read_text()
    assert "/public/donations/resend" in src


# ── Topes de entrada (pasada de seguridad, task 19) ──────────────────────────

def test_un_renglon_no_puede_llevar_un_texto_gigante():
    """Endpoint público sin sesión: sin tope, un renglón puede pesar megabytes."""
    with pytest.raises(ValidationError):
        DonationItemInput(free_text="x" * 5_000, quantity=1, unit="piezas")


def test_la_unidad_tiene_tope():
    with pytest.raises(ValidationError):
        DonationItemInput(free_text="3 cobijas", quantity=3, unit="u" * 500)


def test_las_notas_tienen_tope():
    with pytest.raises(ValidationError):
        _payload(notes="x" * 5_000)


def test_los_datos_del_donante_tienen_tope():
    from app.schemas.donor import DonorInput

    with pytest.raises(ValidationError):
        DonorInput(first_name="a" * 500, last_name="Pérez", email="ana@example.com")


def test_la_edicion_del_donante_tiene_tope_de_renglones():
    """El enlace de gestión es legítimo, pero no es un permiso ilimitado de escritura."""
    from app.routers.donation import ItemsIn

    renglon = {"free_text": "3 cobijas", "quantity": 3, "unit": "piezas"}
    with pytest.raises(ValidationError):
        ItemsIn(items=[renglon] * 200)


def test_la_recepcion_tiene_tope_de_renglones_extra():
    from app.routers.donation import ReceiveIn

    renglon = {"free_text": "3 cobijas", "quantity": 3, "unit": "piezas"}
    with pytest.raises(ValidationError):
        ReceiveIn(results={}, extras=[renglon] * 200)


def test_el_doble_check_tiene_tope_de_resultados():
    from app.routers.donation import ReceiveIn

    with pytest.raises(ValidationError):
        ReceiveIn(results={str(uuid4()): "RECEIVED" for _ in range(200)}, extras=[])


def test_lo_autenticado_no_se_cachea():
    """La ficha pública se cachea en el borde; el listado de un centro no."""
    from pathlib import Path

    src = Path("app/routers/donation.py").read_text()
    assert '_NO_CACHE = "no-store"' in src
    assert src.count("_NO_CACHE") >= 3


# ── Correos que cierran el ciclo (tasks 10 y 21) ─────────────────────────────

def test_recibir_avisa_al_donante():
    """La plantilla del resumen existía desde la task 10 pero nadie la disparaba."""
    svc, _ = _service()
    d = _para_recibir()
    d.donor = MagicMock(email="ana@example.com")

    with (
        patch("app.services.donation_service.DonationRepository") as MockRepo,
        patch("app.services.donation_service.enqueue") as mock_enqueue,
    ):
        MockRepo.return_value.find_by_code.return_value = d
        svc.receive("DN-ABC123", {}, [], center_id=CENTER, user_id=uuid4(),
                    background_tasks=MagicMock())

    assert mock_enqueue.call_args[0][1] == "send_donation_received_email_task"


def test_recibir_sin_correo_del_donante_no_intenta_avisar():
    """Un donante capturado en ventanilla puede no haber dado correo."""
    svc, _ = _service()
    d = _para_recibir()
    d.donor = MagicMock(email=None)

    with (
        patch("app.services.donation_service.DonationRepository") as MockRepo,
        patch("app.services.donation_service.enqueue") as mock_enqueue,
    ):
        MockRepo.return_value.find_by_code.return_value = d
        svc.receive("DN-ABC123", {}, [], center_id=CENTER, user_id=uuid4(),
                    background_tasks=MagicMock())

    assert not mock_enqueue.called


def test_el_correo_de_despacho_existe_y_esta_registrado():
    from app.email import send_donation_shipped_email
    from app.worker import WorkerSettings

    nombres = [f.__name__ if hasattr(f, "__name__") else f.coroutine.__name__
               for f in WorkerSettings.functions]
    assert "send_donation_shipped_email_task" in nombres
    assert callable(send_donation_shipped_email)


def test_despachar_avisa_a_quien_pre_registro_lo_que_iba_en_el_envio():
    """Cierra el círculo: la persona que donó se entera de que su ayuda salió."""
    from app.services.shipment_service import ShipmentService

    donacion = MagicMock(code="DN-ABC123")
    donacion.donor = MagicMock(email="ana@example.com")

    db = MagicMock()
    svc = ShipmentService(db)

    with (
        patch("app.services.shipment_service.ShipmentRepository") as MockShip,
        patch("app.services.shipment_service.PalletRepository") as MockPallet,
        patch("app.services.shipment_service.DonationRepository") as MockDon,
        patch("app.services.shipment_service.enqueue") as mock_enqueue,
    ):
        envio = MagicMock(status="CLOSED", reference="EN-0001")
        MockShip.return_value.find_by_id.return_value = envio
        MockShip.return_value.find_pallets.return_value = []
        MockPallet.return_value.find_boxes_for_pallets.return_value = {}
        MockDon.return_value.find_donations_for_shipment.return_value = [donacion]

        svc.ship(uuid4(), center_id=CENTER, user_id=uuid4(), background_tasks=MagicMock())

    nombre, destino, code, referencia = mock_enqueue.call_args[0][1:]
    assert nombre == "send_donation_shipped_email_task"
    assert (destino, code, referencia) == ("ana@example.com", "DN-ABC123", "EN-0001")
