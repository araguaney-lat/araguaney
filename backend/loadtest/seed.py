"""Seed a Postgres DB with realistic volume for Fase 12 load testing (Grupo F).

Bulk-inserts directly via SQLAlchemy (bypasses the API/business logic — the
point here is DB query-plan behavior under volume, not exercising business
rules). Deterministic: same seed produces the same data, so runs against
different migration states (with/without the Grupo A indices) are directly
comparable.

Usage:
    DATABASE_URL=postgresql://... SECRET_KEY=... python3 loadtest/seed.py

Produces (defaults, override via env vars below):
    - 1 campaign
    - N_CENTERS centers, each with a coordinator + volunteer user
      (password: LOADTEST_PASSWORD, default "loadtest12345")
    - ~50 product types (spread across all 8 categories)
    - BOXES_PER_CENTER boxes per center (~80% SEALED, rest DRAFT/SHIPPED),
      each backed by an intake, with box_events per status transition
    - A handful of shipments/pallets per center, with matching pallet_events/
      shipment_events, so the shipment-composite indices have volume too
    - Proportional audit_log rows (one per box seal, matching real usage)

Login for k6: username "coordinator-{n}", password LOADTEST_PASSWORD.
"""

import os
import random
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt

import app.models.user, app.models.token_denylist, app.models.center, app.models.product_type
import app.models.shipment, app.models.pallet, app.models.intake, app.models.box, app.models.events
import app.models.campaign, app.models.audit_log, app.models.request, app.models.user_campaign
import app.models.transfer, app.models.messaging, app.models.export_job

from app.database import SessionLocal
from app.models.audit_log import AuditLog
from app.models.box import Box
from app.models.campaign import Campaign
from app.models.center import Center
from app.models.events import BoxEvent, PalletEvent, ShipmentEvent
from app.models.intake import Intake
from app.models.pallet import Pallet
from app.models.product_type import ProductType, PRODUCT_CATEGORIES
from app.models.shipment import Shipment
from app.models.user import User
from app.models.user_campaign import UserCampaign

N_CENTERS = int(os.environ.get("N_CENTERS", "20"))
BOXES_PER_CENTER = int(os.environ.get("BOXES_PER_CENTER", "300"))
LOADTEST_PASSWORD = os.environ.get("LOADTEST_PASSWORD", "loadtest12345")

# Fixed, well-known IDs — k6 scripts reference these directly instead of
# discovering them via API calls (see k6/helpers.js CAMPAIGN_ID / PRODUCT_TYPE_ID).
CAMPAIGN_ID = uuid.UUID("00000000-0000-0000-0000-0000000000c1")
LOADTEST_PRODUCT_TYPE_ID = uuid.UUID("00000000-0000-0000-0000-0000000000e1")

