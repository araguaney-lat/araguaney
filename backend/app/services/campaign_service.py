from uuid import UUID

from fastapi import BackgroundTasks

from app.arq_pool import enqueue
from app.models.campaign import Campaign
from app.repositories.campaign_repository import CampaignRepository
from app.repositories.user_campaign_repository import UserCampaignRepository
from app.schemas.campaign import CampaignCreate, CampaignUpdate
from app.services.base import BaseService
from app.utils.errors import api_error
from app.utils.slug import slugify


class CampaignService(BaseService):

    def list(self, active_only: bool = False) -> list[Campaign]:
        return CampaignRepository(self.db).find_all(active_only=active_only)

    def get(self, campaign_id: UUID) -> Campaign:
        campaign = CampaignRepository(self.db).find_by_id(campaign_id)
        if not campaign:
            raise api_error("CAMPAIGN_NOT_FOUND", "Campaign not found", status_code=404)
        return campaign

    def _unique_slug(self, repo: CampaignRepository, name: str) -> str:
        base = slugify(name) or "campana"
        slug = base
        suffix = 1
        while repo.slug_exists(slug):
            suffix += 1
            slug = f"{base}-{suffix}"
        return slug

    def create(
        self, data: CampaignCreate, background_tasks: BackgroundTasks | None = None
    ) -> Campaign:
        repo = CampaignRepository(self.db)
        campaign = Campaign(
            name=data.name,
            slug=self._unique_slug(repo, data.name),
            origin_country=data.origin_country,
            destination_country=data.destination_country,
            description=data.description,
            start_date=data.start_date,
            end_date=data.end_date,
        )
        campaign = repo.save(campaign)
        if data.center_ids:
            UserCampaignRepository(self.db).assign_users_from_centers(data.center_ids, campaign.id)
        repo.commit()
        # Ping IndexNow so the new event page reaches Bing (and thus ChatGPT/Copilot)
        # fast — but only for campaigns that are actually public at /eventos/{slug}
        # (active, non-general), mirroring the public endpoint's own filter.
        if background_tasks is not None and campaign.is_active and not campaign.is_general:
            enqueue(background_tasks, "submit_indexnow_task", f"/eventos/{campaign.slug}")
        return campaign

    def update(self, campaign_id: UUID, data: CampaignUpdate) -> Campaign:
        repo = CampaignRepository(self.db)
        campaign = repo.find_by_id(campaign_id)
        if not campaign:
            raise api_error("CAMPAIGN_NOT_FOUND", "Campaign not found", status_code=404)
        if campaign.is_general and data.is_active is False:
            raise api_error("PROTECTED_CAMPAIGN", "La campaña general no se puede desactivar", status_code=422)
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(campaign, field, value)
        repo.commit()
        return campaign
