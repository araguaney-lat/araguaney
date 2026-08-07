"""Códigos de caja pre-asignados (Fase 25, tasks 4 y 5).

Sin código no hay etiqueta imprimible, y en un centro con prisa nadie vuelve a
tocar una caja ya cerrada para etiquetarla después: o sale con su etiqueta, o
sale sin ella para siempre. Por eso el bloque se aparta con señal, para gastarlo
sin ella.

Las dos propiedades que estos tests sostienen:

- **Un código reservado no es inventario.** Mientras nadie lo use es un número
  apartado, y un bloque que sobró no puede aparecer como cajas en un reporte.
- **Se consume una vez y solo en su centro.** Dos cajas con la misma etiqueta
  son dos bultos que el manifiesto declara como uno, lo que es peor que una caja
  sin etiquetar: el error se descubre en la aduana y no en el andén.
"""

from datetime import date, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base


@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    return "JSON"


import app.models  # noqa: E402,F401

from app.models.box import Box  # noqa: E402
from app.models.box_code_reservation import BoxCodeReservation  # noqa: E402
from app.models.campaign import Campaign  # noqa: E402
from app.models.product_type import ProductType  # noqa: E402
from app.models.user_campaign import UserCampaign  # noqa: E402
from app.schemas.intake import BoxDraft, IntakeCreate  # noqa: E402
from app.services import box_code_service  # noqa: E402
from app.services.intake_service import IntakeService  # noqa: E402

CENTER = uuid4()
OTHER_CENTER = uuid4()
USER = uuid4()


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def mundo(db):
    campana = Campaign(name="Donaciones Generales", is_general=True, is_active=True)
    db.add(campana)
    db.flush()
    db.add(UserCampaign(user_id=USER, campaign_id=campana.id))
    producto = ProductType(category="FOOD", display_name="Atún en lata",
                           default_unit="lata", min_shelf_life_days=0)
    db.add(producto)
    db.commit()
    return {"campaign": campana, "product": producto}


def _captura(mundo, code=None, capture_id=None):
    return IntakeCreate(
        campaign_id=mundo["campaign"].id,
        capture_id=capture_id,
        boxes=[BoxDraft(
            product_type_id=mundo["product"].id, quantity=10, unit="lata",
            expiry_date=date.today() + timedelta(days=400), code=code,
        )],
    )


# ── Reservar ─────────────────────────────────────────────────────────────────

def test_reserving_returns_the_requested_block(db):
    codigos = box_code_service.reserve(db, CENTER, USER, count=5)

    assert len(codigos) == 5
    assert len(set(codigos)) == 5, "no puede haber dos códigos iguales en un bloque"


def test_reserved_codes_use_the_same_format_as_online_ones(db):
    """La etiqueta impresa no distingue si la caja se capturó con señal o sin ella."""
    codigo = box_code_service.reserve(db, CENTER, USER, count=1)[0]

    assert codigo.startswith("BX-")


def test_a_reserved_block_is_not_inventory(db):
    """Un bloque que sobró no puede aparecer como cajas en ningún reporte."""
    box_code_service.reserve(db, CENTER, USER, count=10)

    assert db.query(Box).count() == 0
    assert box_code_service.available(db, CENTER) == 10


def test_the_block_size_is_capped(db):
    """Un cliente en bucle no puede apartar un millón de números."""
    for invalido in (0, box_code_service.MAX_BLOCK + 1):
        with pytest.raises(HTTPException) as exc:
            box_code_service.reserve(db, CENTER, USER, count=invalido)
        assert exc.value.detail["code"] == "INVALID_COUNT"


def test_availability_is_counted_per_center(db):
    box_code_service.reserve(db, CENTER, USER, count=3)
    box_code_service.reserve(db, OTHER_CENTER, USER, count=7)

    assert box_code_service.available(db, CENTER) == 3
    assert box_code_service.available(db, OTHER_CENTER) == 7


# ── Consumir ─────────────────────────────────────────────────────────────────

def test_capturing_with_a_reserved_code_uses_that_code(db, mundo):
    """La etiqueta ya se imprimió con ese número: la caja debe nacer con él."""
    codigo = box_code_service.reserve(db, CENTER, USER, count=1)[0]

    resultado = IntakeService(db).create(_captura(mundo, code=codigo), CENTER, USER)

    assert [b.code for b in resultado.boxes] == [codigo]


def test_consuming_marks_the_reservation_and_links_the_box(db, mundo):
    codigo = box_code_service.reserve(db, CENTER, USER, count=1)[0]
    resultado = IntakeService(db).create(_captura(mundo, code=codigo), CENTER, USER)

    reserva = db.query(BoxCodeReservation).filter_by(code=codigo).one()
    assert reserva.used_at is not None
    assert reserva.box_id == resultado.boxes[0].id
    assert box_code_service.available(db, CENTER) == 0


