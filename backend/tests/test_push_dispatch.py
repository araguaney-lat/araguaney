"""El despacho de avisos: a quién le llega y qué pasa con los destinos muertos.

Fase 26, tasks 6 y 7. Lo que se prueba aquí no es que FCM funcione, sino las
decisiones que toma el servidor alrededor de él:

- Con el interruptor apagado no sale nada, ni siquiera se consulta la tabla. Es
  lo que permite desplegar esto sin encenderlo.
- Un token que FCM rechaza por inexistente **se da de baja en el momento**. Es
  la única ocasión en que el servidor se entera de que un destino murió;
  desaprovecharla dejaría la tabla llenándose de direcciones que se reintentan
  para siempre.
- Un fallo de red **no** da de baja nada. No dice nada sobre el token, y
  confundir "no pude hablar con Firebase" con "ese teléfono ya no existe"
  borraría destinos buenos.
- Un dispositivo que falla no impide avisar a los demás.
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
from app.models.device_token import DeviceToken  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.push import dispatch  # noqa: E402
from app.services.push.fcm_client import PushNotConfigured, PushResult  # noqa: E402


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


@pytest.fixture
def user_with_devices(db):
    user = User(email="ana@test.local", username="ana", hashed_password="x", role="user")
    db.add(user)
    db.flush()
    for n in (1, 2):
        db.add(DeviceToken(user_id=user.id, token=f"token-{n}", platform="android"))
    db.commit()
    return user


class _FakeClient:
    """Cliente falso con una respuesta por token."""

    def __init__(self, responses: dict[str, PushResult | Exception]):
        self.responses = responses
        self.sent: list[str] = []

    async def send(self, *, token: str, title: str, body: str, data: dict):
        self.sent.append(token)
        answer = self.responses[token]
        if isinstance(answer, Exception):
            raise answer
        return answer


def _use(monkeypatch, client: _FakeClient) -> None:
    monkeypatch.setattr(dispatch, "FcmClient", lambda: client)


def _enable(monkeypatch, value: bool = True) -> None:
    monkeypatch.setattr(dispatch.settings, "push_enabled", value)


@pytest.mark.asyncio
async def test_nothing_is_sent_while_the_switch_is_off(db, user_with_devices, monkeypatch):
    # Es lo que permite desplegar la fase sin encenderla.
    _enable(monkeypatch, False)
    client = _FakeClient({})
    _use(monkeypatch, client)

    delivered = await dispatch.notify_user(
        db, user_id=user_with_devices.id, title="t", body="b"
    )

    assert delivered == 0
    assert client.sent == []


@pytest.mark.asyncio
async def test_every_live_device_of_the_person_gets_it(db, user_with_devices, monkeypatch):
    _enable(monkeypatch)
    client = _FakeClient(
        {"token-1": PushResult(delivered=True), "token-2": PushResult(delivered=True)}
    )
    _use(monkeypatch, client)

    delivered = await dispatch.notify_user(
        db, user_id=user_with_devices.id, title="t", body="b"
    )

    assert delivered == 2
    assert sorted(client.sent) == ["token-1", "token-2"]


@pytest.mark.asyncio
async def test_a_token_fcm_calls_unregistered_is_revoked(db, user_with_devices, monkeypatch):
    _enable(monkeypatch)
    _use(
        monkeypatch,
        _FakeClient(
            {
                "token-1": PushResult(delivered=True),
                "token-2": PushResult(delivered=False, unregistered=True),
            }
        ),
    )

    delivered = await dispatch.notify_user(
        db, user_id=user_with_devices.id, title="t", body="b"
    )
    db.commit()

    assert delivered == 1
    muerto = db.query(DeviceToken).filter(DeviceToken.token == "token-2").one()
    assert muerto.revoked_at is not None
    assert muerto.revoked_reason == "unregistered"
    # El motivo distingue este caso de un cierre de sesión, que es lo que
    # permite ver después si el despacho está perdiendo destinos.
    vivo = db.query(DeviceToken).filter(DeviceToken.token == "token-1").one()
    assert vivo.revoked_at is None


@pytest.mark.asyncio
async def test_a_network_failure_does_not_kill_a_good_token(db, user_with_devices, monkeypatch):
    # Confundir "no pude hablar con Firebase" con "ese teléfono ya no existe"
    # borraría destinos buenos y la persona dejaría de recibir avisos sin que
    # nadie lo note.
    _enable(monkeypatch)
    _use(
        monkeypatch,
        _FakeClient(
            {
                "token-1": TimeoutError("la red se cayó"),
                "token-2": PushResult(delivered=True),
            }
        ),
    )

    delivered = await dispatch.notify_user(
        db, user_id=user_with_devices.id, title="t", body="b"
    )
    db.commit()

    assert delivered == 1, "el otro dispositivo sí recibe"
    intacto = db.query(DeviceToken).filter(DeviceToken.token == "token-1").one()
    assert intacto.revoked_at is None


@pytest.mark.asyncio
async def test_a_missing_credential_stops_without_touching_anything(
    db, user_with_devices, monkeypatch
):
    _enable(monkeypatch)
    _use(monkeypatch, _FakeClient({"token-1": PushNotConfigured("sin credencial")}))

    delivered = await dispatch.notify_user(
        db, user_id=user_with_devices.id, title="t", body="b"
    )
    db.commit()

    assert delivered == 0
    assert db.query(DeviceToken).filter(DeviceToken.revoked_at.isnot(None)).count() == 0


@pytest.mark.asyncio
async def test_a_revoked_device_is_not_a_destination(db, user_with_devices, monkeypatch):
    row = db.query(DeviceToken).filter(DeviceToken.token == "token-1").one()
    row.revoked_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    row.revoked_reason = "logout"
    db.commit()

    _enable(monkeypatch)
    client = _FakeClient({"token-2": PushResult(delivered=True)})
    _use(monkeypatch, client)

    await dispatch.notify_user(db, user_id=user_with_devices.id, title="t", body="b")

    assert client.sent == ["token-2"], "a quien cerró sesión no se le avisa"


@pytest.mark.asyncio
async def test_someone_without_devices_is_not_an_error(db, monkeypatch):
    solo = User(email="solo@test.local", username="solo", hashed_password="x", role="user")
    db.add(solo)
    db.commit()
    _enable(monkeypatch)

    assert await dispatch.notify_user(db, user_id=solo.id, title="t", body="b") == 0


# ── Cómo se lee la respuesta de FCM ──────────────────────────────────────────
#
# Se agregaron tras correr el diagnóstico de credencial contra producción: FCM
# contestó 400 con INVALID_ARGUMENT sobre el token, un caso que el cliente
# clasificaba como error genérico y que en realidad significa que ese destino no
# va a funcionar nunca.


def _respuesta(status: int, cuerpo: str):
    import httpx

    return httpx.Response(status_code=status, text=cuerpo)


def test_an_unregistered_token_is_recognised():
    from app.services.push.fcm_client import FcmClient

    resultado = FcmClient._classify(_respuesta(404, '{"error":{"status":"UNREGISTERED"}}'))
    assert resultado.unregistered is True


def test_a_malformed_token_is_recognised_too():
    # El caso que destapó el diagnóstico: el token no tiene forma de token.
    from app.services.push.fcm_client import FcmClient

    cuerpo = '{"error":{"code":400,"message":"The registration token is not a valid FCM registration token","status":"INVALID_ARGUMENT"}}'
    assert FcmClient._classify(_respuesta(400, cuerpo)).unregistered is True


def test_a_bad_payload_does_not_kill_the_token():
    # También es 400 con INVALID_ARGUMENT, pero el error es nuestro. Dar de baja
    # el token aquí borraría un destino bueno por un fallo de quien envía.
    from app.services.push.fcm_client import FcmClient

    cuerpo = '{"error":{"code":400,"message":"Invalid JSON payload received.","status":"INVALID_ARGUMENT"}}'
    resultado = FcmClient._classify(_respuesta(400, cuerpo))
    assert resultado.unregistered is False
    assert resultado.delivered is False
