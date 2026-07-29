import secrets
from datetime import datetime, timezone
from uuid import UUID

from app.models.events import PalletEvent
from app.models.pallet import Pallet
from app.repositories.box_repository import BoxRepository
from app.repositories.center_repository import CenterRepository
from app.repositories.pallet_repository import PalletRepository
from app.schemas.box import BoxOut
from app.schemas.pallet import PalletCreate, PalletDetailOut, PalletPublicOut
from app.services.base import BaseService
from app.utils.errors import api_error


def _pallet_code() -> str:
    return f"TM-{secrets.token_urlsafe(6).upper()}"


class PalletService(BaseService):

    def create(self, center_id: UUID | None, user_id: UUID, data: PalletCreate) -> Pallet:
        if center_id is None:
            raise api_error("FORBIDDEN", "Must be assigned to a center to create pallets", status_code=403)
        repo = PalletRepository(self.db)
        pallet = Pallet(code=_pallet_code(), center_id=center_id, notes=data.notes, status="OPEN")
        pallet = repo.save(pallet)
        self.db.add(PalletEvent(pallet_id=pallet.id, user_id=user_id, from_status=None, to_status="OPEN"))
        self.db.commit()
        return pallet

    def add_box(self, pallet_id: UUID, box_code: str, center_id: UUID | None, user_id: UUID) -> PalletDetailOut:
        pallet = PalletRepository(self.db).find_by_id(pallet_id, center_id)
        if not pallet:
            raise api_error("PALLET_NOT_FOUND", "Pallet not found", status_code=404)
        if pallet.status != "OPEN":
            raise api_error("INVALID_STATUS", "Only OPEN pallets accept boxes", status_code=400)

        box_repo = BoxRepository(self.db)
        box = box_repo.find_by_code(box_code)
        if not box:
            raise api_error("BOX_NOT_FOUND", f"Box {box_code} not found", status_code=404)
        if center_id is not None and str(box.center_id) != str(center_id):
            raise api_error("CENTER_MISMATCH", "Box belongs to a different center", status_code=400)
        if box.status != "SEALED":
            raise api_error("BOX_NOT_SEALED", "Only SEALED boxes can be added to a pallet", status_code=400)
        if box.pallet_id is not None:
            raise api_error("BOX_ALREADY_IN_PALLET", f"Box {box_code} is already assigned to a pallet", status_code=400)

        box.pallet_id = pallet_id
        box_repo.commit()
        return self._build_detail(pallet)

    def remove_box(self, pallet_id: UUID, box_code: str, center_id: UUID | None) -> PalletDetailOut:
        pallet = PalletRepository(self.db).find_by_id(pallet_id, center_id)
        if not pallet:
            raise api_error("PALLET_NOT_FOUND", "Pallet not found", status_code=404)
        if pallet.status != "OPEN":
            raise api_error("INVALID_STATUS", "Cannot remove boxes from a non-OPEN pallet", status_code=400)

        box_repo = BoxRepository(self.db)
        box = box_repo.find_by_code(box_code)
        if not box or str(box.pallet_id) != str(pallet_id):
            raise api_error("BOX_NOT_IN_PALLET", f"Box {box_code} is not in this pallet", status_code=400)

        box.pallet_id = None
        box_repo.commit()
        return self._build_detail(pallet)

    def close(self, pallet_id: UUID, center_id: UUID | None, user_id: UUID) -> Pallet:
        repo = PalletRepository(self.db)
        pallet = repo.find_by_id(pallet_id, center_id)
        if not pallet:
            raise api_error("PALLET_NOT_FOUND", "Pallet not found", status_code=404)
        if pallet.status != "OPEN":
            raise api_error(
                "INVALID_TRANSITION",
                f"Pallet is '{pallet.status}'; only OPEN pallets can be closed",
                status_code=400,
            )
        if not repo.find_boxes(pallet_id):
            raise api_error("EMPTY_PALLET", "Cannot close an empty pallet", status_code=400)

        pallet.status = "CLOSED"
        pallet.closed_at = datetime.now(tz=timezone.utc)
        self.db.add(PalletEvent(pallet_id=pallet.id, user_id=user_id, from_status="OPEN", to_status="CLOSED"))
        repo.commit()
        return pallet

    def get_detail(self, pallet_id: UUID, center_id: UUID | None) -> PalletDetailOut:
        pallet = PalletRepository(self.db).find_by_id(pallet_id, center_id)
        if not pallet:
            raise api_error("PALLET_NOT_FOUND", "Pallet not found", status_code=404)
        return self._build_detail(pallet)

    def list(
        self, center_id: UUID | None, status: str | None = None, limit: int = 200, offset: int = 0
    ) -> list[Pallet]:
        return PalletRepository(self.db).list_all(center_id, status=status, limit=limit, offset=offset)

    def get_public(self, code: str) -> PalletPublicOut:
        pallet = PalletRepository(self.db).find_by_code(code)
        if not pallet:
            raise api_error("PALLET_NOT_FOUND", "Pallet not found", status_code=404)
        boxes = PalletRepository(self.db).find_boxes(pallet.id)
        center = CenterRepository(self.db).find_by_id(pallet.center_id) if pallet.center_id else None
        return PalletPublicOut(
            code=pallet.code,
            status=pallet.status,
            center_name=center.name if center else "Araguaney",
            box_count=len(boxes),
            closed_at=pallet.closed_at,
        )

    def _build_detail(self, pallet: Pallet) -> PalletDetailOut:
        boxes = PalletRepository(self.db).find_boxes(pallet.id)
        return PalletDetailOut(
            id=pallet.id,
            code=pallet.code,
            center_id=pallet.center_id,
            shipment_id=pallet.shipment_id,
            status=pallet.status,
            notes=pallet.notes,
            closed_at=pallet.closed_at,
            created_at=pallet.created_at,
            boxes=[BoxOut.model_validate(b) for b in boxes],
        )
