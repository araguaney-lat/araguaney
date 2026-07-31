"""Pesaje por bulto y perfiles de paletizado (Fase 21, tasks 1, 2, 4 y 9).

Dos niveles de peso, y el orden importa:

- **La caja se pesa** ya cerrada. Su peso incluye cartón, empaque y relleno, así
  que nunca es la suma de los productos que lleva dentro: por eso el catálogo es
  una referencia para cachar dedazos y no una fuente de peso.
- **La tarima se pesa** armada. Incluye base y emplaye, así que tampoco es la
  suma de sus cajas. Es el peso que la cadena aérea valida.

Pesar dos veces es factible en un centro; pesar producto por producto no lo es.
La diferencia entre niveles se muestra y no bloquea, igual que el perfil de
altura: quien está en el andén ve la tarima, el sistema no.
"""

from decimal import Decimal
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.utils.weight import (
    HEIGHT_PROFILES,
    catalog_content_weight,
    height_warning,
    net_weight,
    weight_discrepancy,
)

CENTER = uuid4()


# ── Referencia del catálogo (task 2) ─────────────────────────────────────────

def test_la_referencia_es_solo_el_contenido():
    """Cuánto pesarían los productos solos. La caja pesa más: eso es el punto."""
    assert catalog_content_weight(unit_weight_kg=Decimal("0.5"), quantity=20) == Decimal("10.000")


def test_sin_peso_unitario_no_hay_referencia():
    """Inventar un número sería peor que no mostrar nada."""
    assert catalog_content_weight(unit_weight_kg=None, quantity=20) is None


def test_la_referencia_ignora_cantidades_sin_sentido():
    assert catalog_content_weight(unit_weight_kg=Decimal("0.5"), quantity=0) is None


def test_la_referencia_no_llena_el_peso_de_la_caja():
    """Regla del dominio: el catálogo no es fuente de peso, es una alerta de
    dedazo. Quien captura escribe lo que marcó la báscula."""
    from pathlib import Path

    intake = (Path(__file__).resolve().parents[2] / "frontend" / "app" / "dashboard"
              / "intake" / "new" / "page.tsx").read_text()
    assert "weight_kg: catalogReference" not in intake
    assert "catalogReference(" in intake


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


def test_la_diferencia_compara_el_neto_contra_la_suma_de_cajas():
    """Se espera positiva y pequeña: la tarima carga emplaye y esquineros."""
    assert weight_discrepancy(net=Decimal("275"), boxes_total=Decimal("250")) == Decimal("25")


def test_una_diferencia_negativa_se_muestra_tal_cual():
    """Señal de una caja sin pesar o un dedazo: ocultarla sería peor."""
    assert weight_discrepancy(net=Decimal("240"), boxes_total=Decimal("250")) == Decimal("-10")


def test_sin_alguno_de_los_dos_no_hay_diferencia_que_mostrar():
    assert weight_discrepancy(net=Decimal("275"), boxes_total=None) is None
    assert weight_discrepancy(net=None, boxes_total=Decimal("250")) is None


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
        p.gross_weight_kg = p.tare_weight_kg = None

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


def test_el_total_prefiere_el_neto_de_la_tarima_sobre_la_suma_de_cajas():
    """La tarima incluye base y emplaye: su neto es el peso que viaja."""
    html = _manifiesto(gross_weight_kg=Decimal("300"), tare_weight_kg=Decimal("25"))
    assert "275.000 kg" in html and "(tarimas pesadas)" in html


def test_sin_tarima_pesada_el_total_declara_que_suma_cajas():
    html = _manifiesto()
    assert "10.000 kg" in html and "suma de cajas" in html


# ── Guía de paletizado (task 10) ─────────────────────────────────────────────

def test_la_guia_de_paletizado_existe_en_ambos_idiomas():
    from pathlib import Path

    raiz = Path(__file__).resolve().parents[2] / "frontend" / "content" / "manuals"
    for ruta in (raiz / "paletizado.html", raiz / "en" / "paletizado.html"):
        assert ruta.exists(), ruta
        assert len(ruta.read_text()) > 2000


def test_la_guia_explica_que_la_base_de_la_tarima_cuenta():
    """Es el error que más veces manda una tarima de regreso al andén."""
    from pathlib import Path

    raiz = Path(__file__).resolve().parents[2] / "frontend" / "content" / "manuals"
    es = (raiz / "paletizado.html").read_text()
    assert "15 cm" in es and "145" in es


def test_la_guia_advierte_del_arco_de_rayos_x():
    """Caber en el avión no basta si el escáner de la terminal es más bajo."""
    from pathlib import Path

    raiz = Path(__file__).resolve().parents[2] / "frontend" / "content" / "manuals"
    for ruta, frase in ((raiz / "paletizado.html", "más bajo que la puerta del avión"),
                        (raiz / "en" / "paletizado.html", "lower than the aircraft door")):
        assert frase in ruta.read_text(), ruta


def test_la_guia_esta_registrada_en_el_indice_de_ayuda():
    from pathlib import Path

    registro = (Path(__file__).resolve().parents[2] / "frontend" / "app" / "dashboard"
                / "ayuda" / "manuals.ts").read_text()
    assert "paletizado" in registro


# ── Guía de documentos de transporte (task 8) ────────────────────────────────

def test_la_guia_de_documentos_existe_en_ambos_idiomas():
    from pathlib import Path

    raiz = Path(__file__).resolve().parents[2] / "frontend" / "content" / "manuals"
    for ruta in (raiz / "documentos-de-transporte.html",
                 raiz / "en" / "documentos-de-transporte.html"):
        assert ruta.exists(), ruta
        assert len(ruta.read_text()) > 2000


def test_la_guia_no_da_orientacion_tributaria():
    """Es la razón por la que esta tarea dejó de necesitar un fiscalista."""
    from pathlib import Path

    raiz = Path(__file__).resolve().parents[2] / "frontend" / "content" / "manuals"
    for ruta in (raiz / "documentos-de-transporte.html",
                 raiz / "en" / "documentos-de-transporte.html"):
        texto = ruta.read_text().lower()
        for prohibido in ("regla 2.7.7", "rmf", "30 km", "deducible", "exento de"):
            assert prohibido not in texto, f"{ruta.name}: {prohibido}"


def test_la_guia_dice_a_quien_le_toca_lo_demas():
    from pathlib import Path

    raiz = Path(__file__).resolve().parents[2] / "frontend" / "content" / "manuals"
    assert "despachante" in (raiz / "documentos-de-transporte.html").read_text()


def test_la_guia_esta_registrada_en_el_indice_de_ayuda():
    from pathlib import Path

    registro = (Path(__file__).resolve().parents[2] / "frontend" / "app" / "dashboard"
                / "ayuda" / "manuals.ts").read_text()
    assert "documentos-de-transporte" in registro


def test_claude_md_registra_las_politicas_de_la_fase():
    """El contexto del proyecto tiene que describir el sistema que existe."""
    from pathlib import Path

    src = (Path(__file__).resolve().parents[2] / "CLAUDE.md").read_text()
    assert "El peso de verdad vive en la tarima" in src
    assert "los datos son nuestros, las reglas no" in src.lower()
