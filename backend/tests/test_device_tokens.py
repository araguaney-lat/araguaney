"""El registro de destinos de aviso, con el dispositivo compartido en el centro.

Fase 26, task 5. Un token dice dónde entregar un aviso, y en un centro de acopio
el teléfono pasa de mano en mano durante una jornada. Casi todo lo que se prueba
aquí sale de ese hecho:

- Registrar el mismo token con otra sesión **reasigna** el destino en vez de
  crear otro. Dos filas vivas para la misma instalación harían que la persona
  anterior siguiera recibiendo avisos en un teléfono que ya no tiene.
- Dar de baja es parte de cerrar sesión, no una limpieza opcional.
- Nadie puede dar de baja el token de otra persona, y el intento no revela si
  ese token existe.
"""

import os
import uuid

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests-only-32-chars")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    return "JSON"


from app.database import Base, get_db  # noqa: E402
from app.dependencies import get_current_user  # noqa: E402
from app.main import app  # noqa: E402
from app.models.device_token import DeviceToken  # noqa: E402
from app.models.user import User  # noqa: E402
from app.utils.rate_limit import limiter  # noqa: E402

limiter.enabled = False

_TOKEN = "fcm-token-de-la-instalacion"


@pytest.fixture
def world():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    Sessions = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    db = Sessions()
    ana = User(email="ana@test.local", username="ana", hashed_password="x", role="user")
    beto = User(email="beto@test.local", username="beto", hashed_password="x", role="user")
    db.add_all([ana, beto])
    db.commit()
    ana_id, beto_id = ana.id, beto.id
    db.close()

    def override_get_db():
        session = Sessions()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    def as_user(user_id: uuid.UUID):
        session = Sessions()
        user = session.get(User, user_id)
        app.dependency_overrides[get_current_user] = lambda: user

    yield {
        "client": TestClient(app),
        "sessions": Sessions,
        "ana": ana_id,
        "beto": beto_id,
        "as_user": as_user,
    }

    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_user, None)
    Base.metadata.drop_all(engine)


def _rows(sessions, token: str = _TOKEN) -> list[DeviceToken]:
    db = sessions()
    found = db.query(DeviceToken).filter(DeviceToken.token == token).all()
    db.close()
    return found


def _register(client, token: str = _TOKEN, platform: str = "android"):
    return client.post(
        "/v1/devices",
        json={"token": token, "platform": platform, "app_version": "1.0.0"},
    )


def test_registering_stores_the_destination_for_the_session_owner(world):
    world["as_user"](world["ana"])

    assert _register(world["client"]).status_code == 200

    rows = _rows(world["sessions"])
    assert len(rows) == 1
    assert rows[0].user_id == world["ana"]
    assert rows[0].is_active is True


def test_registering_twice_does_not_duplicate_the_destination(world):
    # La aplicación registra al iniciar sesión y cada vez que FCM rota el token,
    # así que repetir es el caso normal y no puede ser un error.
    world["as_user"](world["ana"])

    _register(world["client"])
    assert _register(world["client"]).status_code == 200

    assert len(_rows(world["sessions"])) == 1


def test_a_shared_device_moves_to_whoever_logs_in(world):
    # El caso que define el diseño: el mismo teléfono, otra persona.
    world["as_user"](world["ana"])
    _register(world["client"])

    world["as_user"](world["beto"])
    _register(world["client"])

    rows = _rows(world["sessions"])
    assert len(rows) == 1, "una instalación es un destino, no dos"
    assert rows[0].user_id == world["beto"]
    assert rows[0].is_active is True


def test_unregistering_leaves_the_row_marked_instead_of_deleted(world):
    world["as_user"](world["ana"])
    _register(world["client"])

    response = world["client"].post("/v1/devices/unregister", json={"token": _TOKEN})

    assert response.status_code == 200
    rows = _rows(world["sessions"])
    assert len(rows) == 1
    assert rows[0].is_active is False
    assert rows[0].revoked_reason == "logout"
    assert rows[0].revoked_at is not None


def test_nobody_can_silence_someone_else_notifications(world):
    world["as_user"](world["ana"])
    _register(world["client"])

    world["as_user"](world["beto"])
    response = world["client"].post("/v1/devices/unregister", json={"token": _TOKEN})

    # Responde igual, para no revelar si ese token existe, pero no lo toca.
    assert response.status_code == 200
    assert _rows(world["sessions"])[0].is_active is True


def test_unregistering_an_unknown_token_is_not_an_error(world):
    world["as_user"](world["ana"])

    response = world["client"].post("/v1/devices/unregister", json={"token": "inventado"})

    assert response.status_code == 200


def test_registering_again_revives_a_token_that_was_logged_out(world):
    # Volver a iniciar sesión en el mismo teléfono no debería dejar la fila
    # vieja muerta y crear otra.
    world["as_user"](world["ana"])
    _register(world["client"])
    world["client"].post("/v1/devices/unregister", json={"token": _TOKEN})

    _register(world["client"])

    rows = _rows(world["sessions"])
    assert len(rows) == 1
    assert rows[0].is_active is True
    assert rows[0].revoked_at is None
    assert rows[0].revoked_reason is None


def test_the_platform_is_restricted_to_the_two_that_exist(world):
    world["as_user"](world["ana"])

    response = _register(world["client"], platform="blackberry")

    assert response.status_code == 422


def test_registering_needs_a_session(world):
    app.dependency_overrides.pop(get_current_user, None)

    response = _register(world["client"])

    # Sin sesión no hay a quién entregarle avisos, y aceptarlo permitiría
    # suscribirse a los de otra persona.
    assert response.status_code in (401, 403)
