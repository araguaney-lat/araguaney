from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.risk_review import RiskReview
from app.repositories.base import BaseRepository


class RiskReviewRepository(BaseRepository):
    """Acceso a las revisiones de riesgo. Scoped por centro salvo national_admin."""

    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def find_by_id(self, review_id: UUID) -> RiskReview | None:
        return self.db.get(RiskReview, review_id)

    def list_for_center(self, center_id: UUID | None, limit: int = 200) -> list[RiskReview]:
        """Pendientes primero: son las que piden acción."""
        stmt = select(RiskReview)
        if center_id is not None:
            stmt = stmt.where(RiskReview.center_id == center_id)
        stmt = stmt.order_by(
            (RiskReview.status != "PENDING"),
            RiskReview.created_at.desc(),
        ).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def commit(self) -> None:
        self.db.commit()
