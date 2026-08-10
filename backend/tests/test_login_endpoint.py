"""El inicio de sesión, ejercitado de verdad contra el endpoint.

Existe porque la Fase 26 le puso `response_model=Token` a `POST /v1/auth/login`,
y en FastAPI un modelo de respuesta **filtra** el cuerpo: una clave que el modelo
no declare desaparece sin error visible. Comprobar el modelo contra el
diccionario que arma la sesión (`test_login_response_contract.py`) verifica las
dos declaraciones; esto verifica lo que sale por el cable.

Cubre los dos desenlaces, porque el riesgo es distinto en cada uno. El 200 pasa
por el modelo y podría perder campos. El 202 devuelve un `JSONResponse` ya
construido, que FastAPI no filtra, y esta prueba fija esa diferencia: si alguien
convirtiera esa rama en un `return` normal, el modelo la recortaría y el segundo
factor dejaría de funcionar.
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


# La aplicación habla Postgres; estas pruebas levantan SQLite en memoria, que no
# conoce JSONB. Mismo apaño que usa `tests/tenant/conftest.py`: `create_all`
# construye todas las tablas registradas, no solo las que esta prueba toca.
@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    return "JSON"


from app.database import Base, get_db  # noqa: E402

__import__("app.models.user")
__import__("app.models.center")

from app.main import app
from app.models.center import Center
from app.models.user import User
from app.services.auth_service import AuthService
from app.utils.rate_limit import limiter

# El límite del login es por IP y todas las pruebas comparten la del TestClient.
limiter.enabled = False

_PASSWORD = "una-contrasena-de-prueba"


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app), TestingSession
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(engine)


def _seed_user(session_factory, *, totp: bool = False, must_change: bool = False):
    db = session_factory()
    center = Center(name="Centro de prueba", country_code="MX")
    db.add(center)
    db.flush()
    user = User(
        email="operadora@test.local",
        username="operadora",
        hashed_password=AuthService.hash_password(_PASSWORD),
        is_active=True,
        is_verified=True,
        role="user",
        center_id=center.id,
        center_role="coordinator",
        must_change_password=must_change,
        totp_enabled=totp,
        totp_secret="cifrado-irrelevante-para-esta-rama" if totp else None,
    )
    db.add(user)
    db.commit()
    center_id = str(center.id)
    db.close()
    return center_id


def _log_in(client: TestClient):
    return client.post(
        "/v1/auth/login",
        data={"username": "operadora@test.local", "password": _PASSWORD},
    )


def test_a_successful_login_returns_every_field_of_the_session(client):
    api, sessions = client
    center_id = _seed_user(sessions)

    response = _log_in(api)

    assert response.status_code == 200
    body = response.json()
    # La aplicación web lee estas claves; el modelo de respuesta no puede
    # quitarle ninguna.
    assert set(body) == {
        "access_token",
        "refresh_token",
        "token_type",
        "role",
        "center_role",
        "center_id",
        "must_change_password",
        "must_accept_terms",
    }
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["token_type"] == "bearer"
    assert body["role"] == "user"
    assert body["center_role"] == "coordinator"
    assert body["center_id"] == center_id
    assert body["must_change_password"] is False
    assert isinstance(body["must_accept_terms"], bool)


def test_the_forced_password_change_flag_survives_the_response_model(client):
    api, sessions = client
    _seed_user(sessions, must_change=True)

    body = _log_in(api).json()

    assert body["must_change_password"] is True


def test_a_second_factor_account_gets_the_partial_token_untouched(client):
    # Esta rama devuelve un JSONResponse, que FastAPI no pasa por el modelo de
    # respuesta. Si alguien la volviera un `return` normal, el modelo la
    # recortaría y el segundo factor se rompería en silencio.
    api, sessions = client
    _seed_user(sessions, totp=True)

    response = _log_in(api)

    assert response.status_code == 202
    body = response.json()
    assert body["requires_totp"] is True
    assert body["partial_token"]
    assert "access_token" not in body


def test_wrong_credentials_do_not_open_a_session(client):
    api, sessions = client
    _seed_user(sessions)

    response = api.post(
        "/v1/auth/login",
        data={"username": "operadora@test.local", "password": "equivocada"},
    )

    assert response.status_code == 401
    assert "access_token" not in response.json()


def test_an_unverified_account_cannot_log_in(client):
    api, sessions = client
    db = sessions()
    user = User(
        email="sin-verificar@test.local",
        username="sin-verificar",
        hashed_password=AuthService.hash_password(_PASSWORD),
        is_active=True,
        is_verified=False,
        role="user",
    )
    db.add(user)
    db.commit()
    db.close()

    response = api.post(
        "/v1/auth/login",
        data={"username": "sin-verificar@test.local", "password": _PASSWORD},
    )

    assert response.status_code == 403
