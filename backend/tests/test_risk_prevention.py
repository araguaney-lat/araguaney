"""Prevención de riesgos en donaciones en especie (Fase 20, tasks 3 y 10).

Dos controles que se sostienen entre sí:

- **Aceptación registrada.** La donación es una transferencia irrevocable, sin
  derecho a designar destino. Quien dona lo acepta, y queda la versión y la
  fecha de lo que aceptó.
- **Umbral de volumen.** El escrutinio por tipo de donante tiene una evasión
  obvia: registrarse como persona física. A partir de cierto volumen el anonimato
  se acaba, sea quien sea. Es escalamiento, no tope duro: un tope invita a partir
  la donación en pedazos, que es la técnica clásica.

El valor del umbral vive solo en el entorno. Aquí se prueba el mecanismo con
valores de prueba, nunca los operativos.
"""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.legal import CURRENT_DONATION_TERMS_VERSION
from app.utils.volume import exceeds_volume_threshold


# ── Umbral: mecanismo ────────────────────────────────────────────────────────

def test_sin_umbral_configurado_el_control_esta_apagado(monkeypatch):
    """El valor operativo vive en el entorno, no en este repositorio público.

    Sin configurar, no hay umbral que aplicar: el control lo enciende quien
    opera, que es quien sabe qué volumen es normal en su contexto.
    """
    monkeypatch.delenv("DONATION_VOLUME_THRESHOLD_BOXES", raising=False)
    monkeypatch.delenv("DONATION_VOLUME_THRESHOLD_KG", raising=False)
    assert exceeds_volume_threshold(boxes=10_000, kg=10_000) is False


def test_el_umbral_de_cajas_dispara(monkeypatch):
    monkeypatch.setenv("DONATION_VOLUME_THRESHOLD_BOXES", "10")
    assert exceeds_volume_threshold(boxes=11, kg=None) is True
    assert exceeds_volume_threshold(boxes=10, kg=None) is False


def test_el_umbral_de_peso_dispara(monkeypatch):
    monkeypatch.setenv("DONATION_VOLUME_THRESHOLD_KG", "100")
    assert exceeds_volume_threshold(boxes=1, kg=101) is True
    assert exceeds_volume_threshold(boxes=1, kg=100) is False


def test_cualquiera_de_los_dos_umbrales_basta(monkeypatch):
    """Se mide con lo que el sistema ya tiene. No hay valor comercial que medir,
    y eso es deliberado."""
    monkeypatch.setenv("DONATION_VOLUME_THRESHOLD_BOXES", "10")
    monkeypatch.setenv("DONATION_VOLUME_THRESHOLD_KG", "100")
    assert exceeds_volume_threshold(boxes=1, kg=500) is True
    assert exceeds_volume_threshold(boxes=50, kg=1) is True


def test_un_umbral_mal_escrito_no_tumba_la_captura(monkeypatch):
    """Una variable de entorno con basura no puede impedir que un centro capture."""
    monkeypatch.setenv("DONATION_VOLUME_THRESHOLD_BOXES", "muchas")
    assert exceeds_volume_threshold(boxes=99, kg=None) is False


def test_los_valores_operativos_no_viven_en_el_repositorio():
    """El mecanismo se publica; el parámetro que determina cuándo salta, no."""
    from pathlib import Path

    src = Path("app/utils/volume.py").read_text()
    assert "os.environ" in src
    # Sin defaults numéricos: un default sería publicar el umbral.
    assert "DONATION_VOLUME_THRESHOLD_BOXES\", \"" not in src


# ── Umbral en el intake: sobre el umbral no hay anonimato ────────────────────

def _intake_data(donor=None, boxes=1, weight=None):
    data = MagicMock()
    data.donor = donor
    data.donation_id = None
    data.donante_libre = None
    data.notes = None
    data.donor_terms_accepted = True
    data.boxes = []
    for _ in range(boxes):
        bd = MagicMock()
        bd.product_type_id = uuid4()
        bd.quantity = 1
        bd.unit = "cajas"
        bd.batch = None
        bd.expiry_date = None
        bd.weight_kg = weight
        bd.gtin = None
        data.boxes.append(bd)
    return data


def _correr_intake(data):
    from app.services.intake_service import IntakeService

    db = MagicMock()
    db.get.return_value = None
    with (
        patch("app.services.intake_service.CampaignRepository") as MockCampaign,
        patch("app.services.intake_service.ProductTypeRepository") as MockPt,
        patch("app.services.intake_service.IntakeRepository") as MockIntake,
        patch("app.services.intake_service.UserCampaignRepository") as MockMembership,
        patch("app.services.intake_service.DonorRepository"),
        patch("app.services.intake_service.validate_box", return_value=None),
        patch("app.services.intake_service.IntakeOut"),
        patch("app.services.intake_service.BoxOut"),
        patch("app.services.intake_service.DonorOut"),
    ):
        campaign = MagicMock()
        campaign.is_active = True
        MockCampaign.return_value.find_by_id.return_value = campaign
        MockMembership.return_value.is_member.return_value = True
        MockPt.return_value.find_by_id.return_value = MagicMock(
            category="OTHER", min_shelf_life_days=None
        )
        MockIntake.return_value.save_intake.side_effect = lambda i: i
        IntakeService(db).create(data, uuid4(), uuid4())
        return MockIntake.return_value.save_intake.call_args[0][0]


