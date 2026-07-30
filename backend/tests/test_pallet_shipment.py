"""Tests for pallet and shipment state machines."""

from datetime import date, datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from uuid import uuid4

_NOW = datetime(2026, 6, 29, 12, 0, tzinfo=timezone.utc)

import pytest

from app.services.pallet_service import PalletService
from app.services.shipment_service import ShipmentService
from app.schemas.pallet import PalletCreate
from app.schemas.shipment import ShipmentCreate


CENTER_ID = uuid4()
USER_ID = uuid4()
PALLET_ID = uuid4()
SHIPMENT_ID = uuid4()


def _make_db():
    return MagicMock()


def _pallet(status="OPEN", **kwargs):
    p = MagicMock()
    p.id = PALLET_ID
    p.code = "TM-ABCDEF"
    p.center_id = CENTER_ID
    p.shipment_id = None
    p.status = status
    p.notes = None
    p.closed_at = None
    p.created_at = _NOW
    # Pesaje de Fase 21: sin báscula por default, como una tarima recién armada.
    p.gross_weight_kg = None
    p.tare_weight_kg = None
    p.height_cm = None
    for k, v in kwargs.items():
        setattr(p, k, v)
    return p


def _box(status="SEALED", pallet_id=None, **kwargs):
    b = MagicMock()
    b.id = uuid4()
    b.code = "BX-TEST01"
    b.center_id = CENTER_ID
    b.product_type_id = uuid4()
    b.pallet_id = pallet_id
    b.status = status
    b.batch = "L001"
    b.expiry_date = date.today() + timedelta(days=400)
    b.quantity = 10
    b.unit = "unidades"
    b.weight_kg = None
    b.intake_id = None
    b.reject_reason = None
    b.sealed_at = None
    b.created_at = _NOW
    for k, v in kwargs.items():
        setattr(b, k, v)
    return b


def _shipment(status="OPEN", **kwargs):
    s = MagicMock()
    s.id = SHIPMENT_ID
    s.center_id = CENTER_ID
    s.campaign_id = None
    s.destination = "Venezuela"
    s.carrier = None
    s.reference = None
    s.status = status
    s.notes = None
    s.closed_at = None
    s.shipped_at = None
    s.created_at = _NOW
    s.height_profile = None          # sin restricción de altura declarada
    for k, v in kwargs.items():
        setattr(s, k, v)
    return s


# ── PalletService tests ───────────────────────────────────────────────────────

class TestPalletCreate:

    def test_create_requires_center_id(self):
        from fastapi import HTTPException
        svc = PalletService(_make_db())
        with pytest.raises(HTTPException) as exc_info:
            svc.create(center_id=None, user_id=USER_ID, data=PalletCreate())
        assert exc_info.value.status_code == 403

    def test_create_ok(self):
        db = _make_db()
        svc = PalletService(db)
        mock_pallet = _pallet()
        with patch("app.services.pallet_service.PalletRepository") as MockRepo:
            MockRepo.return_value.save.return_value = mock_pallet
            result = svc.create(center_id=CENTER_ID, user_id=USER_ID, data=PalletCreate())
        assert result.status == "OPEN"


