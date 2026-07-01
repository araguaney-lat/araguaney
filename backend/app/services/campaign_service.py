from uuid import UUID

from app.models.campaign import Campaign
from app.repositories.campaign_repository import CampaignRepository
from app.schemas.campaign import CampaignCreate, CampaignUpdate
from app.services.base import BaseService
from app.utils.errors import api_error


class CampaignService(BaseService):

    def list(self, active_only: bool = False) -> list[Campaign]:
        return CampaignRepository(self.db).find_all(active_only=active_only)

    def get(self, campaign_id: UUID) -> Campaign:
        campaign = CampaignRepository(self.db).find_by_id(campaign_id)
        if not campaign:
            raise api_error("CAMPAIGN_NOT_FOUND", "Campaign not found", status_code=404)
        return campaign

    def create(self, data: CampaignCreate) -> Campaign:
        repo = CampaignRepository(self.db)
        campaign = Campaign(
            name=data.name,
            destination_country=data.destination_country,
            description=data.description,
            start_date=data.start_date,
            end_date=data.end_date,
        )
        campaign = repo.save(campaign)
        repo.commit()
        return campaign

    def update(self, campaign_id: UUID, data: CampaignUpdate) -> Campaign:
        repo = CampaignRepository(self.db)
        campaign = repo.find_by_id(campaign_id)
        if not campaign:
            raise api_error("CAMPAIGN_NOT_FOUND", "Campaign not found", status_code=404)
        if campaign.is_general and data.is_active is False:
            raise api_error("PROTECTED_CAMPAIGN", "The general campaign cannot be deactivated", status_code=422)
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(campaign, field, value)
        repo.commit()
        return campaign
