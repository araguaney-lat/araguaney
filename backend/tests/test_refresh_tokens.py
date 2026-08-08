"""Refresh tokens: rotación, detección de reuso y cierre de sesión.

Lo que estas pruebas fijan no es solo que renovar funcione, sino lo que protege:
un token rotado no se puede volver a usar, y si alguien lo intenta, se cae toda
la sesión (no solo ese token). Es la diferencia entre "robaron un token" y
"tienen acceso indefinido".
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.refresh_token import RefreshToken
from app.services.auth_service import AuthService


@pytest.fixture
def db():
    from sqlalchemy.dialects.postgresql import JSONB
    from sqlalchemy.ext.compiler import compiles

    # SQLite no compila JSONB (lo usa audit_log): se mapea a JSON, igual que en
    # las demás pruebas que corren sobre SQLite.
    @compiles(JSONB, "sqlite")
    def _jsonb(element, compiler, **kw):  # noqa: ANN001, ANN003
        return "JSON"

    import app.models  # noqa: F401  — registra todos los modelos

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    yield session
    session.close()


@pytest.fixture
def user(db):
    from app.models.user import User

    u = User(
        id=uuid.uuid4(),
        email="v@x.mx",
        username="v",
        hashed_password="x",
        role="user",
        center_role="volunteer",
        is_active=True,
        is_verified=True,
    )
    db.add(u)
    db.commit()
    return u


def _hash(raw: str) -> str:
    return AuthService._hash_refresh_token(raw)


def test_a_session_issues_both_tokens(db, user):
    session = AuthService(db)._issue_session(user)
    assert session["access_token"]
    assert session["refresh_token"]
    # El valor en claro no vive en la base: solo su hash.
    assert db.query(RefreshToken).filter_by(token_hash=_hash(session["refresh_token"])).one()


def test_refresh_rotates_and_revokes_the_old_token(db, user):
    first = AuthService(db)._issue_session(user)["refresh_token"]

    rotated = AuthService(db).refresh(first)
    assert rotated["access_token"]
    assert rotated["refresh_token"] != first

    old = db.query(RefreshToken).filter_by(token_hash=_hash(first)).one()
    assert old.revoked is True
    assert old.replaced_by is not None


def test_reusing_an_old_token_after_the_chain_moved_kills_the_family(db, user):
    # Robo real: la cadena ya avanzó dos veces, así que reusar el primer eslabón
    # no es un doble disparo concurrente sino un token viejo resucitado.
    first = AuthService(db)._issue_session(user)["refresh_token"]
    second = AuthService(db).refresh(first)["refresh_token"]
    third = AuthService(db).refresh(second)["refresh_token"]  # first.replaced_by (=second) ya está revocado

    with pytest.raises(HTTPException) as exc:
        AuthService(db).refresh(first)
    assert exc.value.detail["code"] == "REFRESH_TOKEN_REUSED"

    # La familia entera queda revocada: el token vigente tampoco sirve.
    with pytest.raises(HTTPException):
        AuthService(db).refresh(third)


def test_a_concurrent_double_refresh_is_tolerated(db, user):
    # El middleware y la página de Next renuevan casi a la vez con el mismo
    # token: el segundo llega cuando ya se rotó, pero dentro de la gracia y con
    # el reemplazo aún vigente. No es robo: se tolera y no tumba la sesión.
    first = AuthService(db)._issue_session(user)["refresh_token"]
    AuthService(db).refresh(first)  # rota; el reemplazo queda vigente y recién creado

    again = AuthService(db).refresh(first)  # mismo token, doble disparo
    assert again["access_token"]
    assert again["refresh_token"]


def test_an_expired_refresh_token_is_rejected(db, user):
    raw = AuthService(db)._issue_session(user)["refresh_token"]
    row = db.query(RefreshToken).filter_by(token_hash=_hash(raw)).one()
    row.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db.commit()

    with pytest.raises(HTTPException) as exc:
        AuthService(db).refresh(raw)
    assert exc.value.detail["code"] == "REFRESH_TOKEN_EXPIRED"


def test_an_unknown_refresh_token_is_rejected(db, user):
    with pytest.raises(HTTPException) as exc:
        AuthService(db).refresh("nope-not-a-real-token")
    assert exc.value.detail["code"] == "INVALID_REFRESH_TOKEN"


def test_logout_revokes_the_refresh_family(db, user):
    raw = AuthService(db)._issue_session(user)["refresh_token"]

    AuthService(db).logout("not-a-jwt-access", refresh_token=raw)

    with pytest.raises(HTTPException):
        AuthService(db).refresh(raw)


def test_a_disabled_user_cannot_refresh(db, user):
    raw = AuthService(db)._issue_session(user)["refresh_token"]
    user.is_active = False
    db.commit()

    with pytest.raises(HTTPException) as exc:
        AuthService(db).refresh(raw)
    assert exc.value.detail["code"] == "INVALID_REFRESH_TOKEN"
