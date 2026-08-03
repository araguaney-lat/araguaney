"""Vigilancia de rebotes de correo en volumen (Fase 24, task 6).

Registrar un rebote no es avisar de él. Los fallos de envío se guardan desde la
Fase 15 y nadie los mira, así que un proveedor que empieza a bloquearnos rompe el
doble opt-in del pre-registro de donaciones **sin producir un solo error
visible**: los correos "se envían", simplemente no llegan.

Estos tests fijan tres decisiones:

- Un rebote suelto es ruido normal y no debe alertar.
- La concentración en un dominio alerta aunque el total se vea sano: describe un
  problema distinto (un proveedor filtrando) que el total esconde.
- El aviso nombra **dominios, nunca direcciones**. La señal se lee igual y
  ninguna dirección sale de la base hacia un canal de chat.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.email_failure import EmailFailure  # noqa: F401  (registra la tabla)
from app.repositories.email_failure_repository import EmailFailureRepository
from app.services.bounce_watch import (
    DEFAULT_PER_DOMAIN,
    DEFAULT_TOTAL,
    build_bounce_alert,
)


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


def _failure(db, address: str, *, age_hours: int = 1, resolved: bool = False):
    when = datetime.now(timezone.utc) - timedelta(hours=age_hours)
    row = EmailFailure(
        resend_email_id=f"re_{address}_{age_hours}_{resolved}",
        to_email=address,
        email_type="donation_confirmation",
        event_type="bounced",
        svix_id=f"msg_{address}_{age_hours}_{resolved}",
        created_at=when,
        resolved_at=datetime.now(timezone.utc) if resolved else None,
    )
    db.add(row)
    db.commit()
    return row


# ── La consulta agrupa por dominio ───────────────────────────────────────────

def test_failures_are_grouped_by_recipient_domain(db):
    _failure(db, "ana@example.org")
    _failure(db, "luis@example.org")
    _failure(db, "sam@other.mx")

    by_domain = EmailFailureRepository(db).count_unresolved_by_domain_since(
        datetime.now(timezone.utc) - timedelta(hours=24)
    )

    assert by_domain == {"example.org": 2, "other.mx": 1}


def test_resolved_failures_are_not_counted(db):
    """Un rebote que después se entregó ya no describe ningún problema vivo."""
    _failure(db, "ana@example.org", resolved=True)
    _failure(db, "luis@example.org")

    by_domain = EmailFailureRepository(db).count_unresolved_by_domain_since(
        datetime.now(timezone.utc) - timedelta(hours=24)
    )

    assert by_domain == {"example.org": 1}


def test_failures_outside_the_window_are_not_counted(db):
    _failure(db, "ana@example.org", age_hours=100)

    by_domain = EmailFailureRepository(db).count_unresolved_by_domain_since(
        datetime.now(timezone.utc) - timedelta(hours=24)
    )

    assert by_domain == {}


# ── Cuándo alerta ────────────────────────────────────────────────────────────

def test_a_quiet_window_produces_no_alert():
    assert build_bounce_alert({}, 24) is None


def test_scattered_bounces_below_the_threshold_stay_quiet():
    """Una dirección mal escrita aquí y allá es operación normal, no incidente."""
    assert build_bounce_alert({"example.org": 2, "other.mx": 1}, 24) is None


def test_total_volume_above_the_threshold_alerts():
    spread = {f"domain{i}.mx": 1 for i in range(DEFAULT_TOTAL + 1)}

    message = build_bounce_alert(spread, 24)

    assert message is not None
    assert str(DEFAULT_TOTAL + 1) in message


def test_concentration_in_one_domain_alerts_even_when_the_total_looks_healthy():
    """Un proveedor filtrándonos es un problema que el total esconde."""
    message = build_bounce_alert({"example.org": DEFAULT_PER_DOMAIN}, 24)

    assert message is not None
    assert "example.org" in message


def test_the_alert_names_domains_and_never_addresses():
    message = build_bounce_alert({"example.org": DEFAULT_PER_DOMAIN}, 24)

    assert "@" not in message
    assert "example.org" in message


def test_the_alert_states_what_breaks_downstream():
    """Quien la lee necesita la consecuencia, no solo el número."""
    message = build_bounce_alert({"example.org": DEFAULT_PER_DOMAIN}, 24)

    assert "pre-registro" in message


def test_thresholds_can_be_tightened_from_the_environment():
    with patch.dict("os.environ", {"BOUNCE_ALERT_PER_DOMAIN": "2"}):
        assert build_bounce_alert({"example.org": 2}, 24) is not None


def test_a_malformed_threshold_does_not_disable_the_watch():
    """Una variable con basura no puede apagar la vigilancia en silencio."""
    with patch.dict("os.environ", {"BOUNCE_ALERT_PER_DOMAIN": "muchos"}):
        assert build_bounce_alert({"example.org": DEFAULT_PER_DOMAIN}, 24) is not None


# ── El cron está registrado y vigilado ───────────────────────────────────────

def test_the_watchdog_is_registered_as_a_cron():
    from app.worker import WorkerSettings, bounce_watchdog_cron

    names = {getattr(job.coroutine, "__name__", "") for job in WorkerSettings.cron_jobs}
    assert bounce_watchdog_cron.__name__ in names


def test_the_watchdog_has_its_own_heartbeat_window():
    """Un vigilante que deja de correr tiene que ser detectable como los demás."""
    from app.services.cron_heartbeat import CRON_MAX_AGE

    assert "bounce_watchdog_cron" in CRON_MAX_AGE
