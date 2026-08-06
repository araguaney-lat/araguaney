"""Hitos logísticos y llegada a destino (Fase 22, tasks 1, 2 y 3).

La trazabilidad terminaba en `SHIPPED`: el envío salía y el sistema se quedaba
ciego justo en el tramo que cruza una aduana, que es donde más importa.

Tres decisiones de diseño que estos tests fijan:

- **Un hito no cambia el estado.** Es un evento con `from_status = to_status`.
  Si cada paso del camino fuera un estado, la máquina crecería con cada
  aeropuerto y cada trámite que alguien quiera anotar.
- **La fecha del hito la pone quien lo registra**, no el reloj del servidor. El
  reporte del consignatario llega tarde y casi siempre describe algo de ayer.
- **El congelamiento no se toca.** Nada de lo que ocurre en destino muta las
  cajas ni las tarimas despachadas: enviado y recibido son dos hechos, y el
  sistema guarda ambos en vez de reescribir el primero con el segundo.
"""

from datetime import datetime, timedelta, timezone
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


import app.models  # noqa: E402,F401  (registra todas las tablas)

from app.models.box import Box  # noqa: E402
from app.models.events import SHIPMENT_MILESTONES, ShipmentEvent  # noqa: E402
from app.models.pallet import Pallet  # noqa: E402
from app.models.shipment import Shipment  # noqa: E402
from app.services.shipment_service import ShipmentService  # noqa: E402

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


def _shipment(db, status: str = "SHIPPED", center_id=CENTER) -> Shipment:
    shipment = Shipment(center_id=center_id, destination="Venezuela", status=status)
    db.add(shipment)
    db.commit()
    return shipment


def _shipped_pallet_with_box(db, shipment: Shipment) -> tuple[Pallet, Box]:
    pallet = Pallet(code=f"TM-{uuid4().hex[:6].upper()}", center_id=shipment.center_id,
                    status="SHIPPED", shipment_id=shipment.id)
    db.add(pallet)
    db.flush()
    box = Box(code=f"BX-{uuid4().hex[:6].upper()}", center_id=shipment.center_id,
              product_type_id=uuid4(), quantity=1, unit="pieza",
              status="SHIPPED", pallet_id=pallet.id)
    db.add(box)
    db.commit()
    return pallet, box


def _events(db, shipment_id) -> list[ShipmentEvent]:
    return list(
        db.query(ShipmentEvent).filter(ShipmentEvent.shipment_id == shipment_id)
        .order_by(ShipmentEvent.ts).all()
    )


# ── Hitos ────────────────────────────────────────────────────────────────────

def test_a_milestone_records_the_event_without_moving_the_status(db):
    shipment = _shipment(db)

    ShipmentService(db).add_milestone(
        shipment.id, center_id=CENTER, user_id=USER, milestone="LOADED_AIRCRAFT",
    )

    db.refresh(shipment)
    assert shipment.status == "SHIPPED"
    evento = _events(db, shipment.id)[-1]
    assert evento.milestone == "LOADED_AIRCRAFT"
    assert evento.from_status == evento.to_status == "SHIPPED"


def test_the_caller_supplies_the_date_because_reports_arrive_late(db):
    shipment = _shipment(db)
    ayer = datetime.now(timezone.utc) - timedelta(days=1)

    ShipmentService(db).add_milestone(
        shipment.id, center_id=CENTER, user_id=USER,
        milestone="CUSTOMS_CLEARED", occurred_at=ayer,
    )

    registrado = _events(db, shipment.id)[-1].ts
    assert registrado.replace(tzinfo=timezone.utc) == ayer


def test_an_unknown_milestone_is_rejected(db):
    shipment = _shipment(db)

    with pytest.raises(HTTPException) as exc:
        ShipmentService(db).add_milestone(
            shipment.id, center_id=CENTER, user_id=USER, milestone="ABDUCTED_BY_ALIENS",
        )

    assert exc.value.detail["code"] == "INVALID_MILESTONE"


