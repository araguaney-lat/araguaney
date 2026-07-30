"""El catálogo aprende de cada intake: el GTIN escaneado queda ligado al producto.

Open Food Facts solo cubre alimentos, así que medicamentos, higiene e insumos
médicos nunca se resuelven por esa vía. La única fuente que crece con el uso es
lo que la gente del centro ya está capturando a mano: si alguien escanea un
código, no aparece, y elige el tipo de producto correcto, esa asociación vale
para todos los escaneos siguientes.
"""

from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.repositories.product_type_repository import ProductTypeRepository
from app.services.intake_service import IntakeService

CENTER_ID = uuid4()
USER_ID = uuid4()
CAMPAIGN_ID = uuid4()
PT_ID = uuid4()
VALID_GTIN = "7501055363513"     # Ades coco, EAN-13 con dígito verificador correcto
OTHER_GTIN = "3017620422003"     # Nutella


def _box_draft(gtin=None):
    bd = MagicMock()
    bd.product_type_id = PT_ID
    bd.quantity = 10
    bd.unit = "latas"
    bd.batch = "L001"
    bd.expiry_date = None
    bd.weight_kg = None
    bd.gtin = gtin
    return bd


def _service_with(boxes):
    db = MagicMock()
    svc = IntakeService(db)
    data = MagicMock()
    data.boxes = boxes
    data.campaign_id = CAMPAIGN_ID
    data.donante_libre = None
    data.donor = None            # intake anonimo: la norma del dominio
    data.notes = None
    return svc, data, db


def _run_intake(boxes):
    svc, data, db = _service_with(boxes)
    pt = MagicMock()
    pt.id = PT_ID
    pt.category = "FOOD"
    pt.min_shelf_life_days = None

    with (
        patch("app.services.intake_service.CampaignRepository") as MockCampaign,
        patch("app.services.intake_service.ProductTypeRepository") as MockPt,
        patch("app.services.intake_service.IntakeRepository") as MockIntake,
        patch("app.services.intake_service.UserCampaignRepository") as MockMembership,
        patch("app.services.intake_service.validate_box", return_value=None),
        # La respuesta no es lo que se prueba aquí, y armarla exige objetos ORM reales.
        patch("app.services.intake_service.IntakeOut"),
        patch("app.services.intake_service.BoxOut"),
    ):
        campaign = MagicMock()
        campaign.id = CAMPAIGN_ID
        campaign.is_active = True
        MockCampaign.return_value.find_by_id.return_value = campaign
        MockMembership.return_value.is_member.return_value = True
        MockPt.return_value.find_by_id.return_value = pt
        MockIntake.return_value.save_intake.side_effect = lambda i: i

        svc.create(data, CENTER_ID, USER_ID)
        return MockPt.return_value


# ── Aprendizaje en el intake ──────────────────────────────────────────────────

def test_gtin_escaneado_queda_ligado_al_producto():
    pt_repo = _run_intake([_box_draft(gtin=VALID_GTIN)])
    pt_repo.link_gtin.assert_called_once()
    kwargs = pt_repo.link_gtin.call_args.kwargs
    assert kwargs["gtin"] == VALID_GTIN
    assert kwargs["product_type_id"] == PT_ID
    assert kwargs["user_id"] == USER_ID


def test_sin_gtin_no_se_liga_nada():
    pt_repo = _run_intake([_box_draft(gtin=None)])
    pt_repo.link_gtin.assert_not_called()


def test_gtin_invalido_se_ignora_sin_romper_el_intake():
    # Dígito verificador incorrecto: no es un EAN-13 real.
    pt_repo = _run_intake([_box_draft(gtin="7501055363519")])
    pt_repo.link_gtin.assert_not_called()


def test_gtin_se_normaliza_antes_de_guardarse():
    pt_repo = _run_intake([_box_draft(gtin=" 750-1055 363513 ")])
    assert pt_repo.link_gtin.call_args.kwargs["gtin"] == VALID_GTIN


# ── Reglas del repositorio ────────────────────────────────────────────────────

def test_link_gtin_no_duplica_una_asociacion_existente():
    db = MagicMock()
    repo = ProductTypeRepository(db)
    existente = MagicMock()
    existente.product_type_id = PT_ID
    db.execute.return_value.scalar_one_or_none.return_value = existente

    resultado = repo.link_gtin(product_type_id=PT_ID, gtin=VALID_GTIN, user_id=USER_ID)

    assert resultado is existente
    db.add.assert_not_called()


def test_link_gtin_no_le_roba_el_codigo_a_otro_producto():
    """Un GTIN ya ligado a otro producto se respeta: gana quien lo capturó primero."""
    db = MagicMock()
    repo = ProductTypeRepository(db)
    de_otro = MagicMock()
    de_otro.product_type_id = uuid4()
    db.execute.return_value.scalar_one_or_none.return_value = de_otro

    resultado = repo.link_gtin(product_type_id=PT_ID, gtin=OTHER_GTIN, user_id=USER_ID)

    assert resultado is None
    db.add.assert_not_called()
