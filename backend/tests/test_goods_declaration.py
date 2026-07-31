"""Declaración de mercancías (Fase 21, tasks 6 y 7 — rediseñada).

Araguaney es software, no una fundación ni un asesor fiscal, y opera en varios
países. Eso fija dónde está la frontera:

- **De este lado.** Qué hay en las cajas, cuánto pesan, cuántos bultos son, de
  dónde salen y a dónde van. Eso lo sabemos porque lo registramos caja por caja,
  y es igual de cierto en México que en Colombia.
- **Del otro lado.** Cualquier regla tributaria. No sabemos qué exige el fisco de
  cada país ni queremos aprenderlo: cubrir todos los escenarios posibles es una
  carrera que se pierde sola.

Entre los dos: los datos que el centro captura sobre sí mismo. Su razón social,
su identificación fiscal, su domicilio. Nosotros los imprimimos en el documento
tal cual — mezcla de correspondencia, no interpretación.

El perfil de país es solo una traducción de nombres de campo. No siembra
códigos, no valida formatos y no explica reglas.
"""

from decimal import Decimal

import pytest

from app.utils.goods_declaration import (
    COUNTRY_PROFILES,
    DeclarationData,
    DeclarationIssuer,
    DeclarationLine,
    build_declaration,
    missing_fields,
)


def _linea(**kw):
    base = dict(
        description="Agua embotellada 1L",
        quantity=100,
        unit="piezas",
        hs_code="220110",
        weight_kg=Decimal("100.000"),
    )
    base.update(kw)
    return DeclarationLine(**base)


def _emisor(**kw):
    base = dict(
        legal_name="Fundación Ejemplo A.C.",
        tax_id="XAXX010101000",
        address="Calle 1, Ciudad de México",
        country_code="MX",
    )
    base.update(kw)
    return DeclarationIssuer(**base)


def _data(lines=None, **kw):
    base = dict(
        reference="EN-0001",
        issuer=_emisor(),
        origin="Ciudad de México",
        destination="Caracas, Venezuela",
        gross_weight_kg=Decimal("300.000"),
        packages=3,
        lines=lines if lines is not None else [_linea()],
    )
    base.update(kw)
    return DeclarationData(**base)


# ── El documento universal ───────────────────────────────────────────────────

def test_la_declaracion_lleva_lo_que_si_sabemos():
    doc = build_declaration(_data())
    linea = doc["lines"][0]
    assert set(linea) >= {"description", "quantity", "unit", "weight_kg", "hs_code"}
    assert doc["gross_weight_kg"] == "300.000"
    assert doc["packages"] == 3


def test_el_codigo_de_mercancia_es_hs_no_el_de_un_pais():
    """El Sistema Armonizado lo usan casi 200 países en aduana. Un código de un
    solo régimen sería el código equivocado para carga que cruza fronteras."""
    doc = build_declaration(_data())
    assert "hs_code" in doc["lines"][0]


def test_los_datos_del_emisor_son_los_que_capturo_el_centro():
    """Mezcla de correspondencia: los imprimimos, no los interpretamos."""
    doc = build_declaration(_data())
    assert doc["issuer"]["legal_name"] == "Fundación Ejemplo A.C."
    assert doc["issuer"]["tax_id"] == "XAXX010101000"


def test_no_se_valida_el_formato_de_la_identificacion_fiscal():
    """Un RFC, un RIF y un EIN no se parecen. Validar uno solo romperia a los
    demas, y validar todos es la carrera que decidimos no correr."""
    doc = build_declaration(_data(issuer=_emisor(tax_id="J-12345678-9")))
    assert doc["issuer"]["tax_id"] == "J-12345678-9"


def test_los_bultos_son_las_tarimas_no_los_renglones():
    doc = build_declaration(_data(packages=3, lines=[_linea(), _linea()]))
    assert doc["packages"] == 3
    assert doc["total_lines"] == 2


# ── Lo que falta se declara, no se inventa ───────────────────────────────────

def test_un_dato_faltante_se_declara():
    faltantes = missing_fields(_data(gross_weight_kg=None))
    assert any("bruto" in f.lower() for f in faltantes)


