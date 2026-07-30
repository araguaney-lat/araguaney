"""Anexo de datos Carta Porte 3.1 (Fase 21, tasks 6 y 7).

**Araguaney no timbra y no quiere timbrar.** Este anexo es el insumo que el
transportista (CFDI de ingreso) o el centro con medios propios (CFDI de traslado)
le entrega a su PAC. Aquí no hay CSD, ni RFC, ni sello: hay los datos de
mercancías que el complemento pide y que solo nosotros tenemos, porque nosotros
somos quienes registraron caja por caja qué va dentro.

De ahí sale la regla que gobierna este archivo: **un dato que no tenemos se
declara faltante, nunca se inventa.** Una clave del SAT equivocada en un
documento fiscal es peor que una celda vacía — la vacía la llena quien timbra,
la equivocada la descubre la autoridad.
"""

from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.utils.carta_porte import (
    CartaPorteData,
    CartaPorteMercancia,
    build_annex,
    missing_fields,
)


def _mercancia(**kw):
    base = dict(
        descripcion="Agua embotellada 1L",
        sat_product_key="50202301",
        unspsc_code="50202301",
        cantidad=100,
        clave_unidad="H87",
        unidad="piezas",
        peso_kg=Decimal("100.000"),
    )
    base.update(kw)
    return CartaPorteMercancia(**base)


def _data(mercancias=None, **kw):
    base = dict(
        shipment_reference="EN-0001",
        origen="Centro A, Ciudad de México",
        destino="Caracas, Venezuela",
        peso_bruto_total=Decimal("300.000"),
        numero_bultos=3,
        mercancias=mercancias if mercancias is not None else [_mercancia()],
    )
    base.update(kw)
    return CartaPorteData(**base)


# ── Lo que el anexo produce ──────────────────────────────────────────────────

def test_el_anexo_lleva_los_campos_de_mercancias_del_complemento():
    anexo = build_annex(_data())
    m = anexo["mercancias"][0]
    assert set(m) >= {
        "Descripcion", "ClaveProdServCP", "Cantidad", "ClaveUnidad", "PesoEnKg"
    }


def test_el_anexo_lleva_los_totales_del_complemento():
    anexo = build_annex(_data())
    assert anexo["PesoBrutoTotal"] == "300.000"
    assert anexo["UnidadPeso"] == "KGM"          # kilogramo, catálogo c_ClaveUnidad
    assert anexo["NumTotalMercancias"] == 1


def test_el_numero_de_bultos_es_el_de_tarimas_no_el_de_renglones():
    """Lo que se transporta son bultos: tarimas. Las mercancías son otra cuenta."""
    anexo = build_annex(_data(numero_bultos=3, mercancias=[_mercancia(), _mercancia()]))
    assert anexo["NumeroBultos"] == 3
    assert anexo["NumTotalMercancias"] == 2


def test_el_peso_bruto_total_es_el_de_bascula():
    """El que la cadena valida, no la suma de renglones."""
    anexo = build_annex(_data(peso_bruto_total=Decimal("512.500")))
    assert anexo["PesoBrutoTotal"] == "512.500"


# ── Lo que el anexo NO hace ──────────────────────────────────────────────────

def test_el_anexo_no_lleva_datos_fiscales():
    """Sin RFC, sin CSD, sin sello: Araguaney no es emisor fiscal y este archivo
    no debe parecer un CFDI a medio hacer.

    Se revisan los campos, no el aviso: el aviso justamente nombra lo que el
    anexo no trae, y es la parte que le explica eso a quien lo recibe.
    """
    anexo = build_annex(_data())
    campos = {k.lower() for k in anexo} | {
        k.lower() for m in anexo["mercancias"] for k in m
    }
    for prohibido in ("rfc", "csd", "sello", "certificado", "uuid_fiscal", "folio_fiscal"):
        assert not any(prohibido in c for c in campos), prohibido


def test_el_anexo_se_declara_insumo_y_no_comprobante():
    anexo = build_annex(_data())
    assert "_aviso" in anexo
    assert "no es un comprobante fiscal" in anexo["_aviso"].lower()


# ── Datos faltantes: se declaran, no se inventan ─────────────────────────────

def test_una_mercancia_sin_clave_del_sat_se_marca_faltante():
    """Una clave equivocada en un documento fiscal es peor que una vacía."""
    anexo = build_annex(_data(mercancias=[_mercancia(sat_product_key=None)]))
    assert anexo["mercancias"][0]["ClaveProdServCP"] is None
    assert anexo["_faltantes"]


def test_lo_faltante_dice_que_renglon_y_que_campo():
    faltantes = missing_fields(_data(mercancias=[
        _mercancia(descripcion="Sin clave", sat_product_key=None),
        _mercancia(descripcion="Sin peso", peso_kg=None),
    ]))
    texto = " ".join(faltantes)
    assert "Sin clave" in texto and "Sin peso" in texto


def test_sin_faltantes_la_lista_va_vacia():
    assert missing_fields(_data()) == []


def test_el_peso_bruto_faltante_se_declara():
    """Sin tarima pesada no hay peso bruto que declarar, y el complemento lo pide."""
    faltantes = missing_fields(_data(peso_bruto_total=None))
    assert any("bruto" in f.lower() for f in faltantes)


def test_la_clave_de_unidad_cae_a_la_generica_declarandolo():
    """H87 (pieza) es el default honesto cuando la unidad del centro no mapea."""
    anexo = build_annex(_data(mercancias=[_mercancia(clave_unidad=None, unidad="manojos")]))
    assert anexo["mercancias"][0]["ClaveUnidad"] == "H87"
    assert any("manojos" in f for f in anexo["_faltantes"])


# ── Catálogo: la clave del SAT vive en el producto (task 7) ──────────────────

def test_el_producto_puede_llevar_su_clave_del_sat():
    from app.models.product_type import ProductType

    assert hasattr(ProductType, "sat_product_key")


def test_el_unspsc_no_se_usa_como_clave_del_sat():
    """Ambos catálogos son de ocho dígitos y el del SAT deriva de UNSPSC, pero
    ClaveProdServCP es un subconjunto propio: copiarlo automáticamente sería
    inventar un dato fiscal."""
    anexo = build_annex(_data(mercancias=[
        _mercancia(sat_product_key=None, unspsc_code="50202301"),
    ]))
    assert anexo["mercancias"][0]["ClaveProdServCP"] is None


# ── Cableado del exporte ─────────────────────────────────────────────────────

def test_el_anexo_es_un_tipo_de_exporte_registrado():
    from app.models.export_job import EXPORT_JOB_KINDS

    assert "SHIPMENT_CARTA_PORTE_XLSX" in EXPORT_JOB_KINDS
    assert "SHIPMENT_CARTA_PORTE_JSON" in EXPORT_JOB_KINDS


def test_el_exporte_esta_encolado_y_limitado():
    from pathlib import Path

    src = Path("app/routers/shipment.py").read_text()
    assert "carta-porte" in src
    assert "@limiter.limit" in src