class TestPalletAddBox:

    def test_add_sealed_box_ok(self):
        pallet = _pallet(status="OPEN")
        box = _box(status="SEALED", pallet_id=None)
        db = _make_db()
        svc = PalletService(db)
        with (
            patch("app.services.pallet_service.PalletRepository") as MockPalletRepo,
            patch("app.services.pallet_service.BoxRepository") as MockBoxRepo,
        ):
            MockPalletRepo.return_value.find_by_id.return_value = pallet
            MockPalletRepo.return_value.find_boxes.return_value = [box]
            MockBoxRepo.return_value.find_by_code.return_value = box
            result = svc.add_box(PALLET_ID, box.code, center_id=CENTER_ID, user_id=USER_ID)
        assert box.pallet_id == PALLET_ID

    def test_add_draft_box_raises(self):
        from fastapi import HTTPException
        pallet = _pallet(status="OPEN")
        box = _box(status="DRAFT", pallet_id=None)
        db = _make_db()
        svc = PalletService(db)
        with (
            patch("app.services.pallet_service.PalletRepository") as MockPalletRepo,
            patch("app.services.pallet_service.BoxRepository") as MockBoxRepo,
        ):
            MockPalletRepo.return_value.find_by_id.return_value = pallet
            MockBoxRepo.return_value.find_by_code.return_value = box
            with pytest.raises(HTTPException) as exc_info:
                svc.add_box(PALLET_ID, box.code, center_id=CENTER_ID, user_id=USER_ID)
        assert exc_info.value.status_code == 400

    def test_add_already_assigned_box_raises(self):
        from fastapi import HTTPException
        pallet = _pallet(status="OPEN")
        box = _box(status="SEALED", pallet_id=uuid4())
        db = _make_db()
        svc = PalletService(db)
        with (
            patch("app.services.pallet_service.PalletRepository") as MockPalletRepo,
            patch("app.services.pallet_service.BoxRepository") as MockBoxRepo,
        ):
            MockPalletRepo.return_value.find_by_id.return_value = pallet
            MockBoxRepo.return_value.find_by_code.return_value = box
            with pytest.raises(HTTPException) as exc_info:
                svc.add_box(PALLET_ID, box.code, center_id=CENTER_ID, user_id=USER_ID)
        assert exc_info.value.status_code == 400

    def test_add_to_closed_pallet_raises(self):
        from fastapi import HTTPException
        pallet = _pallet(status="CLOSED")
        box = _box(status="SEALED", pallet_id=None)
        db = _make_db()
        svc = PalletService(db)
        with (
            patch("app.services.pallet_service.PalletRepository") as MockPalletRepo,
            patch("app.services.pallet_service.BoxRepository") as MockBoxRepo,
        ):
            MockPalletRepo.return_value.find_by_id.return_value = pallet
            MockBoxRepo.return_value.find_by_code.return_value = box
            with pytest.raises(HTTPException) as exc_info:
                svc.add_box(PALLET_ID, box.code, center_id=CENTER_ID, user_id=USER_ID)
        assert exc_info.value.status_code == 400


class TestPalletClose:

    def test_close_open_pallet_with_boxes_ok(self):
        pallet = _pallet(status="OPEN")
        db = _make_db()
        svc = PalletService(db)
        with patch("app.services.pallet_service.PalletRepository") as MockRepo:
            MockRepo.return_value.find_by_id.return_value = pallet
            MockRepo.return_value.find_boxes.return_value = [_box()]
            result = svc.close(PALLET_ID, center_id=CENTER_ID, user_id=USER_ID)
        assert result.status == "CLOSED"

    def test_close_empty_pallet_raises(self):
        from fastapi import HTTPException
        pallet = _pallet(status="OPEN")
        db = _make_db()
        svc = PalletService(db)
        with patch("app.services.pallet_service.PalletRepository") as MockRepo:
            MockRepo.return_value.find_by_id.return_value = pallet
            MockRepo.return_value.find_boxes.return_value = []
            with pytest.raises(HTTPException) as exc_info:
                svc.close(PALLET_ID, center_id=CENTER_ID, user_id=USER_ID)
        assert exc_info.value.status_code == 400

    def test_close_already_closed_raises(self):
        from fastapi import HTTPException
        pallet = _pallet(status="CLOSED")
        db = _make_db()
        svc = PalletService(db)
        with patch("app.services.pallet_service.PalletRepository") as MockRepo:
            MockRepo.return_value.find_by_id.return_value = pallet
            with pytest.raises(HTTPException) as exc_info:
                svc.close(PALLET_ID, center_id=CENTER_ID, user_id=USER_ID)
        assert exc_info.value.status_code == 400

    def test_pallet_not_found_raises_404(self):
        from fastapi import HTTPException
        db = _make_db()
        svc = PalletService(db)
        with patch("app.services.pallet_service.PalletRepository") as MockRepo:
            MockRepo.return_value.find_by_id.return_value = None
            with pytest.raises(HTTPException) as exc_info:
                svc.close(uuid4(), center_id=CENTER_ID, user_id=USER_ID)
        assert exc_info.value.status_code == 404


# ── ShipmentService tests ─────────────────────────────────────────────────────

