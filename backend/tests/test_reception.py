"""Recepción en destino y merma (Fase 22, tasks 4 y 6).

Lo que se despacha y lo que llega son dos hechos distintos. El sistema guarda
los dos por separado, y de esa separación depende todo lo demás: si la recepción
reescribiera el estado de las cajas, la diferencia entre lo enviado y lo recibido
dejaría de existir en el instante en que alguien la registra, y la merma sería
imposible de medir.

Los tests fijan también las dos decisiones que hacen usable el formulario:

- **Se marcan solo las excepciones.** Lo que no aparece se da por recibido. Un
  checklist que exija confirmar caja por caja lo que sí llegó se llena mal, y se
  llena mal justo cuando el envío es grande.
- **La diferencia de peso tolera un margen.** Una tarima pesada dos veces, en dos
  básculas y en dos continentes, nunca da el mismo número. Sin margen, cada envío
  abriría incidencias que nadie va a accionar.
"""

from decimal import Decimal
from unittest.mock import patch
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
from app.models.incident import Incident  # noqa: E402
from app.models.pallet import Pallet  # noqa: E402
from app.models.reception import ReceptionLine, ReceptionPalletWeight  # noqa: E402
from app.models.shipment import Shipment  # noqa: E402
from app.services.reception_service import ReceptionService, weight_tolerance_pct  # noqa: E402

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


def _shipment_with_cargo(
    db, boxes: int = 3, status: str = "DELIVERED",
    center_id=CENTER, gross_weight=None,
):
    shipment = Shipment(center_id=center_id, destination="Venezuela", status=status)
    db.add(shipment)
    db.flush()

    pallet = Pallet(code=f"TM-{uuid4().hex[:6].upper()}", center_id=center_id,
                    status="SHIPPED", shipment_id=shipment.id, gross_weight_kg=gross_weight)
    db.add(pallet)
    db.flush()

    cajas = []
    for _ in range(boxes):
        box = Box(code=f"BX-{uuid4().hex[:6].upper()}", center_id=center_id,
                  product_type_id=uuid4(), quantity=1, unit="pieza",
                  status="SHIPPED", pallet_id=pallet.id)
        db.add(box)
        cajas.append(box)
    db.commit()
    return shipment, pallet, cajas


def _incidents(db, shipment_id) -> list[Incident]:
    return list(db.query(Incident).filter(Incident.shipment_id == shipment_id).all())


# ── El caso normal ───────────────────────────────────────────────────────────

def test_everything_not_marked_counts_as_received(db):
    shipment, _, boxes = _shipment_with_cargo(db, boxes=3)

    reception = ReceptionService(db).reconcile(
        shipment.id, center_id=CENTER, user_id=USER, exceptions={},
    )

    lines = db.query(ReceptionLine).filter(ReceptionLine.reception_id == reception.id).all()
    assert len(lines) == len(boxes)
    assert {line.outcome for line in lines} == {"RECEIVED"}


def test_reconciling_moves_the_shipment_and_writes_its_event(db):
    shipment, _, _ = _shipment_with_cargo(db)

    ReceptionService(db).reconcile(shipment.id, center_id=CENTER, user_id=USER, exceptions={})

    db.refresh(shipment)
    assert shipment.status == "RECONCILED"
    assert shipment.reconciled_at is not None


def test_reception_does_not_touch_the_dispatched_inventory(db):
    """El invariante que hace medible la merma."""
    shipment, pallet, boxes = _shipment_with_cargo(db, boxes=2)

    ReceptionService(db).reconcile(
        shipment.id, center_id=CENTER, user_id=USER,
        exceptions={boxes[0].id: {"outcome": "MISSING"}},
    )

    db.refresh(pallet)
    for box in boxes:
        db.refresh(box)
        assert box.status == "SHIPPED"
    assert pallet.status == "SHIPPED"


# ── Excepciones e incidencias automáticas ────────────────────────────────────

@pytest.mark.parametrize("outcome,tipo", [
    ("MISSING", "MISSING_BOX"),
    ("DAMAGED", "DAMAGE"),
    ("RETAINED_CUSTOMS", "CUSTOMS_RETENTION"),
])
def test_each_exception_opens_its_incident(db, outcome, tipo):
    shipment, _, boxes = _shipment_with_cargo(db, boxes=2)

    ReceptionService(db).reconcile(
        shipment.id, center_id=CENTER, user_id=USER,
        exceptions={boxes[0].id: {"outcome": outcome, "note": "acta del consignatario"}},
    )

    incidencias = _incidents(db, shipment.id)
    assert len(incidencias) == 1
    assert incidencias[0].type == tipo
    assert incidencias[0].status == "OPEN"
    assert incidencias[0].box_id == boxes[0].id


def test_a_clean_reception_opens_no_incidents(db):
    shipment, _, _ = _shipment_with_cargo(db)

    ReceptionService(db).reconcile(shipment.id, center_id=CENTER, user_id=USER, exceptions={})

    assert _incidents(db, shipment.id) == []


def test_an_unknown_outcome_is_rejected(db):
    shipment, _, boxes = _shipment_with_cargo(db)

    with pytest.raises(HTTPException) as exc:
        ReceptionService(db).reconcile(
            shipment.id, center_id=CENTER, user_id=USER,
            exceptions={boxes[0].id: {"outcome": "EATEN_BY_A_DOG"}},
        )

    assert exc.value.detail["code"] == "INVALID_OUTCOME"


