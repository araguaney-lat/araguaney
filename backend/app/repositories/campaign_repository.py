from uuid import UUID

from sqlalchemy.orm import Session

from app.models.campaign import Campaign
from app.repositories.base import BaseRepository


class CampaignRepository(BaseRepository[Campaign]):

    def __init__(self, db: Session) -> None:
        super().__init__(db, Campaign)

    def find_all(self, active_only: bool = False) -> list[Campaign]:
        stmt = self._select()
        if active_only:
            stmt = stmt.where(Campaign.is_active.is_(True))
        return self.db.execute(stmt.order_by(Campaign.created_at.desc())).scalars().all()

    def find_by_id(self, campaign_id: UUID) -> Campaign | None:
        return self.db.execute(
            self._select().where(Campaign.id == campaign_id)
        ).scalar_one_or_none()

    def find_general(self) -> Campaign | None:
        from sqlalchemy import select as _select
        return self.db.execute(
            _select(Campaign).where(Campaign.is_general.is_(True))
        ).scalar_one_or_none()

    def find_by_slug(self, slug: str) -> Campaign | None:
        return self.db.execute(
            self._select().where(Campaign.slug == slug)
        ).scalar_one_or_none()

    def slug_exists(self, slug: str) -> bool:
        return self.find_by_slug(slug) is not None

    def find_public_active(self) -> list[Campaign]:
        """Active, non-general campaigns with a slug — safe for public listing (no PII)."""
        stmt = self._select().where(
            Campaign.is_active.is_(True),
            Campaign.is_general.is_(False),
            Campaign.slug.isnot(None),
        )
        return self.db.execute(stmt.order_by(Campaign.created_at.desc())).scalars().all()

    def save(self, campaign: Campaign) -> Campaign:
        self.db.add(campaign)
        self.db.flush()
        self.db.refresh(campaign)
        return campaign

    def commit(self) -> None:
        self.db.commit()
