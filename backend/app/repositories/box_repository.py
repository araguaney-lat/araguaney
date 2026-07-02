from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.box import Box
from app.models.events import BoxEvent
from app.repositories.base import TenantRepository


class BoxRepository(TenantRepository[Box]):

    def __init__(self, db: Session) -> None:
        super().__init__(db)
        self.model = Box

    def find_by_id(self, box_id: UUID, center_id: UUID | None) -> Box | None:
        stmt = self.scoped(select(Box).where(Box.id == box_id), center_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def find_by_ids(self, box_ids: list[UUID], center_id: UUID | None) -> dict[UUID, Box]:
        if not box_ids:
            return {}
        stmt = self.scoped(select(Box).where(Box.id.in_(box_ids)), center_id)
        return {box.id: box for box in self.db.execute(stmt).scalars()}

    def find_by_code(self, code: str) -> Box | None:
        """Public lookup — no tenant filter (code is globally unique)."""
        return self.db.execute(
            select(Box).where(Box.code == code)
        ).scalar_one_or_none()

    def list_draft(self, center_id: UUID | None) -> list[Box]:
        stmt = self.scoped(
            select(Box).where(Box.status == "DRAFT").order_by(Box.created_at.desc()),
            center_id,
        )
        return list(self.db.execute(stmt).scalars())

    def list_sealed(self, center_id: UUID | None) -> list[Box]:
        stmt = self.scoped(
            select(Box).where(Box.status == "SEALED").order_by(Box.sealed_at.desc()),
            center_id,
        )
        return list(self.db.execute(stmt).scalars())

    def list_all(
        self, center_id: UUID | None, status: str | None = None, limit: int = 200, offset: int = 0
    ) -> list[Box]:
        # Tiebreak on id: bulk inserts in one transaction share the same created_at
        # (Postgres now() is transaction-scoped), which makes LIMIT/OFFSET non-deterministic
        # across pages without a secondary sort key.
        stmt = select(Box).order_by(Box.created_at.desc(), Box.id)
        if status:
            stmt = stmt.where(Box.status == status)
        stmt = self.scoped(stmt, center_id).limit(limit).offset(offset)
        return list(self.db.execute(stmt).scalars())

    def list_events(self, box_id: UUID) -> list[BoxEvent]:
        return list(self.db.execute(
            select(BoxEvent).where(BoxEvent.box_id == box_id).order_by(BoxEvent.ts)
        ).scalars())

    def save(self, box: Box) -> Box:
        self.db.add(box)
        self.db.commit()
        self.db.refresh(box)
        return box

    def commit(self) -> None:
        self.db.commit()
