"""La declaración armada desde un envío real (Fase 21, task 11).

`build_declaration` sobre datos ya armados sí tenía pruebas; **lo que los une no
tenía ninguna**. Y es donde vive la lógica que puede equivocarse en silencio:
agrupar cajas por producto, sumar el peso correcto, contar bultos, y sacar al
emisor del centro que despacha.

Corre contra SQLite en memoria porque son consultas y joins: con mocks, un
`group by` mal escrito pasa el test y falla en producción.
"""

from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base


@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    return "JSON"


for _m in ("user", "center", "campaign", "intake", "box", "product_type",
           "shipment", "pallet", "events", "audit_log", "donor", "donation",
           "risk_review"):
    __import__(f"app.models.{_m}")

from app.models.box import Box  # noqa: E402
from app.models.campaign import Campaign  # noqa: E402
from app.models.center import Center  # noqa: E402
from app.models.intake import Intake  # noqa: E402
from app.models.pallet import Pallet  # noqa: E402
from app.models.product_type import ProductType  # noqa: E402
from app.models.shipment import Shipment  # noqa: E402
from app.services.export_generation import _build_declaration_data  # noqa: E402

_LEJOS = date.today() + timedelta(days=400)


class _Mundo:
    """Un envío con dos tarimas y tres cajas de dos productos distintos."""

    def __init__(self, db, *, pesar_tarimas=True, centro_identificado=True):
        self.db = db
        self.centro = Center(
            name="Centro A",
            address="Calle 1, Ciudad de México",
            country_code="MX",
            legal_name="Fundación Ejemplo A.C." if centro_identificado else None,
            tax_id="XAXX010101000" if centro_identificado else None,
        )
        campana = Campaign(name="Donaciones Generales", is_general=True)
        self.agua = ProductType(display_name="Agua 1L", category="WATER", hs_code="220110")
        self.arroz = ProductType(display_name="Arroz blanco", category="FOOD", hs_code="100630")
        db.add_all([self.centro, campana, self.agua, self.arroz])
        db.flush()

        intake = Intake(center_id=self.centro.id, campaign_id=campana.id)
        db.add(intake)
        db.flush()

        self.envio = Shipment(
            reference="EN-0001", center_id=self.centro.id, campaign_id=campana.id,
            status="CLOSED", destination="Caracas, Venezuela",
        )
        db.add(self.envio)
        db.flush()

        tarimas = []
        for i, (bruto, tara) in enumerate((("300", "25"), ("200", "25")), start=1):
            tarima = Pallet(
                code=f"TM-{i}", center_id=self.centro.id, status="CLOSED",
                shipment_id=self.envio.id,
                gross_weight_kg=Decimal(bruto) if pesar_tarimas else None,
                tare_weight_kg=Decimal(tara) if pesar_tarimas else None,
            )
            db.add(tarima)
            tarimas.append(tarima)
        db.flush()

        # Dos cajas del mismo producto en tarimas distintas: tienen que salir en
        # un solo renglón, que es justo lo que un mock no atraparía.
        db.add_all([
            Box(code="BX-1", center_id=self.centro.id, intake_id=intake.id,
                pallet_id=tarimas[0].id, product_type_id=self.agua.id, status="SEALED",
                quantity=100, unit="piezas", weight_kg=Decimal("100"),
                batch="L1", expiry_date=_LEJOS),
            Box(code="BX-2", center_id=self.centro.id, intake_id=intake.id,
                pallet_id=tarimas[1].id, product_type_id=self.agua.id, status="SEALED",
                quantity=50, unit="piezas", weight_kg=Decimal("50"),
                batch="L1", expiry_date=_LEJOS),
            Box(code="BX-3", center_id=self.centro.id, intake_id=intake.id,
                pallet_id=tarimas[0].id, product_type_id=self.arroz.id, status="SEALED",
                quantity=20, unit="kg", weight_kg=Decimal("20"),
                batch="L2", expiry_date=_LEJOS),
        ])
        db.commit()


