"""Incidencias de envío (Fase 22, tasks 5 y 9).

Una anomalía sin incidencia es un mensaje que se pierde; una incidencia sin
resolución es un pendiente con dueño. La diferencia entre las dos es todo el
punto de la tabla, y estos tests la sostienen:

- Cerrar exige decir **cómo** se cerró. Sin nota, "resuelta" no significa nada
  seis meses después, ni para quien la levantó ni para la auditoría.
- Una incidencia se cierra una vez. Reabrir sería reescribir el historial.
- Lo que apunta a una tarima o a una caja tiene que pertenecer a ese envío: una
  referencia cruzada describiría un problema inexistente y ensuciaría la merma
  del envío ajeno.
"""

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
from app.models.pallet import Pallet  # noqa: E402
from app.models.shipment import Shipment  # noqa: E402
from app.services.incident_service import IncidentService  # noqa: E402

CENTER = uuid4()
OTHER_CENTER = uuid4()
USER = uuid4()
RESOLVER = uuid4()


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


def _shipment_with_cargo(db, center_id=CENTER):
    shipment = Shipment(center_id=center_id, destination="Venezuela", status="SHIPPED")
    db.add(shipment)
    db.flush()
    pallet = Pallet(code=f"TM-{uuid4().hex[:6].upper()}", center_id=center_id,
                    status="SHIPPED", shipment_id=shipment.id)
    db.add(pallet)
    db.flush()
    box = Box(code=f"BX-{uuid4().hex[:6].upper()}", center_id=center_id,
              product_type_id=uuid4(), quantity=1, unit="pieza",
              status="SHIPPED", pallet_id=pallet.id)
    db.add(box)
    db.commit()
    return shipment, pallet, box


# ── Alta ─────────────────────────────────────────────────────────────────────

def test_an_incident_opens_attached_to_its_shipment(db):
    shipment, _, _ = _shipment_with_cargo(db)

    incident = IncidentService(db).create(
        shipment.id, center_id=CENTER, user_id=USER,
        type="OTHER", description="El consignatario reporta un bulto abierto",
    )

    assert incident.status == "OPEN"
    assert incident.shipment_id == shipment.id
    assert incident.created_by_user_id == USER


def test_an_incident_can_point_at_a_pallet_or_a_box(db):
    shipment, pallet, box = _shipment_with_cargo(db)
    service = IncidentService(db)

    con_tarima = service.create(shipment.id, CENTER, USER, type="WEIGHT_DIFF",
                                description="Pesa menos", pallet_id=pallet.id)
    con_caja = service.create(shipment.id, CENTER, USER, type="DAMAGE",
                              description="Caja mojada", box_id=box.id)

    assert con_tarima.pallet_id == pallet.id
    assert con_caja.box_id == box.id


def test_an_unknown_type_is_rejected(db):
    shipment, _, _ = _shipment_with_cargo(db)

    with pytest.raises(HTTPException) as exc:
        IncidentService(db).create(shipment.id, CENTER, USER,
                                   type="METEORITO", description="Cayó algo")

    assert exc.value.detail["code"] == "INVALID_TYPE"


def test_a_pallet_from_another_shipment_is_rejected(db):
    shipment, _, _ = _shipment_with_cargo(db)
    _, tarima_ajena, _ = _shipment_with_cargo(db)

    with pytest.raises(HTTPException) as exc:
        IncidentService(db).create(shipment.id, CENTER, USER, type="WEIGHT_DIFF",
                                   description="No cuadra", pallet_id=tarima_ajena.id)

    assert exc.value.detail["code"] == "PALLET_NOT_IN_SHIPMENT"


def test_a_box_from_another_shipment_is_rejected(db):
    shipment, _, _ = _shipment_with_cargo(db)
    _, _, caja_ajena = _shipment_with_cargo(db)

    with pytest.raises(HTTPException) as exc:
        IncidentService(db).create(shipment.id, CENTER, USER, type="DAMAGE",
                                   description="Dañada", box_id=caja_ajena.id)

    assert exc.value.detail["code"] == "BOX_NOT_IN_SHIPMENT"


# ── Resolución ───────────────────────────────────────────────────────────────

