from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.box import Box
from app.models.transfer import Transfer, TransferEvent, TransferItem
from app.models.user import User
from app.repositories.base import BaseRepository


class TransferRepository(BaseRepository):

    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def find_by_id(self, transfer_id: UUID) -> Transfer | None:
        return self.db.get(Transfer, transfer_id)

    def list_by_center(
        self,
        center_id: UUID | None,
        status: str | None = None,
        from_center_id: UUID | None = None,
        to_center_id: UUID | None = None,
        limit: int = 200,
        offset: int = 0,
    ) -> list[Transfer]:
        stmt = select(Transfer)
        if center_id is not None:
            stmt = stmt.where(
                or_(Transfer.from_center_id == center_id, Transfer.to_center_id == center_id)
            )
        if status:
            stmt = stmt.where(Transfer.status == status)
        if from_center_id:
            stmt = stmt.where(Transfer.from_center_id == from_center_id)
        if to_center_id:
            stmt = stmt.where(Transfer.to_center_id == to_center_id)
        # Tiebreak on id — see BoxRepository.list_all for why created_at alone isn't stable.
        stmt = stmt.order_by(Transfer.created_at.desc(), Transfer.id).limit(limit).offset(offset)
        return list(self.db.execute(stmt).scalars())

    def find_boxes(self, transfer_id: UUID) -> list[Box]:
        stmt = (
            select(Box)
            .join(TransferItem, TransferItem.box_id == Box.id)
            .where(TransferItem.transfer_id == transfer_id)
            .order_by(Box.created_at)
        )
        return list(self.db.execute(stmt).scalars())

    def find_events(self, transfer_id: UUID) -> list[TransferEvent]:
        return list(self.db.execute(
            select(TransferEvent)
            .where(TransferEvent.transfer_id == transfer_id)
            .order_by(TransferEvent.ts)
        ).scalars())

    def box_in_active_transfer(self, box_id: UUID) -> bool:
        """True if box is already in a non-terminal transfer."""
        stmt = (
            select(TransferItem.id)
            .join(Transfer, Transfer.id == TransferItem.transfer_id)
            .where(
                TransferItem.box_id == box_id,
                Transfer.status.in_(("REQUESTED", "APPROVED", "IN_TRANSIT")),
            )
            .limit(1)
        )
        return self.db.execute(stmt).scalar_one_or_none() is not None

    def boxes_in_active_transfer(self, box_ids: list[UUID]) -> set[UUID]:
        """Batch version of box_in_active_transfer — returns the subset of box_ids currently in a non-terminal transfer."""
        if not box_ids:
            return set()
        stmt = (
            select(TransferItem.box_id)
            .join(Transfer, Transfer.id == TransferItem.transfer_id)
            .where(
                TransferItem.box_id.in_(box_ids),
                Transfer.status.in_(("REQUESTED", "APPROVED", "IN_TRANSIT")),
            )
        )
        return set(self.db.execute(stmt).scalars())

    def save(self, transfer: Transfer) -> Transfer:
        self.db.add(transfer)
        self.db.flush()
        self.db.refresh(transfer)
        return transfer

    def add_item(self, transfer_id: UUID, box_id: UUID) -> TransferItem:
        item = TransferItem(transfer_id=transfer_id, box_id=box_id)
        self.db.add(item)
        self.db.flush()
        return item

    def add_event(
        self,
        transfer_id: UUID,
        from_status: str | None,
        to_status: str,
        user_id: UUID | None,
        note: str | None = None,
    ) -> TransferEvent:
        event = TransferEvent(
            transfer_id=transfer_id,
            from_status=from_status,
            to_status=to_status,
            user_id=user_id,
            note=note,
        )
        self.db.add(event)
        self.db.flush()
        return event

    def get_coordinator_emails(self, center_id: UUID) -> list[str]:
        stmt = (
            select(User.email)
            .where(
                User.center_id == center_id,
                User.center_role == "coordinator",
                User.is_active.is_(True),
            )
        )
        return list(self.db.execute(stmt).scalars())

    def get_user_email(self, user_id: UUID) -> str | None:
        user = self.db.get(User, user_id)
        return user.email if user else None

    def commit(self) -> None:
        self.db.commit()
