"""Qué hechos generan aviso y a quién, que es la parte de dominio del push.

Fase 26, task 8. El despacho ya estaba probado; lo que se fija aquí es la
decisión: avisar solo de lo que alguien tiene que resolver, y avisarle a quien
puede resolverlo.

Dos reglas del dominio se prueban porque no son obvias y su violación sería
silenciosa:

- De una revisión de riesgo se avisa a la coordinación, **no** a quien capturó.
  El dominio dice que la resuelve la coordinación, nunca quien la originó, así
  que avisarle sería invitarlo a intervenir donde no le toca.
- Un aviso nunca tumba el hecho que lo provoca. El intake se guarda y el envío
  cambia de estado aunque encolar el aviso falle.
"""

import os
import uuid

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests-only-32-chars")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    return "JSON"


from app.database import Base  # noqa: E402
from app.models.center import Center  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.push import events as push_events  # noqa: E402


class _SpyTasks:
    """Recoge lo que se encoló, sin ejecutar nada."""

    def __init__(self) -> None:
        self.calls: list[tuple] = []

    def add_task(self, fn, *args, **kwargs):
        self.calls.append((args, kwargs))


@pytest.fixture
def world():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()

    center = Center(name="Centro A", country_code="MX")
    otro = Center(name="Centro B", country_code="MX")
    db.add_all([center, otro])
    db.flush()

    def make(email, center_id, role, active=True):
        u = User(
            email=email, username=email.split("@")[0], hashed_password="x",
            role="user", center_id=center_id, center_role=role, is_active=active,
        )
        db.add(u)
        return u

    coord = make("coord@test.local", center.id, "coordinator")
    coord2 = make("coord2@test.local", center.id, "coordinator")
    make("volun@test.local", center.id, "volunteer")
    make("baja@test.local", center.id, "coordinator", active=False)
    make("ajeno@test.local", otro.id, "coordinator")
    db.commit()

    yield {"db": db, "center": center.id, "coordinators": {coord.id, coord2.id}}
    db.close()
    Base.metadata.drop_all(engine)


def _enqueued_user_ids(spy: _SpyTasks) -> set[str]:
    # enqueue() llama add_task(pool.enqueue_job, task_name, *args); sin pool de
    # ARQ en pruebas cae al camino de respaldo, así que se lee por posición.
    ids = set()
    for args, _ in spy.calls:
        for a in args:
            if isinstance(a, str) and len(a) == 36:
                ids.add(a)
    return ids


def test_a_risk_review_notifies_the_coordination_and_only_them(world):
    spy = _SpyTasks()

    push_events.risk_review_opened(
        world["db"], spy, center_id=world["center"], intake_id=uuid.uuid4()
    )

    avisados = _enqueued_user_ids(spy)
    assert avisados == {str(i) for i in world["coordinators"]}, (
        "voluntariado, coordinación dada de baja y otros centros quedan fuera"
    )


def test_a_delivered_shipment_notifies_the_origin_coordination(world):
    spy = _SpyTasks()

    push_events.shipment_delivered(
        world["db"], spy, center_id=world["center"],
        shipment_id=uuid.uuid4(), reference="EN-001",
    )

    assert _enqueued_user_ids(spy) == {str(i) for i in world["coordinators"]}


def test_the_shipment_notice_names_the_shipment(world):
    # Quien lo recibe tiene varios envíos en vuelo; sin la referencia el aviso
    # obliga a abrir la aplicación para saber de cuál habla.
    spy = _SpyTasks()

    push_events.shipment_delivered(
        world["db"], spy, center_id=world["center"],
        shipment_id=uuid.uuid4(), reference="EN-042",
    )

    textos = [a for args, _ in spy.calls for a in args if isinstance(a, str)]
    assert any("EN-042" in t for t in textos)


def test_the_risk_notice_does_not_say_why_it_was_raised(world):
    # Se lee en una pantalla de bloqueo, a veces con alguien al lado. El motivo
    # vive dentro de la revisión, con su contexto.
    spy = _SpyTasks()

    push_events.risk_review_opened(
        world["db"], spy, center_id=world["center"], intake_id=uuid.uuid4()
    )

    textos = " ".join(a for args, _ in spy.calls for a in args if isinstance(a, str))
    for palabra in ("volumen", "anónim", "donante", "atípic"):
        assert palabra not in textos.lower()


def test_without_background_tasks_nothing_is_enqueued(world):
    # Es el camino de las pruebas y de cualquier llamada interna que no venga de
    # una petición: no debe reventar por no tener dónde encolar.
    push_events.risk_review_opened(
        world["db"], None, center_id=world["center"], intake_id=uuid.uuid4()
    )


def test_a_center_without_coordination_is_not_an_error(world):
    huerfano = Center(name="Sin coordinación", country_code="MX")
    world["db"].add(huerfano)
    world["db"].commit()
    spy = _SpyTasks()

    push_events.shipment_delivered(
        world["db"], spy, center_id=huerfano.id,
        shipment_id=uuid.uuid4(), reference="EN-002",
    )

    assert spy.calls == []


def test_a_failure_while_enqueuing_does_not_propagate(world):
    """El hecho ya ocurrió; el aviso es su efecto secundario, no al revés."""

    class _Roto:
        def add_task(self, *a, **kw):
            raise RuntimeError("Redis caído")

    push_events.risk_review_opened(
        world["db"], _Roto(), center_id=world["center"], intake_id=uuid.uuid4()
    )
