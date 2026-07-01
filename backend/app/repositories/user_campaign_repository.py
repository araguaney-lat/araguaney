from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.campaign import Campaign
from app.models.user import User
from app.models.user_campaign import UserCampaign
from app.repositories.base import BaseRepository


class UserCampaignRepository(BaseRepository):

    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def assign(
        self,
        user_id: UUID,
        campaign_id: UUID,
        assigned_by_id: UUID | None = None,
    ) -> UserCampaign:
        existing = self.db.execute(
            select(UserCampaign).where(
                UserCampaign.user_id == user_id,
                UserCampaign.campaign_id == campaign_id,
            )
        ).scalar_one_or_none()
        if existing:
            return existing
        uc = UserCampaign(
            user_id=user_id,
            campaign_id=campaign_id,
            assigned_by=assigned_by_id,
        )
        self.db.add(uc)
        self.db.flush()
        return uc

    def remove(self, user_id: UUID, campaign_id: UUID) -> None:
        self.db.execute(
            delete(UserCampaign).where(
                UserCampaign.user_id == user_id,
                UserCampaign.campaign_id == campaign_id,
            )
        )
        self.db.flush()

    def list_campaigns_for_user(self, user_id: UUID) -> list[Campaign]:
        rows = self.db.execute(
            select(Campaign)
            .join(UserCampaign, UserCampaign.campaign_id == Campaign.id)
            .where(UserCampaign.user_id == user_id)
            .order_by(Campaign.created_at.desc())
        ).scalars().all()
        return list(rows)

    def list_users_for_campaign(self, campaign_id: UUID) -> list[User]:
        rows = self.db.execute(
            select(User)
            .join(UserCampaign, UserCampaign.user_id == User.id)
            .where(UserCampaign.campaign_id == campaign_id)
            .order_by(User.full_name)
        ).scalars().all()
        return list(rows)

    def get_campaign_ids_for_user(self, user_id: UUID) -> list[UUID]:
        rows = self.db.execute(
            select(UserCampaign.campaign_id).where(UserCampaign.user_id == user_id)
        ).scalars().all()
        return list(rows)

    def is_member(self, user_id: UUID, campaign_id: UUID) -> bool:
        return self.db.execute(
            select(UserCampaign).where(
                UserCampaign.user_id == user_id,
                UserCampaign.campaign_id == campaign_id,
            )
        ).scalar_one_or_none() is not None
