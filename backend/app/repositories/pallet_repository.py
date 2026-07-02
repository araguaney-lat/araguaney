from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.box import Box
from app.models.events import PalletEvent
from app.models.pallet import Pallet
from app.repositories.base import TenantRepository


class PalletRepository(TenantRepository[Pallet]):

    def __init__(self, db: Session) -> None:
        super().__init__(db)
        self.model = Pallet

    def find_by_id(self, pallet_id: UUID, center_id: UUID | None) -> Pallet | None:
        stmt = self.scoped(select(Pallet).where(Pallet.id == pallet_id), center_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def find_by_code(self, code: str) -> Pallet | None:
        """Public lookup — pallet codes are globally unique."""
        return self.db.execute(select(Pallet).where(Pallet.code == code)).scalar_one_or_none()

    def list_all(
        self, center_id: UUID | None, status: str | None = None, limit: int = 200, offset: int = 0
    ) -> list[Pallet]:
        # Tiebreak on id — see BoxRepository.list_all for why created_at alone isn't stable.
        stmt = select(Pallet).order_by(Pallet.created_at.desc(), Pallet.id)
        if status:
            stmt = stmt.where(Pallet.status == status)
        stmt = self.scoped(stmt, center_id).limit(limit).offset(offset)
        return list(self.db.execute(stmt).scalars())

    def find_boxes_for_pallets(self, pallet_ids: list[UUID]) -> dict[UUID, list[Box]]:
        if not pallet_ids:
            return {}
        stmt = select(Box).where(Box.pallet_id.in_(pallet_ids)).order_by(Box.created_at)
        boxes_by_pallet: dict[UUID, list[Box]] = {pid: [] for pid in pallet_ids}
        for box in self.db.execute(stmt).scalars():
            boxes_by_pallet[box.pallet_id].append(box)
        return boxes_by_pallet

    def find_boxes(self, pallet_id: UUID) -> list[Box]:
        stmt = select(Box).where(Box.pallet_id == pallet_id).order_by(Box.created_at)
        return list(self.db.execute(stmt).scalars())

    def list_events(self, pallet_id: UUID) -> list[PalletEvent]:
        return list(self.db.execute(
            select(PalletEvent).where(PalletEvent.pallet_id == pallet_id).order_by(PalletEvent.ts)
        ).scalars())

    def save(self, pallet: Pallet) -> Pallet:
        self.db.add(pallet)
        self.db.commit()
        self.db.refresh(pallet)
        return pallet

    def commit(self) -> None:
        self.db.commit()