class TestShipmentAddPallet:

    def test_add_closed_pallet_ok(self):
        shipment = _shipment(status="OPEN")
        pallet = _pallet(status="CLOSED", shipment_id=None)
        db = _make_db()
        svc = ShipmentService(db)
        with (
            patch("app.services.shipment_service.ShipmentRepository") as MockSRepo,
            patch("app.services.shipment_service.PalletRepository") as MockPRepo,
        ):
            MockSRepo.return_value.find_by_id.return_value = shipment
            MockSRepo.return_value.find_pallets.return_value = [pallet]
            MockPRepo.return_value.find_by_id.return_value = pallet
            MockPRepo.return_value.find_boxes_for_pallets.return_value = {pallet.id: []}
            svc.add_pallet(SHIPMENT_ID, PALLET_ID, center_id=CENTER_ID, user_id=USER_ID)
        assert pallet.shipment_id == SHIPMENT_ID

    def test_add_open_pallet_raises(self):
        from fastapi import HTTPException
        shipment = _shipment(status="OPEN")
        pallet = _pallet(status="OPEN", shipment_id=None)
        db = _make_db()
        svc = ShipmentService(db)
        with (
            patch("app.services.shipment_service.ShipmentRepository") as MockSRepo,
            patch("app.services.shipment_service.PalletRepository") as MockPRepo,
        ):
            MockSRepo.return_value.find_by_id.return_value = shipment
            MockPRepo.return_value.find_by_id.return_value = pallet
            with pytest.raises(HTTPException) as exc_info:
                svc.add_pallet(SHIPMENT_ID, PALLET_ID, center_id=CENTER_ID, user_id=USER_ID)
        assert exc_info.value.status_code == 400


class TestShipmentClose:

    def test_close_open_shipment_with_pallets_ok(self):
        shipment = _shipment(status="OPEN")
        db = _make_db()
        svc = ShipmentService(db)
        with patch("app.services.shipment_service.ShipmentRepository") as MockRepo:
            MockRepo.return_value.find_by_id.return_value = shipment
            MockRepo.return_value.find_pallets.return_value = [_pallet()]
            result = svc.close(SHIPMENT_ID, center_id=CENTER_ID, user_id=USER_ID)
        assert result.status == "CLOSED"

    def test_close_empty_shipment_raises(self):
        from fastapi import HTTPException
        shipment = _shipment(status="OPEN")
        db = _make_db()
        svc = ShipmentService(db)
        with patch("app.services.shipment_service.ShipmentRepository") as MockRepo:
            MockRepo.return_value.find_by_id.return_value = shipment
            MockRepo.return_value.find_pallets.return_value = []
            with pytest.raises(HTTPException) as exc_info:
                svc.close(SHIPMENT_ID, center_id=CENTER_ID, user_id=USER_ID)
        assert exc_info.value.status_code == 400


class TestShipmentShip:

    def test_ship_closed_shipment_freezes_all(self):
        shipment = _shipment(status="CLOSED")
        pallet = _pallet(status="CLOSED")
        box = _box(status="SEALED", pallet_id=PALLET_ID)
        db = _make_db()
        svc = ShipmentService(db)
        with (
            patch("app.services.shipment_service.ShipmentRepository") as MockSRepo,
            patch("app.services.shipment_service.PalletRepository") as MockPRepo,
        ):
            MockSRepo.return_value.find_by_id.return_value = shipment
            MockSRepo.return_value.find_pallets.return_value = [pallet]
            MockPRepo.return_value.find_boxes_for_pallets.return_value = {pallet.id: [box]}
            result = svc.ship(SHIPMENT_ID, center_id=CENTER_ID, user_id=USER_ID)
        assert result.status == "SHIPPED"
        assert box.status == "SHIPPED"
        assert pallet.status == "SHIPPED"

    def test_ship_open_shipment_raises(self):
        from fastapi import HTTPException
        shipment = _shipment(status="OPEN")
        db = _make_db()
        svc = ShipmentService(db)
        with patch("app.services.shipment_service.ShipmentRepository") as MockRepo:
            MockRepo.return_value.find_by_id.return_value = shipment
            with pytest.raises(HTTPException) as exc_info:
                svc.ship(SHIPMENT_ID, center_id=CENTER_ID, user_id=USER_ID)
        assert exc_info.value.status_code == 400
