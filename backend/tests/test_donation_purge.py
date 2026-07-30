"""Purga del pre-registro de donaciones (Fase 18, task 11).

Una donación que nadie confirmó es un dato que nunca llegó a tener consentimiento
verificado: se deja vencer y se le quita la PII a quien la escribió, salvo que esa
persona tenga otra donación viva o ya entregada.

A diferencia del resto de la suite, estos tests corren contra SQLite en memoria y
no contra mocks: una purga es casi toda consulta, y un mock de la consulta no
probaría nada.
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base


@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    return "JSON"


for _m in ("user", "center", "campaign", "intake", "box", "product_type",
           "shipment", "pallet", "events", "audit_log", "donor", "donation"):
    __import__(f"app.models.{_m}")

from app.models.donation import Donation, DonationEvent  # noqa: E402
from app.models.donor import Donor  # noqa: E402
from app.services.donation_purge_service import DonationPurgeService  # noqa: E402


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


def _ahora() -> datetime:
    return datetime.now(timezone.utc)


def _donante(db, email="quien@ejemplo.test", source="self", center_id=None) -> Donor:
    donor = Donor(
        donor_type="fisica", source=source, center_id=center_id,
        first_name="Nombre", last_name="Apellido",
        email=email, phone="5555555555",
        email_verify_token_hash="hash-de-token",
    )
    db.add(donor)
    db.flush()
    return donor


def _donacion(db, donor, status="PENDING_EMAIL", dias=0, **extra) -> Donation:
    donation = Donation(
        code=f"DN-{uuid.uuid4().hex[:8].upper()}",
        donor_id=donor.id,
        status=status,
        created_at=_ahora() - timedelta(days=dias),
        **extra,
    )
    db.add(donation)
    db.flush()
    return donation


# ── Vencimiento de las no confirmadas ────────────────────────────────────────

def test_una_donacion_sin_confirmar_vence(db):
    donor = _donante(db)
    donation = _donacion(db, donor, dias=30)

    DonationPurgeService.purge(db)

    assert donation.status == "EXPIRED"


def test_una_donacion_sin_confirmar_reciente_no_se_toca(db):
    donor = _donante(db)
    donation = _donacion(db, donor, dias=1)

    DonationPurgeService.purge(db)

    assert donation.status == "PENDING_EMAIL"


def test_una_donacion_confirmada_no_vence_por_vieja(db):
    """REGISTERED es una donación real esperando entrega, no basura del formulario."""
    donor = _donante(db)
    donation = _donacion(db, donor, status="REGISTERED", dias=365)

    DonationPurgeService.purge(db)

    assert donation.status == "REGISTERED"


def test_vencer_deja_evento_de_auditoria(db):
    donor = _donante(db)
    donation = _donacion(db, donor, dias=30)

    DonationPurgeService.purge(db)

    eventos = db.query(DonationEvent).filter_by(donation_id=donation.id).all()
    assert [e.to_status for e in eventos] == ["EXPIRED"]


def test_el_plazo_de_retencion_es_configurable(db, monkeypatch):
    """El plazo es una promesa publicada en el aviso, no una constante escondida."""
    monkeypatch.setenv("DONATION_PENDING_RETENTION_DAYS", "60")
    donor = _donante(db)
    donation = _donacion(db, donor, dias=30)

    DonationPurgeService.purge(db)

    assert donation.status == "PENDING_EMAIL"


# ── Purga de PII ─────────────────────────────────────────────────────────────

def test_el_donante_sin_otras_donaciones_pierde_su_pii(db):
    donor = _donante(db)
    _donacion(db, donor, dias=30)

    DonationPurgeService.purge(db)

    assert donor.email is None
    assert donor.phone is None
    assert donor.email_verify_token_hash is None


def test_el_donante_con_una_donacion_entregada_conserva_sus_datos(db):
    """Lo entregado es trazabilidad: el centro tiene que poder decir de quién vino."""
    donor = _donante(db)
    _donacion(db, donor, dias=30)
    _donacion(db, donor, status="RECEIVED", dias=30)

    DonationPurgeService.purge(db)

    assert donor.email == "quien@ejemplo.test"


def test_el_donante_con_una_donacion_por_entregar_conserva_sus_datos(db):
    donor = _donante(db)
    _donacion(db, donor, dias=30)
    _donacion(db, donor, status="REGISTERED", dias=1)

    DonationPurgeService.purge(db)

    assert donor.email == "quien@ejemplo.test"


def test_el_donante_capturado_por_un_centro_no_se_purga(db):
    """Esa cartera es del centro y su baja la decide el centro, no este job."""
    centro = uuid.uuid4()
    donor = _donante(db, source="center", center_id=centro)
    _donacion(db, donor, dias=30)

    DonationPurgeService.purge(db)

    assert donor.email == "quien@ejemplo.test"


def test_la_donacion_vencida_sobrevive_sin_pii(db):
    """Se conserva la fila para la estadística de abandono, ya sin quién la escribió."""
    donor = _donante(db)
    donation = _donacion(db, donor, dias=30)

    DonationPurgeService.purge(db)

    assert db.get(Donation, donation.id) is not None
    assert donor.email is None


# ── Enlaces de gestión vencidos ──────────────────────────────────────────────

def test_un_enlace_de_gestion_vencido_se_borra(db):
    donor = _donante(db)
    donation = _donacion(
        db, donor, status="REGISTERED",
        manage_token_hash="hash-vencido",
        manage_token_expires_at=_ahora() - timedelta(days=1),
    )

    DonationPurgeService.purge(db)

    assert donation.manage_token_hash is None
    assert donation.manage_token_expires_at is None


def test_un_enlace_de_gestion_vigente_se_respeta(db):
    donor = _donante(db)
    donation = _donacion(
        db, donor, status="REGISTERED",
        manage_token_hash="hash-vigente",
        manage_token_expires_at=_ahora() + timedelta(days=10),
    )

    DonationPurgeService.purge(db)

    assert donation.manage_token_hash == "hash-vigente"


# ── Cableado del job ─────────────────────────────────────────────────────────

def test_la_purga_esta_registrada_como_cron():
    from app.worker import WorkerSettings, purge_donations_cron

    nombres = [c.name for c in WorkerSettings.cron_jobs]
    assert f"cron:{purge_donations_cron.__name__}" in nombres


def test_la_purga_reporta_lo_que_hizo(db):
    """El cron registra conteos: una purga silenciosa no se puede auditar."""
    donor = _donante(db)
    _donacion(db, donor, dias=30)

    resultado = DonationPurgeService.purge(db)

    assert resultado["vencidas"] == 1
    assert resultado["donantes_purgados"] == 1
    assert resultado["enlaces_vencidos"] == 0


def test_un_reenvio_reciente_salva_a_una_donacion_vieja(db):
    """El reloj es el último correo enviado: pedirlo de nuevo compra el plazo entero."""
    donor = _donante(db)
    donation = _donacion(db, donor, dias=30)
    donation.confirmation_sent_at = _ahora() - timedelta(days=1)
    db.flush()

    DonationPurgeService.purge(db)

    assert donation.status == "PENDING_EMAIL"
