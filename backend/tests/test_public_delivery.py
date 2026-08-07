"""La ficha pública refleja la entrega (Fase 22, task 10).

Quien escanea un QR en el andén trae una pregunta: "¿esto ya llegó?". Sin este
dato, la ficha de una caja entregada hace tres semanas sigue diciendo
"despachada".

La respuesta se lee **del envío**, no de la caja. La pieza sigue congelada en
`SHIPPED` desde que salió, y esa inmutabilidad es lo que permite comparar
después lo enviado con lo recibido. Estos tests fijan las dos mitades: que el
dato aparezca, y que la caja no cambie ni un byte para que aparezca.
"""

from uuid import uuid4

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


import app.models  # noqa: E402,F401

from app.models.box import Box  # noqa: E402
from app.models.pallet import Pallet  # noqa: E402
from app.models.shipment import Shipment  # noqa: E402
from app.utils import delivery_status  # noqa: E402

CENTER = uuid4()


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


def _cargo(db, status: str = "SHIPPED", delivered_at=None):
    shipment = Shipment(center_id=CENTER, destination="Venezuela",
                        status=status, delivered_at=delivered_at)
    db.add(shipment)
    db.flush()
    pallet = Pallet(code=f"TM-{uuid4().hex[:6].upper()}", center_id=CENTER,
                    status="SHIPPED", shipment_id=shipment.id)
    db.add(pallet)
    db.flush()
    box = Box(code=f"BX-{uuid4().hex[:6].upper()}", center_id=CENTER,
              product_type_id=uuid4(), quantity=1, unit="pieza",
              status="SHIPPED", pallet_id=pallet.id)
    db.add(box)
    db.commit()
    return shipment, pallet, box


# ── Cuándo dice que llegó ────────────────────────────────────────────────────

@pytest.mark.parametrize("status", ["DELIVERED", "RECONCILED"])
def test_a_delivered_shipment_marks_its_cargo_as_delivered(db, status):
    from datetime import datetime, timezone

    cuando = datetime(2026, 8, 1, tzinfo=timezone.utc)
    _, pallet, box = _cargo(db, status=status, delivered_at=cuando)

    assert delivery_status.for_box(db, box.id).delivered is True
    assert delivery_status.for_pallet(db, pallet.id).delivered is True
    assert delivery_status.for_box(db, box.id).delivered_at == cuando


@pytest.mark.parametrize("status", ["OPEN", "CLOSED", "SHIPPED"])
def test_a_shipment_still_travelling_says_nothing(db, status):
    _, pallet, box = _cargo(db, status=status)

    assert delivery_status.for_box(db, box.id).delivered is False
    assert delivery_status.for_pallet(db, pallet.id).delivered is False


def test_a_box_that_never_shipped_says_nothing(db):
    """Sin tarima no hay envío del que leer, y no es un error: es inventario."""
    box = Box(code="BX-SUELTA", center_id=CENTER, product_type_id=uuid4(),
              quantity=1, unit="pieza", status="SEALED")
    db.add(box)
    db.commit()

    assert delivery_status.for_box(db, box.id).delivered is False


def test_a_pallet_without_shipment_says_nothing(db):
    pallet = Pallet(code="TM-SUELTA", center_id=CENTER, status="CLOSED")
    db.add(pallet)
    db.commit()

    assert delivery_status.for_pallet(db, pallet.id).delivered is False


# ── El invariante ────────────────────────────────────────────────────────────

def test_showing_delivery_does_not_mutate_the_cargo(db):
    """La ficha lee del envío. Si mutara la caja, la merma dejaría de ser medible."""
    _, pallet, box = _cargo(db, status="RECONCILED")

    delivery_status.for_box(db, box.id)
    delivery_status.for_pallet(db, pallet.id)

    db.refresh(box)
    db.refresh(pallet)
    assert box.status == "SHIPPED"
    assert pallet.status == "SHIPPED"


def test_the_public_ficha_exposes_delivery_and_nothing_else(db):
    """Que diga que llegó no puede convertirse en que diga a dónde ni a quién."""
    from app.services.box_service import BoxService

    _, _, box = _cargo(db, status="DELIVERED")

    ficha = BoxService(db).get_public(box.code)
    campos = ficha.model_dump().keys()

    assert ficha.delivered is True
    # El destino, el consignatario y la referencia del envío siguen fuera.
    assert not {"destination", "consignee_name", "reference", "carrier"} & set(campos)
