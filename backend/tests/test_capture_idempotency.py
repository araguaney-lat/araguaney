"""Idempotencia de la captura (Fase 25, tasks 1-3).

Va antes que la cola offline, y el orden no es negociable: **encolar sin
idempotencia convierte "se perdió una captura" en "hay inventario fantasma"**.
Lo primero se nota y se vuelve a capturar; lo segundo son cajas duplicadas que
nadie audita, que inflan el stock nacional y que acaban en un manifiesto ante una
aduana.

El cliente genera la llave antes del primer intento y la conserva en su cola, así
que todo reintento lleva la misma. Reintentar es el caso normal cuando alguien
sale de un sótano, no la excepción.

La garantía vive en la base y no en una comprobación del servicio: entre "no
existe" y "lo escribo" hay una carrera, y dos reintentos concurrentes del mismo
teléfono la encuentran.
"""

from datetime import date, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base


@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    return "JSON"


import app.models  # noqa: E402,F401

from app.models.box import Box  # noqa: E402
from app.models.campaign import Campaign  # noqa: E402
from app.models.intake import Intake  # noqa: E402
from app.models.product_type import ProductType  # noqa: E402
from app.models.user_campaign import UserCampaign  # noqa: E402
from app.schemas.intake import BoxDraft, IntakeCreate  # noqa: E402
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
    """Una campaña con el usuario dentro y un producto capturable."""
    campana = Campaign(name="Donaciones Generales", is_general=True, is_active=True)
    db.add(campana)
    db.flush()
    db.add(UserCampaign(user_id=USER, campaign_id=campana.id))

    producto = ProductType(category="FOOD", display_name="Atún en lata",
                           default_unit="lata", min_shelf_life_days=0)
    db.add(producto)
    db.commit()
    return {"campaign": campana, "product": producto}


def _captura(mundo, capture_id=None, cajas=1):
    return IntakeCreate(
        campaign_id=mundo["campaign"].id,
        capture_id=capture_id,
        boxes=[
            BoxDraft(
                product_type_id=mundo["product"].id,
                quantity=10,
                unit="lata",
                expiry_date=date.today() + timedelta(days=400),
            )
            for _ in range(cajas)
        ],
    )


def _contar(db):
    return db.query(Intake).count(), db.query(Box).count()


# ── El caso que motiva la fase ───────────────────────────────────────────────

def test_retrying_the_same_capture_does_not_duplicate_inventory(db, mundo):
    """El escenario real: la petición llegó, la respuesta se perdió en el sótano."""
    llave = uuid4()
    servicio = IntakeService(db)

    primera = servicio.create(_captura(mundo, llave, cajas=3), CENTER, USER)
    segunda = servicio.create(_captura(mundo, llave, cajas=3), CENTER, USER)

    assert primera.id == segunda.id
    assert _contar(db) == (1, 3)


def test_the_retry_gets_the_same_answer_as_the_original(db, mundo):
    """Si la respuesta difiere, el cliente creerá que su cola quedó a medias."""
    llave = uuid4()
    servicio = IntakeService(db)

    primera = servicio.create(_captura(mundo, llave, cajas=2), CENTER, USER)
    segunda = servicio.create(_captura(mundo, llave, cajas=2), CENTER, USER)

    assert [b.code for b in segunda.boxes] == [b.code for b in primera.boxes]
    assert segunda.campaign_id == primera.campaign_id
    assert len(segunda.boxes) == 2


def test_different_captures_are_different_intakes(db, mundo):
    servicio = IntakeService(db)

    servicio.create(_captura(mundo, uuid4()), CENTER, USER)
    servicio.create(_captura(mundo, uuid4()), CENTER, USER)

    assert _contar(db) == (2, 2)


def test_a_capture_without_a_key_behaves_exactly_as_before(db, mundo):
    """La captura en línea de hoy no manda llave y no debe cambiar en nada."""
    servicio = IntakeService(db)

    servicio.create(_captura(mundo, None), CENTER, USER)
    servicio.create(_captura(mundo, None), CENTER, USER)

    # Sin llave no hay nada que deduplicar: son dos capturas distintas.
    assert _contar(db) == (2, 2)


# ── La garantía vive en la base ──────────────────────────────────────────────

def test_the_database_refuses_a_duplicate_key(db, mundo):
    """Sin esto, la comprobación del servicio tendría una carrera en medio."""
    llave = uuid4()
    IntakeService(db).create(_captura(mundo, llave), CENTER, USER)

    db.add(Intake(center_id=CENTER, campaign_id=mundo["campaign"].id, capture_id=llave))

    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_a_concurrent_retry_returns_the_winner_instead_of_failing(db, mundo):
    """Dos reintentos del mismo teléfono llegan a la vez.

    El que pierde la carrera no puede devolver un error: su captura sí se
    registró, solo que la escribió el otro. Devolver un fallo haría que el
    cliente reintentara para siempre una captura que ya está guardada.
    """
    llave = uuid4()
    servicio = IntakeService(db)
    ganador = servicio.create(_captura(mundo, llave), CENTER, USER)

    # El segundo pasa la comprobación previa contra una vista obsoleta y choca
    # con el unique al escribir. Se simula saltándose esa comprobación.
    datos = _captura(mundo, llave)
    original = servicio._to_out
    perdedor = None
    try:
        import app.repositories.intake_repository as repo_mod

        real = repo_mod.IntakeRepository.find_by_capture_id
        llamadas = {"n": 0}

        def _primera_vez_ciega(self, capture_id, center_id):
            llamadas["n"] += 1
            return None if llamadas["n"] == 1 else real(self, capture_id, center_id)

        repo_mod.IntakeRepository.find_by_capture_id = _primera_vez_ciega
        perdedor = servicio.create(datos, CENTER, USER)
    finally:
        repo_mod.IntakeRepository.find_by_capture_id = real
        servicio._to_out = original

    assert perdedor.id == ganador.id
    assert _contar(db) == (1, 1)


# ── Aislamiento entre centros ────────────────────────────────────────────────

def test_a_key_from_another_center_does_not_leak_its_capture(db, mundo):
    """Una llave adivinada no puede devolver la captura de otro centro."""
    llave = uuid4()
    servicio = IntakeService(db)
    ajena = servicio.create(_captura(mundo, llave), OTHER_CENTER, USER)

    with pytest.raises(IntegrityError):
        # El unique es global: la llave ya existe aunque sea de otro centro, y
        # eso es correcto — dos clientes nunca generan el mismo UUID.
        servicio.create(_captura(mundo, llave), CENTER, USER)
    db.rollback()

    assert db.query(Intake).count() == 1
    assert db.get(Intake, ajena.id).center_id == OTHER_CENTER
