"""Cuándo un mensaje hace vibrar un teléfono, y cuándo no.

Fase 26. La regla se decidió sabiendo un dato que la cambia: la mensajería
**ya manda correos** por cada mensaje y cada respuesta. El push no crearía el
ruido, lo duplicaría, y con una diferencia que importa: un correo espera en una
bandeja, un aviso vibra en el bolsillo de alguien que está cargando cajas.

De ahí las dos mitades de la regla, y las dos se prueban aquí:

1. **Solo hilos privados.** Los de campaña son difusión; hacer vibrar a todos
   sus miembros por cada respuesta es la vía rápida a que la gente silencie las
   notificaciones y deje de ver también las que piden algo.
2. **Sin repetir.** A quien todavía no abrió el mensaje anterior ya se le avisó
   por ese. Diez respuestas seguidas producen un aviso, no diez.

El correo sigue saliendo para todos en ambos casos: no interrumpe.
"""

import os
import uuid
from datetime import datetime, timedelta, timezone

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
from app.models.campaign import Campaign  # noqa: E402
from app.models.messaging import Thread, ThreadParticipant  # noqa: E402
from app.models.user import User  # noqa: E402
from app.repositories.thread_repository import ThreadRepository  # noqa: E402

_AYER = datetime.now(timezone.utc) - timedelta(days=1)
_HOY = datetime.now(timezone.utc)


@pytest.fixture
def world():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()

    campaign = Campaign(name="Donaciones Generales", is_general=True)
    db.add(campaign)
    db.flush()

    def make(email, active=True):
        u = User(
            email=email, username=email.split("@")[0], hashed_password="x",
            role="user", is_active=active,
        )
        db.add(u)
        return u

    ana, beto, cris, baja = (
        make("ana@t.local"), make("beto@t.local"), make("cris@t.local"),
        make("baja@t.local", active=False),
    )
    db.flush()

    hilo = Thread(
        title="Sobre la donación de agua", body="cuerpo", sender_id=ana.id,
        campaign_id=campaign.id, thread_type="PRIVATE", updated_at=_AYER,
    )
    db.add(hilo)
    db.flush()
    for u in (ana, beto, cris, baja):
        db.add(ThreadParticipant(thread_id=hilo.id, user_id=u.id))
    db.commit()

    yield {"db": db, "hilo": hilo.id, "ana": ana.id, "beto": beto.id,
           "cris": cris.id, "baja": baja.id}
    db.close()
    Base.metadata.drop_all(engine)


def _marcar_leido(db, hilo, user_id, cuando):
    fila = db.get(ThreadParticipant, {"thread_id": hilo, "user_id": user_id})
    fila.last_read_at = cuando
    db.commit()


def test_a_new_thread_notifies_every_participant(world):
    # Un hilo recién nacido no tiene actividad previa: nadie puede tener nada
    # sin leer, así que entran todos menos quien escribe.
    destinos = ThreadRepository(world["db"]).participants_with_nothing_unread(
        world["hilo"], world["ana"], since=None
    )

    assert set(destinos) == {world["beto"], world["cris"]}, (
        "quien escribe no se avisa a sí mismo y las cuentas dadas de baja no cuentan"
    )


def test_only_those_who_read_the_previous_message_are_notified(world):
    # Beto abrió el hilo después de la última actividad; Cris no lo ha abierto
    # nunca, así que ya tiene un aviso pendiente por el mensaje anterior.
    _marcar_leido(world["db"], world["hilo"], world["beto"], _HOY)

    destinos = ThreadRepository(world["db"]).participants_with_nothing_unread(
        world["hilo"], world["ana"], since=_AYER
    )

    assert destinos == [world["beto"]]


def test_reading_before_the_last_message_does_not_count(world):
    # Leyó, pero antes del mensaje que sigue sin abrir: tiene algo pendiente.
    _marcar_leido(
        world["db"], world["hilo"], world["beto"], _AYER - timedelta(hours=1)
    )

    destinos = ThreadRepository(world["db"]).participants_with_nothing_unread(
        world["hilo"], world["ana"], since=_AYER
    )

    assert destinos == []


def test_ten_replies_without_reading_produce_one_notification(world):
    """La propiedad que define la regla, comprobada como la vive alguien."""
    repo = ThreadRepository(world["db"])
    _marcar_leido(world["db"], world["hilo"], world["beto"], _HOY)

    avisos = 0
    ultima_actividad = _AYER
    for n in range(10):
        # Los mensajes llegan **después** de que Beto abrió el hilo. Hacerlos
        # coincidir en el mismo instante que su lectura sería otro caso: ahí sí
        # corresponde avisarle, porque leyó ese mensaje.
        momento = _HOY + timedelta(minutes=n + 1)
        destinos = repo.participants_with_nothing_unread(
            world["hilo"], world["ana"], since=ultima_actividad
        )
        if world["beto"] in destinos:
            avisos += 1
        ultima_actividad = momento

    assert avisos == 1, "diez respuestas sin abrir el hilo son un aviso, no diez"


def test_reading_again_re_arms_the_notification(world):
    """Tras abrir el hilo, el siguiente mensaje vuelve a avisar."""
    repo = ThreadRepository(world["db"])

    _marcar_leido(world["db"], world["hilo"], world["beto"], _HOY)
    primera = repo.participants_with_nothing_unread(
        world["hilo"], world["ana"], since=_AYER
    )
    assert world["beto"] in primera

    # Llega un mensaje y no lo abre: el siguiente ya no avisa.
    segunda = repo.participants_with_nothing_unread(
        world["hilo"], world["ana"], since=_HOY + timedelta(minutes=1)
    )
    assert world["beto"] not in segunda

    # Lo abre: se vuelve a armar.
    _marcar_leido(world["db"], world["hilo"], world["beto"], _HOY + timedelta(hours=2))
    tercera = repo.participants_with_nothing_unread(
        world["hilo"], world["ana"], since=_HOY + timedelta(minutes=1)
    )
    assert world["beto"] in tercera


def test_the_notice_carries_no_message_body(world):
    """Se lee en una pantalla de bloqueo, a veces con alguien al lado.

    Un mensaje entre operadores puede hablar de una donación con nombre y
    apellido, así que el aviso lleva el título del hilo y quién escribe, nunca
    el cuerpo.
    """
    from app.services.push import events

    class _Spy:
        def __init__(self):
            self.textos = []

        def add_task(self, fn, *args, **kwargs):
            self.textos += [a for a in args if isinstance(a, str)]

    spy = _Spy()
    events.private_message_received(
        world["db"], spy,
        thread_id=world["hilo"],
        recipient_ids=[world["beto"]],
        sender_name="Ana",
        title="Sobre la donación de agua",
    )

    junto = " ".join(spy.textos)
    assert "Ana" in junto and "Sobre la donación de agua" in junto
    assert "cuerpo" not in junto