def test_a_code_cannot_be_consumed_twice(db, mundo):
    """Dos cajas con la misma etiqueta son dos bultos que el manifiesto une."""
    codigo = box_code_service.reserve(db, CENTER, USER, count=1)[0]
    IntakeService(db).create(_captura(mundo, code=codigo, capture_id=uuid4()), CENTER, USER)

    with pytest.raises(HTTPException) as exc:
        IntakeService(db).create(_captura(mundo, code=codigo, capture_id=uuid4()), CENTER, USER)

    assert exc.value.detail["code"] == "CODE_ALREADY_USED"


def test_an_unreserved_code_is_rejected(db, mundo):
    """Un código inventado por el cliente no puede colarse como etiqueta válida."""
    with pytest.raises(HTTPException) as exc:
        IntakeService(db).create(_captura(mundo, code="BX-INVENTADO"), CENTER, USER)

    assert exc.value.detail["code"] == "CODE_NOT_RESERVED"


def test_a_code_from_another_center_is_rejected_as_if_it_did_not_exist(db, mundo):
    """Mismo mensaje que 'no existe': un centro no debe poder averiguar qué
    códigos apartó otro probando cuál da un error distinto."""
    ajeno = box_code_service.reserve(db, OTHER_CENTER, USER, count=1)[0]

    with pytest.raises(HTTPException) as exc:
        IntakeService(db).create(_captura(mundo, code=ajeno), CENTER, USER)

    assert exc.value.detail["code"] == "CODE_NOT_RESERVED"
    assert db.query(BoxCodeReservation).filter_by(code=ajeno).one().used_at is None


def test_capturing_without_a_code_still_works(db, mundo):
    """La captura en línea de hoy no manda código y no debe cambiar en nada."""
    resultado = IntakeService(db).create(_captura(mundo, code=None), CENTER, USER)

    assert resultado.boxes[0].code.startswith("BX-")
    assert db.query(BoxCodeReservation).count() == 0


# ── Idempotencia y códigos, juntos ───────────────────────────────────────────

def test_a_failed_capture_leaves_every_code_unused(db, mundo):
    """La primera caja reclama su código y la segunda tumba la captura.

    Sin la reversión, ese primer código quedaría gastado sin ninguna caja que lo
    lleve: un número menos en el bloque y una etiqueta impresa que ya no vale
    para nada. Se hace el `rollback` a mano porque es lo que hace `get_db` al
    cerrar la sesión después de un error.
    """
    bueno = box_code_service.reserve(db, CENTER, USER, count=1)[0]
    caja = BoxDraft(product_type_id=mundo["product"].id, quantity=10, unit="lata",
                    expiry_date=date.today() + timedelta(days=400))
    captura = IntakeCreate(
        campaign_id=mundo["campaign"].id,
        boxes=[caja.model_copy(update={"code": bueno}),
               caja.model_copy(update={"code": "BX-NOEXISTE"})],
    )

    with pytest.raises(HTTPException) as exc:
        IntakeService(db).create(captura, CENTER, USER)
    db.rollback()

    assert exc.value.detail["code"] == "CODE_NOT_RESERVED"
    assert db.query(BoxCodeReservation).filter_by(code=bueno).one().used_at is None
    assert box_code_service.available(db, CENTER) == 1


def test_a_coordinator_reserves_only_for_their_own_center():
    """Aunque mande el centro de otro en el cuerpo de la petición.

    El endpoint de reserva pasa por `resolve_write_center_id`, que ignora lo que
    venga en el cuerpo para todo el que no sea national_admin. Es lo que impide
    que un centro aparte números del bloque de otro.
    """
    from types import SimpleNamespace

    from app.dependencies import resolve_write_center_id

    coordinador = SimpleNamespace(center_role="coordinator", center_id=CENTER)

    assert resolve_write_center_id(coordinador, OTHER_CENTER) == CENTER
    assert resolve_write_center_id(coordinador, None) == CENTER


def test_a_retried_capture_does_not_consume_a_second_code(db, mundo):
    """El caso real de la fase: el sótano, la respuesta perdida, el reintento.

    Si el reintento consumiera otro código, cada sincronización fallida quemaría
    un número del bloque hasta agotarlo justo cuando no hay señal para reponer.
    """
    codigo = box_code_service.reserve(db, CENTER, USER, count=3)[0]
    llave = uuid4()
    servicio = IntakeService(db)

    servicio.create(_captura(mundo, code=codigo, capture_id=llave), CENTER, USER)
    servicio.create(_captura(mundo, code=codigo, capture_id=llave), CENTER, USER)

    assert db.query(Box).count() == 1
    assert box_code_service.available(db, CENTER) == 2
