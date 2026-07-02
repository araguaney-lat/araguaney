from uuid import UUID

from app.models.box import Box
from app.models.events import BoxEvent
from app.models.transfer import Transfer
from app.models.user import User
from app.repositories.box_repository import BoxRepository
from app.repositories.transfer_repository import TransferRepository
from app.schemas.transfer import TransferCreate, TransferDetailOut, TransferEventOut, TransferOut
from app.schemas.box import BoxOut
from app.services.base import BaseService
from app.utils.errors import api_error


def _transfer_out(t: Transfer) -> TransferOut:
    return TransferOut(
        id=t.id,
        from_center_id=t.from_center_id,
        to_center_id=t.to_center_id,
        status=t.status,
        initiated_by=t.initiated_by,
        notes=t.notes,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


class TransferService(BaseService):

    def create(self, data: TransferCreate, current_user: User) -> TransferOut:
        if data.from_center_id == data.to_center_id:
            raise api_error("SAME_CENTER", "Origin and destination must differ", status_code=400)
        if not data.box_ids:
            raise api_error("NO_BOXES", "At least one box is required", status_code=400)

        # Role guard: coordinator can only create if their center is involved
        if current_user.center_role == "coordinator":
            if current_user.center_id not in (data.from_center_id, data.to_center_id):
                raise api_error("FORBIDDEN", "Coordinators can only create transfers involving their center",
                                status_code=403)

        box_repo = BoxRepository(self.db)
        repo = TransferRepository(self.db)

        # Validate every box — batch-fetch first, then check in Python (avoids N+1 queries)
        boxes_by_id = box_repo.find_by_ids(data.box_ids, center_id=None)  # no tenant filter — admin may create cross-center
        active_transfer_box_ids = repo.boxes_in_active_transfer(data.box_ids)
        for box_id in data.box_ids:
            box = boxes_by_id.get(box_id)
            if not box:
                raise api_error("BOX_NOT_FOUND", f"Box {box_id} not found", status_code=404)
            if box.center_id != data.from_center_id:
                raise api_error("BOX_WRONG_CENTER",
                                f"Box {box_id} does not belong to the origin center", status_code=400)
            if box.status != "SEALED":
                raise api_error("BOX_NOT_SEALED", f"Box {box_id} must be SEALED to transfer",
                                status_code=400)
            if box.pallet_id is not None:
                raise api_error("BOX_IN_PALLET", f"Box {box_id} is assigned to a pallet", status_code=400)
            if box_id in active_transfer_box_ids:
                raise api_error("BOX_IN_TRANSFER",
                                f"Box {box_id} is already in an active transfer", status_code=409)

        transfer = repo.save(Transfer(
            from_center_id=data.from_center_id,
            to_center_id=data.to_center_id,
            status="REQUESTED",
            initiated_by=current_user.id,
            notes=data.notes,
        ))
        for box_id in data.box_ids:
            repo.add_item(transfer.id, box_id)
        repo.add_event(transfer.id, None, "REQUESTED", current_user.id)
        repo.commit()
        self.db.refresh(transfer)
        return _transfer_out(transfer)

    def get_detail(self, transfer_id: UUID, current_user: User) -> TransferDetailOut:
        repo = TransferRepository(self.db)
        transfer = repo.find_by_id(transfer_id)
        if not transfer:
            raise api_error("NOT_FOUND", "Transfer not found", status_code=404)
        self._assert_can_view(transfer, current_user)

        boxes = repo.find_boxes(transfer_id)
        events = repo.find_events(transfer_id)
        return TransferDetailOut(
            id=transfer.id,
            from_center_id=transfer.from_center_id,
            to_center_id=transfer.to_center_id,
            status=transfer.status,
            initiated_by=transfer.initiated_by,
            notes=transfer.notes,
            created_at=transfer.created_at,
            updated_at=transfer.updated_at,
            boxes=[BoxOut.model_validate(b) for b in boxes],
            events=[TransferEventOut.model_validate(e) for e in events],
        )

    def list(
        self,
        current_user: User,
        status: str | None = None,
        from_center_id: UUID | None = None,
        to_center_id: UUID | None = None,
        limit: int = 200,
        offset: int = 0,
    ) -> list[TransferOut]:
        center_id = None if current_user.center_role == "national_admin" else current_user.center_id
        transfers = TransferRepository(self.db).list_by_center(
            center_id=center_id,
            status=status,
            from_center_id=from_center_id,
            to_center_id=to_center_id,
            limit=limit,
            offset=offset,
        )
        return [_transfer_out(t) for t in transfers]

    def approve(self, transfer_id: UUID, current_user: User) -> TransferOut:
        return self._transition(transfer_id, "REQUESTED", "APPROVED", current_user,
                                origin_only=True)

    def reject(self, transfer_id: UUID, current_user: User, reason: str | None) -> TransferOut:
        return self._transition(transfer_id, "REQUESTED", "REJECTED", current_user,
                                origin_only=True, note=reason)

    def dispatch(self, transfer_id: UUID, current_user: User) -> TransferOut:
        return self._transition(transfer_id, "APPROVED", "IN_TRANSIT", current_user,
                                origin_only=True)

    def receive(self, transfer_id: UUID, current_user: User) -> TransferOut:
        repo = TransferRepository(self.db)
        transfer = self._load_and_guard(repo, transfer_id, "IN_TRANSIT", current_user,
                                        origin_only=False)
        # Destination coordinator only
        if (current_user.center_role == "coordinator"
                and current_user.center_id != transfer.to_center_id):
            raise api_error("FORBIDDEN", "Only the destination coordinator can receive", status_code=403)

        boxes = repo.find_boxes(transfer_id)
        from_center_id = transfer.from_center_id
        to_center_id = transfer.to_center_id

        for box in boxes:
            box.center_id = to_center_id
            self.db.add(BoxEvent(
                box_id=box.id,
                user_id=current_user.id,
                from_status=box.status,
                to_status=box.status,
                note=f"Transferida desde centro {from_center_id} — transfer {transfer_id}",
            ))

        transfer.status = "RECEIVED"
        repo.add_event(transfer_id, "IN_TRANSIT", "RECEIVED", current_user.id)
        repo.commit()
        self.db.refresh(transfer)
        return _transfer_out(transfer)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _assert_can_view(self, transfer: Transfer, user: User) -> None:
        if user.center_role == "national_admin":
            return
        if user.center_id not in (transfer.from_center_id, transfer.to_center_id):
            raise api_error("FORBIDDEN", "Access denied", status_code=403)

    def _load_and_guard(
        self,
        repo: TransferRepository,
        transfer_id: UUID,
        expected_status: str,
        user: User,
        origin_only: bool,
    ) -> Transfer:
        transfer = repo.find_by_id(transfer_id)
        if not transfer:
            raise api_error("NOT_FOUND", "Transfer not found", status_code=404)
        if transfer.status != expected_status:
            raise api_error("INVALID_TRANSITION",
                            f"Transfer must be in {expected_status} state", status_code=409)
        if user.center_role == "national_admin":
            return transfer
        if origin_only and user.center_id != transfer.from_center_id:
            raise api_error("FORBIDDEN",
                            "Only the origin coordinator can perform this action", status_code=403)
        return transfer

    def _transition(
        self,
        transfer_id: UUID,
        from_status: str,
        to_status: str,
        user: User,
        origin_only: bool,
        note: str | None = None,
    ) -> TransferOut:
        repo = TransferRepository(self.db)
        transfer = self._load_and_guard(repo, transfer_id, from_status, user, origin_only)
        transfer.status = to_status
        repo.add_event(transfer_id, from_status, to_status, user.id, note=note)
        repo.commit()
        self.db.refresh(transfer)
        return _transfer_out(transfer)