def test_a_box_from_another_shipment_is_rejected(db):
    shipment, _, _ = _shipment_with_cargo(db)
    ajena, _, otras = _shipment_with_cargo(db)

    with pytest.raises(HTTPException) as exc:
        ReceptionService(db).reconcile(
            shipment.id, center_id=CENTER, user_id=USER,
            exceptions={otras[0].id: {"outcome": "MISSING"}},
        )

    assert exc.value.detail["code"] == "BOX_NOT_IN_SHIPMENT"


# ── Peso recibido ────────────────────────────────────────────────────────────

def test_a_weight_within_tolerance_opens_no_incident(db):
    """Dos básculas distintas nunca dan el mismo número."""
    shipment, pallet, _ = _shipment_with_cargo(db, gross_weight=Decimal("100"))

    ReceptionService(db).reconcile(
        shipment.id, center_id=CENTER, user_id=USER, exceptions={},
        pallet_weights={pallet.id: Decimal("103")},
    )

    assert _incidents(db, shipment.id) == []


def test_a_weight_beyond_tolerance_opens_an_incident(db):
    shipment, pallet, _ = _shipment_with_cargo(db, gross_weight=Decimal("100"))

    ReceptionService(db).reconcile(
        shipment.id, center_id=CENTER, user_id=USER, exceptions={},
        pallet_weights={pallet.id: Decimal("80")},
    )

    incidencias = _incidents(db, shipment.id)
    assert len(incidencias) == 1
    assert incidencias[0].type == "WEIGHT_DIFF"
    assert "20.0%" in incidencias[0].description


def test_the_received_weight_is_stored_even_without_a_dispatched_one(db):
    """Sin peso de salida no hay comparación, pero el dato sirve al documento."""
    shipment, pallet, _ = _shipment_with_cargo(db, gross_weight=None)

    reception = ReceptionService(db).reconcile(
        shipment.id, center_id=CENTER, user_id=USER, exceptions={},
        pallet_weights={pallet.id: Decimal("97.5")},
    )

    pesos = db.query(ReceptionPalletWeight).filter(
        ReceptionPalletWeight.reception_id == reception.id).all()
    assert len(pesos) == 1
    assert _incidents(db, shipment.id) == []


def test_the_tolerance_can_be_tightened_from_the_environment(db):
    shipment, pallet, _ = _shipment_with_cargo(db, gross_weight=Decimal("100"))

    with patch.dict("os.environ", {"RECEPTION_WEIGHT_TOLERANCE_PCT": "1"}):
        ReceptionService(db).reconcile(
            shipment.id, center_id=CENTER, user_id=USER, exceptions={},
            pallet_weights={pallet.id: Decimal("103")},
        )

    assert len(_incidents(db, shipment.id)) == 1


def test_a_malformed_tolerance_falls_back_to_the_default():
    with patch.dict("os.environ", {"RECEPTION_WEIGHT_TOLERANCE_PCT": "bastante"}):
        assert weight_tolerance_pct() == Decimal("5")


# ── Transiciones y unicidad ──────────────────────────────────────────────────

def test_only_a_delivered_shipment_can_be_reconciled(db):
    for status in ("OPEN", "CLOSED", "SHIPPED"):
        shipment, _, _ = _shipment_with_cargo(db, status=status)
        with pytest.raises(HTTPException) as exc:
            ReceptionService(db).reconcile(
                shipment.id, center_id=CENTER, user_id=USER, exceptions={})
        assert exc.value.detail["code"] == "INVALID_TRANSITION"


def test_a_shipment_is_reconciled_once(db):
    """Corregir se hace con una incidencia y su nota, no reescribiendo el acta."""
    shipment, _, _ = _shipment_with_cargo(db)
    ReceptionService(db).reconcile(shipment.id, center_id=CENTER, user_id=USER, exceptions={})

    db.refresh(shipment)
    shipment.status = "DELIVERED"  # aunque alguien fuerce el estado
    db.commit()

    with pytest.raises(HTTPException) as exc:
        ReceptionService(db).reconcile(shipment.id, center_id=CENTER, user_id=USER, exceptions={})
    assert exc.value.detail["code"] == "ALREADY_RECONCILED"


def test_another_center_cannot_reconcile_this_shipment(db):
    ajeno, _, _ = _shipment_with_cargo(db, center_id=OTHER_CENTER)

    with pytest.raises(HTTPException) as exc:
        ReceptionService(db).reconcile(ajeno.id, center_id=CENTER, user_id=USER, exceptions={})

    assert exc.value.detail["code"] == "SHIPMENT_NOT_FOUND"


# ── Merma ────────────────────────────────────────────────────────────────────

def test_shrinkage_counts_what_did_not_arrive(db):
    shipment, _, boxes = _shipment_with_cargo(db, boxes=4)

    reception = ReceptionService(db).reconcile(
        shipment.id, center_id=CENTER, user_id=USER,
        exceptions={boxes[0].id: {"outcome": "MISSING"},
                    boxes[1].id: {"outcome": "DAMAGED"}},
    )

    lines = db.query(ReceptionLine).filter(ReceptionLine.reception_id == reception.id).all()
    merma = ReceptionService.shrinkage(lines)
    assert merma == {"total_boxes": 4, "received": 2, "not_received": 2, "shrinkage_pct": 50.0}


def test_shrinkage_of_a_clean_reception_is_zero(db):
    shipment, _, _ = _shipment_with_cargo(db, boxes=2)
    reception = ReceptionService(db).reconcile(
        shipment.id, center_id=CENTER, user_id=USER, exceptions={})

    lines = db.query(ReceptionLine).filter(ReceptionLine.reception_id == reception.id).all()
    assert ReceptionService.shrinkage(lines)["shrinkage_pct"] == 0.0