def test_milestones_do_not_apply_before_the_shipment_leaves(db):
    """Un hito sobre un envío que aún se arma describiría algo que no ocurrió."""
    for status in ("OPEN", "CLOSED"):
        shipment = _shipment(db, status=status)
        with pytest.raises(HTTPException) as exc:
            ShipmentService(db).add_milestone(
                shipment.id, center_id=CENTER, user_id=USER, milestone="DEPARTED_WAREHOUSE",
            )
        assert exc.value.detail["code"] == "INVALID_STATUS"


def test_milestones_keep_working_after_delivery(db):
    """La aduana puede liberar días después de que el envío ya llegó."""
    shipment = _shipment(db, status="DELIVERED")

    ShipmentService(db).add_milestone(
        shipment.id, center_id=CENTER, user_id=USER, milestone="CUSTOMS_CLEARED",
    )

    assert _events(db, shipment.id)[-1].milestone == "CUSTOMS_CLEARED"


def test_every_declared_milestone_is_accepted(db):
    """Si el vocabulario declara siete, los siete tienen que entrar."""
    shipment = _shipment(db)

    for milestone in SHIPMENT_MILESTONES:
        ShipmentService(db).add_milestone(
            shipment.id, center_id=CENTER, user_id=USER, milestone=milestone,
        )

    assert len(_events(db, shipment.id)) == len(SHIPMENT_MILESTONES)


# ── Llegada ──────────────────────────────────────────────────────────────────

def test_marking_delivered_moves_the_status_and_stamps_the_date(db):
    shipment = _shipment(db)

    ShipmentService(db).mark_delivered(shipment.id, center_id=CENTER, user_id=USER)

    db.refresh(shipment)
    assert shipment.status == "DELIVERED"
    assert shipment.delivered_at is not None
    evento = _events(db, shipment.id)[-1]
    assert (evento.from_status, evento.to_status) == ("SHIPPED", "DELIVERED")


def test_only_a_shipped_shipment_can_be_delivered(db):
    for status in ("OPEN", "CLOSED", "DELIVERED"):
        shipment = _shipment(db, status=status)
        with pytest.raises(HTTPException) as exc:
            ShipmentService(db).mark_delivered(shipment.id, center_id=CENTER, user_id=USER)
        assert exc.value.detail["code"] == "INVALID_TRANSITION"


def test_delivery_does_not_thaw_the_dispatched_inventory(db):
    """El invariante de congelamiento: lo despachado es un registro inmutable."""
    shipment = _shipment(db)
    pallet, box = _shipped_pallet_with_box(db, shipment)

    ShipmentService(db).mark_delivered(shipment.id, center_id=CENTER, user_id=USER)

    db.refresh(pallet)
    db.refresh(box)
    assert (pallet.status, box.status) == ("SHIPPED", "SHIPPED")


# ── Aislamiento entre centros ────────────────────────────────────────────────

def test_a_center_cannot_touch_another_centers_shipment(db):
    ajeno = _shipment(db, center_id=OTHER_CENTER)

    for accion in (
        lambda: ShipmentService(db).add_milestone(
            ajeno.id, center_id=CENTER, user_id=USER, milestone="ARRIVED_AIRPORT"),
        lambda: ShipmentService(db).mark_delivered(ajeno.id, center_id=CENTER, user_id=USER),
    ):
        with pytest.raises(HTTPException) as exc:
            accion()
        assert exc.value.detail["code"] == "SHIPMENT_NOT_FOUND"


def test_the_national_admin_sees_every_center(db):
    """`center_id=None` es national_admin: sin filtro, como en todo el sistema."""
    ajeno = _shipment(db, center_id=OTHER_CENTER)

    ShipmentService(db).mark_delivered(ajeno.id, center_id=None, user_id=USER)

    db.refresh(ajeno)
    assert ajeno.status == "DELIVERED"
