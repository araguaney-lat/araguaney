"""Integration fixtures for cross-tenant isolation tests.

Runs the real FastAPI app against an in-memory SQLite database (no external
services). The two Postgres-only column types in the models compile via shims:
UUID → SQLite accepts any type name; JSONB → compiled as JSON below.

Seeds two centers (A and B) with a coordinator each, plus a national_admin,
and one full inventory chain per center (intake → box → pallet → shipment).
Every test asserts from the attacker's perspective: coordinator B must never
read or mutate center A's data.
"""

import os
import uuid
from datetime import date, timedelta

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-unit-tests-only-32-chars")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    return "JSON"


from app.database import Base, get_db  # noqa: E402

# Register every model exactly like alembic/env.py does — create_all needs them.
for _m in (
    "user", "token_denylist", "center", "product_type", "shipment", "pallet",
    "intake", "box", "events", "campaign", "audit_log", "request",
    "user_campaign", "transfer", "messaging", "export_job",
    "center_application", "email_failure",
):
    __import__(f"app.models.{_m}")

from app.main import app  # noqa: E402
from app.utils.rate_limit import limiter  # noqa: E402

# Rate limits key on client IP, and every test shares the TestClient's address:
# without this, a suite that exercises the same endpoint repeatedly starts
# getting 429s partway through instead of testing what it meant to test.
limiter.enabled = False
from app.models.box import Box  # noqa: E402
from app.models.campaign import Campaign  # noqa: E402
from app.models.center import Center  # noqa: E402
from app.models.export_job import ExportJob  # noqa: E402
from app.models.intake import Intake  # noqa: E402
from app.models.messaging import Thread, ThreadParticipant  # noqa: E402
from app.models.pallet import Pallet  # noqa: E402
from app.models.product_type import ProductType  # noqa: E402
from app.models.request import Request as DomainRequest  # noqa: E402
from app.models.shipment import Shipment  # noqa: E402
from app.models.transfer import Transfer  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.user_campaign import UserCampaign  # noqa: E402
from app.services.auth_service import AuthService  # noqa: E402


class TenantWorld:
    """Everything the isolation tests need: ids, tokens and a DB session."""

    def __init__(self, db: Session) -> None:
        self.db = db
        far_expiry = date.today() + timedelta(days=400)

        self.center_a = Center(name="Centro A")
        self.center_b = Center(name="Centro B")
        db.add_all([self.center_a, self.center_b])
        db.flush()

        self.campaign = Campaign(name="Donaciones Generales", is_general=True)
        db.add(self.campaign)
        db.flush()

        def make_user(email: str, center: Center | None, center_role: str) -> User:
            user = User(
                email=email,
                username=email.split("@")[0],
                hashed_password="x",
                is_active=True,
                is_verified=True,
                role="user",
                center_id=center.id if center else None,
                center_role=center_role,
            )
            db.add(user)
            db.flush()
            return user

        self.coordinator_a = make_user("coord-a@test.local", self.center_a, "coordinator")
        self.coordinator_b = make_user("coord-b@test.local", self.center_b, "coordinator")
        self.admin = make_user("admin@test.local", None, "national_admin")

        # Both coordinators share the campaign — the hard case for reports:
        # same campaign, different centers, no cross-center visibility.
        db.add_all([
            UserCampaign(user_id=self.coordinator_a.id, campaign_id=self.campaign.id),
            UserCampaign(user_id=self.coordinator_b.id, campaign_id=self.campaign.id),
        ])
        db.flush()

        self.product_type = ProductType(display_name="Agua 1L", category="WATER")
        db.add(self.product_type)
        db.flush()

        def make_chain(center: Center, user: User, tag: str) -> dict:
            intake = Intake(center_id=center.id, campaign_id=self.campaign.id,
                            received_by_user_id=user.id)
            db.add(intake)
            db.flush()
            box = Box(
                code=f"BX-{tag}", center_id=center.id, intake_id=intake.id,
                product_type_id=self.product_type.id, status="SEALED",
                batch="L001", expiry_date=far_expiry, quantity=10, unit="unidades",
            )
            draft = Box(
                code=f"BX-{tag}D", center_id=center.id, intake_id=intake.id,
                product_type_id=self.product_type.id, status="DRAFT",
                batch="L002", expiry_date=far_expiry, quantity=5, unit="unidades",
            )
            pallet = Pallet(code=f"TM-{tag}", center_id=center.id, status="OPEN")
            shipment = Shipment(reference=f"EN-{tag}", center_id=center.id,
                                campaign_id=self.campaign.id, status="OPEN")
            db.add_all([box, draft, pallet, shipment])
            db.flush()
            return {"intake": intake, "box": box, "draft": draft,
                    "pallet": pallet, "shipment": shipment}

        self.a = make_chain(self.center_a, self.coordinator_a, "AAAAA1")
        self.b = make_chain(self.center_b, self.coordinator_b, "BBBBB1")

        self.request_a = DomainRequest(
            author_id=self.coordinator_a.id, center_id=self.center_a.id,
            title="Solicitud de A", description="detalle privado de A",
        )
        self.export_a = ExportJob(
            kind="manifest_pdf", params={"shipment_id": str(self.a["shipment"].id)},
            requested_by=self.coordinator_a.id, center_id=self.center_a.id,
        )
        # PRIVATE thread between coordinator A and the admin — B is not a participant.
        self.thread_a = Thread(
            title="Privado de A", body="contenido privado",
            sender_id=self.coordinator_a.id, campaign_id=self.campaign.id,
            thread_type="PRIVATE",
        )
        db.add_all([self.request_a, self.export_a, self.thread_a])
        db.flush()
        db.add_all([
            ThreadParticipant(thread_id=self.thread_a.id, user_id=self.coordinator_a.id),
            ThreadParticipant(thread_id=self.thread_a.id, user_id=self.admin.id),
        ])
        # A center-to-center transfer that involves A but not B.
        self.transfer_a = Transfer(
            from_center_id=self.center_a.id, to_center_id=self.center_a.id,
            status="REQUESTED", initiated_by=self.admin.id,
        )
        db.add(self.transfer_a)
        db.commit()

    def token(self, user: User) -> dict[str, str]:
        raw = AuthService.create_access_token(
            str(user.id),
            center_id=str(user.center_id) if user.center_id else None,
            center_role=user.center_role,
        )
        return {"Authorization": f"Bearer {raw}"}


@pytest.fixture()
def world():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, expire_on_commit=False)
    db = TestingSession()

    def override_get_db():
        try:
            yield db
        finally:
            pass  # session lives for the whole test; closed below

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TenantWorld(db)
    finally:
        app.dependency_overrides.pop(get_db, None)
        db.close()
        engine.dispose()


@pytest.fixture()
def client():
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