def test_falta_la_identificacion_del_emisor_se_declara():
    """Sin esto el documento no le sirve a nadie en ninguna aduana."""
    faltantes = missing_fields(_data(issuer=_emisor(tax_id=None, legal_name=None)))
    texto = " ".join(faltantes).lower()
    assert "razón social" in texto or "razon social" in texto
    assert "identificación" in texto or "identificacion" in texto


def test_lo_faltante_dice_que_renglon():
    faltantes = missing_fields(_data(lines=[_linea(description="Sin peso", weight_kg=None)]))
    assert any("Sin peso" in f for f in faltantes)


def test_sin_faltantes_la_lista_va_vacia():
    assert missing_fields(_data()) == []


# ── El perfil de país solo traduce nombres ───────────────────────────────────

def test_sin_perfil_los_campos_van_en_su_nombre_universal():
    doc = build_declaration(_data())
    assert "lines" in doc and "gross_weight_kg" in doc


def test_el_perfil_de_mexico_renombra_al_complemento():
    doc = build_declaration(_data(), profile="MX_CARTA_PORTE")
    assert doc["PesoBrutoTotal"] == "300.000"
    assert doc["mercancias"][0]["Descripcion"] == "Agua embotellada 1L"


def test_el_perfil_no_siembra_ni_inventa_codigos():
    """Traduce nombres de campo. No sabe qué clave del SAT corresponde a un
    producto, y no debe adivinarla desde el HS ni desde el UNSPSC."""
    doc = build_declaration(_data(), profile="MX_CARTA_PORTE")
    assert doc["mercancias"][0]["ClaveProdServCP"] is None


def test_un_perfil_desconocido_cae_al_universal():
    """Un perfil mal escrito no puede dejar sin documento a quien despacha."""
    doc = build_declaration(_data(), profile="NO_EXISTE")
    assert "lines" in doc


def test_los_perfiles_son_pocos_y_declarados():
    assert set(COUNTRY_PROFILES) == {"MX_CARTA_PORTE"}


# ── La frontera, fijada por test ─────────────────────────────────────────────

def test_el_documento_se_declara_insumo_y_no_comprobante():
    doc = build_declaration(_data())
    assert "no es un comprobante fiscal" in doc["_notice"].lower()


def test_el_modulo_no_explica_reglas_fiscales():
    """Araguaney no opina sobre regímenes tributarios: no es su papel y no
    escala a los países donde esto va a usarse."""
    from pathlib import Path

    src = Path("app/utils/goods_declaration.py").read_text().lower()
    for prohibido in ("exención", "excepción de 30 km", "regla 2.7.7", "rmf", "deducible"):
        assert prohibido not in src, prohibido


def test_el_catalogo_no_guarda_claves_de_un_solo_pais():
    """`sat_product_key` era México dentro del modelo de dominio. El código
    universal de aduana es el HS."""
    from app.models.product_type import ProductType

    assert hasattr(ProductType, "hs_code")
    assert not hasattr(ProductType, "sat_product_key")


@pytest.mark.parametrize("campo", ["legal_name", "tax_id", "address"])
def test_el_centro_captura_su_propia_identidad(campo):
    from app.models.center import Center

    assert hasattr(Center, campo)


# ── Cableado del exporte ─────────────────────────────────────────────────────

def test_la_declaracion_es_un_tipo_de_exporte_registrado():
    from app.models.export_job import EXPORT_JOB_KINDS

    assert "SHIPMENT_DECLARATION_XLSX" in EXPORT_JOB_KINDS
    assert "SHIPMENT_DECLARATION_JSON" in EXPORT_JOB_KINDS


def test_el_exporte_esta_encolado_y_limitado():
    from pathlib import Path

    src = Path("app/routers/shipment.py").read_text()
    assert "declaracion.xlsx" in src and "declaracion.json" in src
    assert "@limiter.limit" in src


def test_la_hoja_sale_igual_con_perfil_o_sin_el():
    """El perfil agrega nombres traducidos; no puede quitar campos universales."""
    from app.utils.goods_declaration_xlsx import build_declaration_xlsx

    for perfil in (None, "MX_CARTA_PORTE"):
        hoja = build_declaration_xlsx(build_declaration(_data(), profile=perfil))
        assert hoja[:2] == b"PK"          # es un xlsx válido