def _sesion():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)(), engine


@pytest.fixture()
def mundo():
    db, engine = _sesion()
    try:
        yield _Mundo(db)
    finally:
        db.close()
        engine.dispose()


def _declaracion(mundo):
    data, _perfil = _build_declaration_data(mundo.db, mundo.envio.id)
    return data


# ── Agrupación ───────────────────────────────────────────────────────────────

def test_las_cajas_del_mismo_producto_son_un_solo_renglon(mundo):
    """Un documento de mercancías declara mercancías, no bultos."""
    data = _declaracion(mundo)
    assert len(data.lines) == 2


def test_el_renglon_suma_las_cantidades_de_sus_cajas(mundo):
    data = _declaracion(mundo)
    agua = next(l for l in data.lines if l.description == "Agua 1L")
    assert agua.quantity == 150          # 100 + 50, en dos tarimas distintas


def test_el_renglon_suma_los_pesos_de_sus_cajas(mundo):
    data = _declaracion(mundo)
    agua = next(l for l in data.lines if l.description == "Agua 1L")
    assert agua.weight_kg == Decimal("150")


def test_el_codigo_hs_viene_del_catalogo(mundo):
    data = _declaracion(mundo)
    agua = next(l for l in data.lines if l.description == "Agua 1L")
    assert agua.hs_code == "220110"


def test_productos_distintos_no_se_mezclan(mundo):
    data = _declaracion(mundo)
    assert {l.description for l in data.lines} == {"Agua 1L", "Arroz blanco"}


# ── Pesos y bultos ───────────────────────────────────────────────────────────

def test_el_peso_bruto_suma_los_netos_de_las_tarimas(mundo):
    """(300−25) + (200−25) = 450. No es la suma de cajas, que da 170: la tarima
    carga su base y su emplaye."""
    assert _declaracion(mundo).gross_weight_kg == Decimal("450")


def test_los_bultos_son_las_tarimas(mundo):
    assert _declaracion(mundo).packages == 2


def test_sin_ninguna_tarima_pesada_no_se_inventa_el_bruto():
    """Sumar las cajas sería declarar un peso que ninguna báscula vio."""
    db, engine = _sesion()
    try:
        mundo = _Mundo(db, pesar_tarimas=False)
        assert _declaracion(mundo).gross_weight_kg is None
    finally:
        db.close()
        engine.dispose()


# ── Emisor ───────────────────────────────────────────────────────────────────

def test_el_emisor_es_el_centro_que_despacha(mundo):
    data = _declaracion(mundo)
    assert data.issuer.legal_name == "Fundación Ejemplo A.C."
    assert data.issuer.tax_id == "XAXX010101000"
    assert data.issuer.country_code == "MX"


def test_un_centro_sin_identidad_deja_el_emisor_vacio_y_se_reporta():
    """No se rellena con el nombre operativo del centro: la razón social es otra
    cosa, y ponerla por defecto sería inventar un dato del documento."""
    from app.utils.goods_declaration import missing_fields

    db, engine = _sesion()
    try:
        mundo = _Mundo(db, centro_identificado=False)
        data = _declaracion(mundo)
        assert data.issuer.legal_name is None
        assert any("azón social" in f for f in missing_fields(data))
    finally:
        db.close()
        engine.dispose()


def test_el_destino_sale_del_envio(mundo):
    assert _declaracion(mundo).destination == "Caracas, Venezuela"


# ── El perfil viaja con el envío ─────────────────────────────────────────────

def test_el_envio_manda_su_perfil_de_pais(mundo):
    mundo.envio.declaration_profile = "MX_CARTA_PORTE"
    mundo.db.commit()

    _data, perfil = _build_declaration_data(mundo.db, mundo.envio.id)
    assert perfil == "MX_CARTA_PORTE"


def test_sin_perfil_declarado_el_documento_sale_universal(mundo):
    _data, perfil = _build_declaration_data(mundo.db, mundo.envio.id)
    assert perfil is None
