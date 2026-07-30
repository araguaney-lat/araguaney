"""Pesaje por bulto y perfiles de paletizado (Fase 21, tasks 1, 2, 4 y 9).

Dos niveles de peso, y el orden importa:

- **La caja lleva un estimado.** Sirve para documentos de contenido y se
  pre-llena del catálogo. Nadie pesa caja por caja en un centro de acopio.
- **La tarima lleva la verdad.** El peso que la cadena aérea valida es el bruto
  de báscula por bulto. Cuando existe, manda sobre la suma de estimados: la
  báscula tiene razón por definición.

La discrepancia entre ambos se muestra y no bloquea. Y el perfil de altura
advierte, tampoco bloquea: quien está en el andén ve la tarima, el sistema no.
"""

from decimal import Decimal
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.utils.weight import (
    HEIGHT_PROFILES,
    estimated_box_weight,
    height_warning,
    net_weight,
    weight_discrepancy,
)

CENTER = uuid4()


# ── Estimado por caja (task 2) ───────────────────────────────────────────────

def test_el_estimado_sale_del_catalogo_por_cantidad():
    """Nadie pesa caja por caja: el catálogo ya sabe cuánto pesa una unidad."""
    assert estimated_box_weight(unit_weight_kg=Decimal("0.5"), quantity=20) == Decimal("10.000")


def test_sin_peso_unitario_no_hay_estimado():
    """Inventar un número sería peor que dejarlo vacío: viaja a documentos."""
    assert estimated_box_weight(unit_weight_kg=None, quantity=20) is None


def test_el_estimado_ignora_cantidades_sin_sentido():
    assert estimated_box_weight(unit_weight_kg=Decimal("0.5"), quantity=0) is None


# ── Neto y discrepancia (task 4) ─────────────────────────────────────────────

def test_el_neto_descuenta_la_tara():
    assert net_weight(gross=Decimal("300"), tare=Decimal("25")) == Decimal("275")


def test_sin_tara_el_neto_es_el_bruto():
    """Una tarima sin tara capturada no invalida el pesaje."""
    assert net_weight(gross=Decimal("300"), tare=None) == Decimal("300")


def test_sin_bruto_no_hay_neto():
    assert net_weight(gross=None, tare=Decimal("25")) is None


def test_la_tara_no_puede_dejar_un_neto_negativo():
    """Un neto negativo es un error de captura, no un dato."""
    assert net_weight(gross=Decimal("10"), tare=Decimal("25")) is None


def test_la_discrepancia_compara_el_neto_contra_la_suma_de_estimados():
    d = weight_discrepancy(net=Decimal("275"), estimated=Decimal("250"))
    assert d == Decimal("25")


def test_sin_estimados_no_hay_discrepancia_que_mostrar():
    assert weight_discrepancy(net=Decimal("275"), estimated=None) is None
    assert weight_discrepancy(net=None, estimated=Decimal("250")) is None


# ── Perfiles de altura (task 9) ──────────────────────────────────────────────

def test_los_perfiles_son_un_catalogo_corto_en_codigo():
    assert set(HEIGHT_PROFILES) == {
        "LOWER_DECK_160", "XRAY_170", "MAIN_DECK_180", "SIN_RESTRICCION"
    }


def test_una_tarima_mas_alta_que_el_perfil_advierte():
    aviso = height_warning(height_cm=175, profile="LOWER_DECK_160")
    assert aviso is not None and "160" in aviso


def test_una_tarima_dentro_del_perfil_no_advierte():
    assert height_warning(height_cm=155, profile="LOWER_DECK_160") is None


def test_el_limite_exacto_pasa():
    """160 cm en un perfil de 160 cm cabe: el aviso es para lo que no cabe."""
    assert height_warning(height_cm=160, profile="LOWER_DECK_160") is None


def test_sin_restriccion_nunca_advierte():
    assert height_warning(height_cm=250, profile="SIN_RESTRICCION") is None


def test_sin_perfil_o_sin_altura_no_hay_nada_que_comparar():
    assert height_warning(height_cm=175, profile=None) is None
    assert height_warning(height_cm=None, profile="LOWER_DECK_160") is None


def test_un_perfil_desconocido_no_truena():
    """Un dato viejo o mal escrito no puede tumbar el cierre de una tarima."""
    assert height_warning(height_cm=175, profile="PERFIL_INVENTADO") is None


# ── Cierre de tarima con báscula ─────────────────────────────────────────────

def _pallet(status="OPEN"):
    p = MagicMock()
    p.id = uuid4()
    p.status = status
    p.tare_weight_kg = Decimal("25")
    p.gross_weight_kg = None
    p.height_cm = None
    return p


def _cerrar(pallet, **kwargs):
    from app.services.pallet_service import PalletService

    svc = PalletService(MagicMock())
    with patch("app.services.pallet_service.PalletRepository") as MockRepo:
        MockRepo.return_value.find_by_id.return_value = pallet
        MockRepo.return_value.find_boxes.return_value = [MagicMock()]
        return svc.close(pallet.id, center_id=CENTER, user_id=uuid4(), **kwargs)