random.seed(42)  # deterministic — same volume/distribution across runs


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _random_past(days_back: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(
        days=random.randint(0, days_back), hours=random.randint(0, 23), minutes=random.randint(0, 59)
    )


def main() -> None:
    db = SessionLocal()

    print(f"Seeding {N_CENTERS} centers x {BOXES_PER_CENTER} boxes = {N_CENTERS * BOXES_PER_CENTER} boxes...")

    campaign = Campaign(id=CAMPAIGN_ID, name="Operación Norte 2026", destination_country="VE", is_general=True)
    db.add(campaign)
    db.flush()

    loadtest_pt = ProductType(
        id=LOADTEST_PRODUCT_TYPE_ID,
        category="FOOD",
        display_name="Arroz 1kg (load test)",
        default_unit="unidad",
        min_shelf_life_days=180,
    )
    product_types = [loadtest_pt] + [
        ProductType(
            id=uuid.uuid4(),
            category=cat,
            display_name=f"{cat.title()} genérico {i}",
            inn_name=f"INN-{cat}-{i}" if cat == "MEDICINE" else None,
            strength="500mg" if cat == "MEDICINE" else None,
            default_unit="unidad",
            min_shelf_life_days=180,
        )
        for cat in PRODUCT_CATEGORIES
        for i in range(6)
    ]
    db.add_all(product_types)
    db.flush()

    national_admin = User(
        id=uuid.uuid4(),
        email="national-admin@loadtest.local",
        username="national-admin",
        hashed_password=_hash(LOADTEST_PASSWORD),
        is_active=True,
        is_verified=True,
        role="user",
        center_id=None,
        center_role="national_admin",
    )
    db.add(national_admin)
    db.flush()

    for c in range(N_CENTERS):
        center = Center(
            id=uuid.uuid4(),
            name=f"Centro de Acopio {c+1:03d}",
            country_code="MX",
            state_name=random.choice(["CDMX", "Jalisco", "Nuevo León", "Puebla", "Yucatán"]),
            is_active=True,
        )
        db.add(center)
        db.flush()

        coordinator = User(
            id=uuid.uuid4(),
            email=f"coordinator-{c}@loadtest.local",
            username=f"coordinator-{c}",
            hashed_password=_hash(LOADTEST_PASSWORD),
            is_active=True,
            is_verified=True,
            role="user",
            center_id=center.id,
            center_role="coordinator",
        )
        volunteer = User(
            id=uuid.uuid4(),
            email=f"volunteer-{c}@loadtest.local",
            username=f"volunteer-{c}",
            hashed_password=_hash(LOADTEST_PASSWORD),
            is_active=True,
            is_verified=True,
            role="user",
            center_id=center.id,
            center_role="volunteer",
        )
        db.add_all([coordinator, volunteer])
        db.flush()
        db.add_all([
            UserCampaign(user_id=coordinator.id, campaign_id=campaign.id),
            UserCampaign(user_id=volunteer.id, campaign_id=campaign.id),
        ])

        # Shipments + pallets first, so boxes can be distributed across OPEN pallets too
        shipments = [
            Shipment(id=uuid.uuid4(), center_id=center.id, campaign_id=campaign.id, status="OPEN")
            for _ in range(3)
        ]
        db.add_all(shipments)
        db.flush()
        for s in shipments:
            db.add(ShipmentEvent(shipment_id=s.id, user_id=coordinator.id, from_status=None, to_status="OPEN", ts=_random_past(60)))

        pallets = [
            Pallet(id=uuid.uuid4(), code=f"PAL-{uuid.uuid4().hex[:10].upper()}", center_id=center.id, status="OPEN")
            for _ in range(8)
        ]
        db.add_all(pallets)
        db.flush()
        for p in pallets:
            db.add(PalletEvent(pallet_id=p.id, user_id=coordinator.id, from_status=None, to_status="OPEN", ts=_random_past(60)))

        for i in range(BOXES_PER_CENTER):
            pt = random.choice(product_types)
            intake = Intake(
                id=uuid.uuid4(),
                center_id=center.id,
                campaign_id=campaign.id,
                received_by_user_id=volunteer.id,
                created_at=_random_past(90),
            )
            db.add(intake)
            db.flush()

            roll = random.random()
            status = "SEALED" if roll < 0.80 else ("SHIPPED" if roll < 0.90 else "DRAFT")
            created_at = _random_past(90)
            box = Box(
                id=uuid.uuid4(),
                code=f"BOX-{uuid.uuid4().hex[:10].upper()}",
                center_id=center.id,
                product_type_id=pt.id,
                intake_id=intake.id,
                pallet_id=random.choice(pallets).id if status != "DRAFT" and random.random() < 0.3 else None,
                quantity=random.randint(10, 200),
                unit="unidad",
                batch=f"LOTE-{random.randint(1000, 9999)}",
                weight_kg=round(random.uniform(0.5, 15.0), 2),
                status=status,
                created_at=created_at,
                sealed_at=created_at + timedelta(hours=1) if status in ("SEALED", "SHIPPED") else None,
            )
            db.add(box)
            db.flush()

            db.add(BoxEvent(box_id=box.id, user_id=volunteer.id, from_status=None, to_status="DRAFT", ts=created_at))
            if status in ("SEALED", "SHIPPED"):
                db.add(BoxEvent(box_id=box.id, user_id=volunteer.id, from_status="DRAFT", to_status="SEALED", ts=box.sealed_at))
                db.add(AuditLog(
                    id=uuid.uuid4(),
                    user_id=volunteer.id,
                    action="BOX_SEALED",
                    entity_type="box",
                    entity_id=str(box.id),
                    created_at=box.sealed_at,
                ))
            if status == "SHIPPED":
                db.add(BoxEvent(box_id=box.id, user_id=coordinator.id, from_status="SEALED", to_status="SHIPPED", ts=box.sealed_at + timedelta(days=1)))

            if (i + 1) % 100 == 0:
                db.commit()
                print(f"  center {c+1}/{N_CENTERS}: {i+1}/{BOXES_PER_CENTER} boxes")

        db.commit()

    print(f"Done. {N_CENTERS} centers, {N_CENTERS * BOXES_PER_CENTER} boxes.")
    print(f"Login for k6: username=coordinator-0..{N_CENTERS-1} or volunteer-0..{N_CENTERS-1} (center-scoped),")
    print(f"              username=national-admin (all-centers scope) — password={LOADTEST_PASSWORD}")


if __name__ == "__main__":
    main()