def test_una_captura_anonima_sobre_el_umbral_exige_identificar_al_donante(monkeypatch):
    """Lo fuerza el sistema, no la memoria de quien captura."""
    monkeypatch.setenv("DONATION_VOLUME_THRESHOLD_BOXES", "3")
    with pytest.raises(HTTPException) as exc:
        _correr_intake(_intake_data(donor=None, boxes=5))
    assert exc.value.status_code == 400


def test_una_captura_anonima_bajo_el_umbral_sigue_siendo_anonima(monkeypatch):
    """La donación anónima es la norma del dominio y no se toca sin razón."""
    monkeypatch.setenv("DONATION_VOLUME_THRESHOLD_BOXES", "3")
    intake = _correr_intake(_intake_data(donor=None, boxes=2))
    assert intake.donor_id is None


def test_sobre_el_umbral_con_donante_registrado_la_captura_procede(monkeypatch):
    monkeypatch.setenv("DONATION_VOLUME_THRESHOLD_BOXES", "3")
    donor = MagicMock(donor_type="fisica")
    intake = _correr_intake(_intake_data(donor=donor, boxes=5))
    assert intake is not None


# ── Aceptación de términos ───────────────────────────────────────────────────

def test_el_pre_registro_exige_aceptar_los_terminos():
    """Sin aceptación no hay transferencia de propiedad que registrar."""
    from app.schemas.donation import DonationCreate

    with pytest.raises(ValidationError):
        DonationCreate(
            donor={"donor_type": "fisica", "first_name": "Ana", "last_name": "P",
                   "email": "ana@ejemplo.test"},
            items=[{"free_text": "3 cobijas", "quantity": 3, "unit": "piezas"}],
            terms_accepted=False,
        )


def test_el_pre_registro_guarda_version_y_fecha_de_lo_aceptado():
    from app.services.donation_service import DonationService

    svc = DonationService(MagicMock())
    data = MagicMock()
    data.donor = MagicMock(email="ana@ejemplo.test")
    data.items = []
    data.notes = None
    data.intended_center_id = None
    data.intended_campaign_id = None

    with (
        patch("app.services.donation_service.DonationRepository") as MockRepo,
        patch("app.services.donation_service.DonorRepository"),
        patch("app.services.donation_service.enqueue"),
    ):
        MockRepo.return_value.find_open_for_email.return_value = None
        donation = svc.submit(data, MagicMock())

    assert donation.terms_version == CURRENT_DONATION_TERMS_VERSION
    assert donation.terms_accepted_at is not None


def test_una_persona_moral_siempre_acepta_los_terminos():
    """Quien dona a nombre de una empresa acepta en el mostrador, sin excepción."""
    from app.services.intake_service import IntakeService  # noqa: F401

    donor = MagicMock(donor_type="moral")
    data = _intake_data(donor=donor)
    data.donor_terms_accepted = False

    with pytest.raises(HTTPException) as exc:
        _correr_intake(data)
    assert exc.value.status_code == 400


def test_el_intake_con_donante_guarda_la_version_aceptada():
    donor = MagicMock(donor_type="fisica")
    intake = _correr_intake(_intake_data(donor=donor))
    assert intake.donor_terms_version == CURRENT_DONATION_TERMS_VERSION


def test_una_captura_anonima_no_registra_aceptacion():
    """No hay a quién atribuírsela: nadie se identificó."""
    intake = _correr_intake(_intake_data(donor=None))
    assert intake.donor_terms_version is None


# ── Volumen atípico en el pre-registro: marca, no bloquea ────────────────────

def test_el_pre_registro_sobre_el_umbral_queda_marcado(monkeypatch):
    """El donante ya viene identificado, así que no se bloquea nada: se marca
    para que el doble check se haga con la guía de banderas rojas a la mano."""
    monkeypatch.setenv("DONATION_VOLUME_THRESHOLD_BOXES", "3")
    from app.services.donation_service import DonationService

    svc = DonationService(MagicMock())
    data = MagicMock()
    data.donor = MagicMock(email="ana@ejemplo.test")
    data.items = [MagicMock(quantity=10, product_type_id=None, free_text="x", unit="cajas")]
    data.notes = None
    data.intended_center_id = None
    data.intended_campaign_id = None

    with (
        patch("app.services.donation_service.DonationRepository") as MockRepo,
        patch("app.services.donation_service.DonorRepository"),
        patch("app.services.donation_service.enqueue"),
    ):
        MockRepo.return_value.find_open_for_email.return_value = None
        donation = svc.submit(data, MagicMock())

    assert donation.atypical_volume is True