def test_cerrar_guarda_el_peso_de_bascula_y_la_altura():
    pallet = _pallet()
    _cerrar(pallet, gross_weight_kg=Decimal("300"), height_cm=155)
    assert pallet.gross_weight_kg == Decimal("300")
    assert pallet.height_cm == 155
    assert pallet.status == "CLOSED"


def test_el_pesaje_es_opcional():
    """Una báscula descompuesta no puede impedir cerrar una tarima."""
    pallet = _pallet()
    _cerrar(pallet)
    assert pallet.status == "CLOSED" and pallet.gross_weight_kg is None


def test_un_peso_negativo_se_rechaza():
    pallet = _pallet()
    with pytest.raises(HTTPException):
        _cerrar(pallet, gross_weight_kg=Decimal("-5"))


def test_una_altura_absurda_se_rechaza():
    """Un dedazo de 1750 cm ensucia el perfil de todo el envío."""
    pallet = _pallet()
    with pytest.raises(HTTPException):
        _cerrar(pallet, height_cm=1750)


# ── Perfil en el envío ───────────────────────────────────────────────────────

def test_el_envio_declara_su_perfil_y_avisa_por_tarima():
    """El aviso se calcula al leer: cambiar el perfil no debe tocar cada tarima."""
    from app.services.shipment_service import ShipmentService

    from datetime import datetime, timezone

    envio = MagicMock(height_profile="LOWER_DECK_160")
    envio.id, envio.center_id, envio.campaign_id = uuid4(), CENTER, None
    envio.destination, envio.carrier, envio.reference = "Caracas", None, "EN-1"
    envio.status, envio.notes = "OPEN", None
    envio.closed_at = envio.shipped_at = None
    envio.created_at = datetime.now(timezone.utc)
    alta, baja = MagicMock(height_cm=175), MagicMock(height_cm=140)
    for p in (alta, baja):
        p.id, p.code, p.center_id, p.shipment_id = uuid4(), "TM-1", CENTER, envio.id
        p.status, p.notes, p.closed_at = "CLOSED", None, None
        p.created_at = datetime.now(timezone.utc)
        p.gross_weight_kg = None

    svc = ShipmentService(MagicMock())
    with (
        patch("app.services.shipment_service.ShipmentRepository") as MockShip,
        patch("app.services.shipment_service.PalletRepository") as MockPallet,
    ):
        MockShip.return_value.find_pallets.return_value = [alta, baja]
        MockPallet.return_value.find_boxes_for_pallets.return_value = {alta.id: [], baja.id: []}
        detalle = svc._build_detail(envio)

    assert len(detalle.height_warnings) == 1     # solo la que no cabe
    assert "175" in detalle.height_warnings[0]


def test_el_perfil_se_guarda_al_crear_el_envio():
    from app.schemas.shipment import ShipmentCreate

    assert "height_profile" in ShipmentCreate.model_fields


# ── Manifiesto con peso pesado (task 5) ──────────────────────────────────────

def _manifiesto(**tarima):
    from datetime import datetime, timezone

    from app.utils.manifest import (
        ManifestBoxRow, ManifestData, ManifestPalletSection, render_manifest_html,
    )

    caja = ManifestBoxRow(
        code="BX-1", display_name="Agua 1L", category="WATER", inn_name=None,
        strength=None, batch=None, expiry_date=None, quantity=10, unit="piezas",
        weight_kg=Decimal("10"),
    )
    seccion = ManifestPalletSection(code="TM-1", boxes=[caja], **tarima)
    return render_manifest_html(ManifestData(
        shipment_id="x", destination="Caracas", carrier=None, reference="EN-1",
        status="CLOSED", closed_at=datetime.now(timezone.utc), pallets=[seccion],
    ))


def test_el_manifiesto_muestra_el_peso_de_bascula_cuando_existe():
    html = _manifiesto(gross_weight_kg=Decimal("300"), tare_weight_kg=Decimal("25"))
    assert "Báscula" in html
    assert "275.000" in html          # el neto, que es lo que viaja


def test_el_manifiesto_marca_el_peso_por_caja_como_estimado():
    """Un peso por caja que nadie pesó no puede leerse como dato de báscula."""
    assert "est." in _manifiesto()


def test_el_total_prefiere_la_bascula_sobre_la_suma_de_estimados():
    """La báscula tiene razón por definición: el estimado solo llena huecos."""
    html = _manifiesto(gross_weight_kg=Decimal("300"), tare_weight_kg=Decimal("25"))
    assert "275.000 kg" in html and "(báscula)" in html


def test_sin_pesar_el_total_se_declara_estimado():
    html = _manifiesto()
    assert "10.000 kg" in html and "(estimado)" in html