def test_resolving_records_who_when_and_how(db):
    shipment, _, _ = _shipment_with_cargo(db)
    service = IncidentService(db)
    incident = service.create(shipment.id, CENTER, USER, type="OTHER", description="Algo pasó")

    resuelta = service.resolve(incident.id, center_id=CENTER, user_id=RESOLVER,
                               note="El consignatario confirmó que apareció")

    assert resuelta.status == "RESOLVED"
    assert resuelta.resolved_by_user_id == RESOLVER
    assert resuelta.resolved_at is not None
    assert "apareció" in resuelta.resolution_note


def test_closing_without_a_note_is_rejected(db):
    """'Resuelta' sin decir cómo no significa nada seis meses después."""
    shipment, _, _ = _shipment_with_cargo(db)
    service = IncidentService(db)
    incident = service.create(shipment.id, CENTER, USER, type="OTHER", description="Algo pasó")

    for nota in ("", "   "):
        with pytest.raises(HTTPException) as exc:
            service.resolve(incident.id, center_id=CENTER, user_id=RESOLVER, note=nota)
        assert exc.value.detail["code"] == "NOTE_REQUIRED"


def test_an_incident_is_closed_once(db):
    shipment, _, _ = _shipment_with_cargo(db)
    service = IncidentService(db)
    incident = service.create(shipment.id, CENTER, USER, type="OTHER", description="Algo pasó")
    service.resolve(incident.id, CENTER, RESOLVER, note="Cerrada")

    with pytest.raises(HTTPException) as exc:
        service.resolve(incident.id, CENTER, RESOLVER, note="Otra vez")

    assert exc.value.detail["code"] == "ALREADY_RESOLVED"


# ── Listados y aislamiento ───────────────────────────────────────────────────

def test_the_tray_filters_by_status(db):
    shipment, _, _ = _shipment_with_cargo(db)
    service = IncidentService(db)
    abierta = service.create(shipment.id, CENTER, USER, type="OTHER", description="Abierta")
    cerrada = service.create(shipment.id, CENTER, USER, type="OTHER", description="Se cerrará")
    service.resolve(cerrada.id, CENTER, RESOLVER, note="Cerrada")

    abiertas = service.list_all(CENTER, status="OPEN")

    assert [i.id for i in abiertas] == [abierta.id]


def test_an_unknown_status_filter_is_rejected(db):
    with pytest.raises(HTTPException) as exc:
        IncidentService(db).list_all(CENTER, status="MEDIO_ABIERTA")

    assert exc.value.detail["code"] == "INVALID_STATUS"


def test_a_center_only_sees_its_own_incidents(db):
    propio, _, _ = _shipment_with_cargo(db)
    ajeno, _, _ = _shipment_with_cargo(db, center_id=OTHER_CENTER)
    service = IncidentService(db)
    mia = service.create(propio.id, CENTER, USER, type="OTHER", description="Mía")
    service.create(ajeno.id, OTHER_CENTER, USER, type="OTHER", description="Ajena")

    assert [i.id for i in service.list_all(CENTER)] == [mia.id]
    assert len(service.list_all(None)) == 2  # national_admin ve las dos


def test_a_center_cannot_resolve_another_centers_incident(db):
    ajeno, _, _ = _shipment_with_cargo(db, center_id=OTHER_CENTER)
    service = IncidentService(db)
    incident = service.create(ajeno.id, OTHER_CENTER, USER, type="OTHER", description="Ajena")

    with pytest.raises(HTTPException) as exc:
        service.resolve(incident.id, center_id=CENTER, user_id=RESOLVER, note="Intruso")

    assert exc.value.detail["code"] == "INCIDENT_NOT_FOUND"


def test_a_center_cannot_open_an_incident_on_another_centers_shipment(db):
    ajeno, _, _ = _shipment_with_cargo(db, center_id=OTHER_CENTER)

    with pytest.raises(HTTPException) as exc:
        IncidentService(db).create(ajeno.id, center_id=CENTER, user_id=USER,
                                   type="OTHER", description="Intruso")

    assert exc.value.detail["code"] == "SHIPMENT_NOT_FOUND"
