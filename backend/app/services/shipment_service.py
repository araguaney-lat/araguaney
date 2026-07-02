from datetime import datetime, timezone
from uuid import UUID

from app.models.events import BoxEvent, PalletEvent, ShipmentEvent
from app.models.shipment import Shipment
from app.repositories.pallet_repository import PalletRepository
from app.repositories.shipment_repository import ShipmentRepository
from app.schemas.box import BoxOut
from app.schemas.pallet import PalletDetailOut
from app.schemas.shipment import ShipmentCreate, ShipmentDetailOut
from app.services.base import BaseService
from app.utils.errors import api_error


class ShipmentService(BaseService):

    def create(self, center_id: UUID | None, user_id: UUID, data: ShipmentCreate) -> Shipment:
        repo = ShipmentRepository(self.db)
        shipment = Shipment(
            center_id=center_id,
            campaign_id=data.campaign_id,
            destination=data.destination,
            carrier=data.carrier,
            reference=data.reference,
            notes=data.notes,
            status="OPEN",
        )
        shipment = repo.save(shipment)
        self.db.add(ShipmentEvent(shipment_id=shipment.id, user_id=user_id, from_status=None, to_status="OPEN"))
        self.db.commit()
        return shipment

    def add_pallet(
        self, shipment_id: UUID, pallet_id: UUID, center_id: UUID | None, user_id: UUID
    ) -> ShipmentDetailOut:
        shipment = ShipmentRepository(self.db).find_by_id(shipment_id, center_id)
        if not shipment:
            raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)
        if shipment.status != "OPEN":
            raise api_error("INVALID_STATUS", "Only OPEN shipments accept pallets", status_code=400)

        pallet = PalletRepository(self.db).find_by_id(pallet_id, center_id)
        if not pallet:
            raise api_error("PALLET_NOT_FOUND", "Pallet not found", status_code=404)
        if pallet.status != "CLOSED":
            raise api_error("PALLET_NOT_CLOSED", "Only CLOSED pallets can be added to a shipment", status_code=400)
        if pallet.shipment_id is not None:
            raise api_error("PALLET_ALREADY_IN_SHIPMENT", "Pallet is already assigned to a shipment", status_code=400)

        pallet.shipment_id = shipment_id
        self.db.commit()
        return self._build_detail(shipment)

    def remove_pallet(self, shipment_id: UUID, pallet_id: UUID, center_id: UUID | None) -> ShipmentDetailOut:
        shipment = ShipmentRepository(self.db).find_by_id(shipment_id, center_id)
        if not shipment:
            raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)
        if shipment.status != "OPEN":
            raise api_error("INVALID_STATUS", "Cannot remove pallets from a non-OPEN shipment", status_code=400)

        pallet = PalletRepository(self.db).find_by_id(pallet_id, center_id)
        if not pallet or str(pallet.shipment_id) != str(shipment_id):
            raise api_error("PALLET_NOT_IN_SHIPMENT", "Pallet is not in this shipment", status_code=400)

        pallet.shipment_id = None
        self.db.commit()
        return self._build_detail(shipment)

    def close(self, shipment_id: UUID, center_id: UUID | None, user_id: UUID) -> Shipment:
        repo = ShipmentRepository(self.db)
        shipment = repo.find_by_id(shipment_id, center_id)
        if not shipment:
            raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)
        if shipment.status != "OPEN":
            raise api_error(
                "INVALID_TRANSITION",
                f"Shipment is '{shipment.status}'; only OPEN shipments can be closed",
                status_code=400,
            )
        if not repo.find_pallets(shipment_id):
            raise api_error("EMPTY_SHIPMENT", "Cannot close a shipment with no pallets", status_code=400)

        shipment.status = "CLOSED"
        shipment.closed_at = datetime.now(tz=timezone.utc)
        self.db.add(ShipmentEvent(shipment_id=shipment.id, user_id=user_id, from_status="OPEN", to_status="CLOSED"))
        repo.commit()
        return shipment

    def ship(self, shipment_id: UUID, center_id: UUID | None, user_id: UUID) -> Shipment:
        """CLOSED → SHIPPED: freeze all pallets and their boxes."""
        repo = ShipmentRepository(self.db)
        shipment = repo.find_by_id(shipment_id, center_id)
        if not shipment:
            raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)
        if shipment.status != "CLOSED":
            raise api_error(
                "INVALID_TRANSITION",
                f"Shipment is '{shipment.status}'; only CLOSED shipments can be shipped",
                status_code=400,
            )

        pallet_repo = PalletRepository(self.db)
        pallets = repo.find_pallets(shipment_id)
        boxes_by_pallet = pallet_repo.find_boxes_for_pallets([p.id for p in pallets])
        for pallet in pallets:
            for box in boxes_by_pallet[pallet.id]:
                box.status = "SHIPPED"
                self.db.add(BoxEvent(box_id=box.id, user_id=user_id, from_status="SEALED", to_status="SHIPPED"))
            pallet.status = "SHIPPED"
            self.db.add(PalletEvent(pallet_id=pallet.id, user_id=user_id, from_status="CLOSED", to_status="SHIPPED"))

        shipment.status = "SHIPPED"
        shipment.shipped_at = datetime.now(tz=timezone.utc)
        self.db.add(ShipmentEvent(shipment_id=shipment.id, user_id=user_id, from_status="CLOSED", to_status="SHIPPED"))
        repo.commit()
        return shipment

    def get_detail(self, shipment_id: UUID, center_id: UUID | None) -> ShipmentDetailOut:
        shipment = ShipmentRepository(self.db).find_by_id(shipment_id, center_id)
        if not shipment:
            raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)
        return self._build_detail(shipment)

    def list(
        self, center_id: UUID | None, status: str | None = None, limit: int = 200, offset: int = 0
    ) -> list[Shipment]:
        return ShipmentRepository(self.db).list_all(center_id, status=status, limit=limit, offset=offset)

    def _build_detail(self, shipment: Shipment) -> ShipmentDetailOut:
        s_repo = ShipmentRepository(self.db)
        p_repo = PalletRepository(self.db)
        pallets = s_repo.find_pallets(shipment.id)
        boxes_by_pallet = p_repo.find_boxes_for_pallets([p.id for p in pallets])
        pallet_details = []
        for pallet in pallets:
            boxes = boxes_by_pallet[pallet.id]
            pallet_details.append(PalletDetailOut(
                id=pallet.id,
                code=pallet.code,
                center_id=pallet.center_id,
                shipment_id=pallet.shipment_id,
                status=pallet.status,
                notes=pallet.notes,
                closed_at=pallet.closed_at,
                created_at=pallet.created_at,
                boxes=[BoxOut.model_validate(b) for b in boxes],
            ))
        return ShipmentDetailOut(
            id=shipment.id,
            center_id=shipment.center_id,
            campaign_id=shipment.campaign_id,
            destination=shipment.destination,
            carrier=shipment.carrier,
            reference=shipment.reference,
            status=shipment.status,
            notes=shipment.notes,
            closed_at=shipment.closed_at,
            shipped_at=shipment.shipped_at,
            created_at=shipment.created_at,
            pallets=pallet_details,
        )
