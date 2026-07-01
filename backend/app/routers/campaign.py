from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_center_role, require_coordinator, require_national_admin
from app.models.user import User
from app.repositories.campaign_repository import CampaignRepository
from app.repositories.user_campaign_repository import UserCampaignRepository
from app.repositories.user_repository import UserRepository
from app.schemas.campaign import CampaignCreate, CampaignMemberAdd, CampaignMemberOut, CampaignOut, CampaignUpdate
from app.services.campaign_service import CampaignService
from app.utils.errors import api_error
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/v1/campaigns", tags=["campaigns"])


@router.get("/mine", response_model=list[CampaignOut])
@limiter.limit("120/minute")
def list_my_campaigns(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
):
    """Campaigns the current user belongs to. Donaciones Generales always first."""
    campaigns = UserCampaignRepository(db).list_campaigns_for_user(current_user.id)
    return sorted(campaigns, key=lambda c: (not c.is_general, c.name))


@router.get("", response_model=list[CampaignOut])
@limiter.limit("120/minute")
def list_campaigns(
    request: Request,
    active_only: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(require_coordinator),
):
    return CampaignService(db).list(active_only=active_only)


@router.get("/{campaign_id}", response_model=CampaignOut)
@limiter.limit("120/minute")
def get_campaign(
    request: Request,
    campaign_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_coordinator),
):
    return CampaignService(db).get(campaign_id)


@router.post("", response_model=CampaignOut, status_code=201)
@limiter.limit("20/hour")
def create_campaign(
    request: Request,
    data: CampaignCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_national_admin),
):
    return CampaignService(db).create(data)


@router.patch("/{campaign_id}", response_model=CampaignOut)
@limiter.limit("30/minute")
def update_campaign(
    request: Request,
    campaign_id: UUID,
    data: CampaignUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_national_admin),
):
    return CampaignService(db).update(campaign_id, data)


# ── Campaign members ───────────────────────────────────────────────────────────

@router.get("/{campaign_id}/members", response_model=list[CampaignMemberOut])
@limiter.limit("60/minute")
def list_members(
    request: Request,
    campaign_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
):
    campaign = CampaignRepository(db).find_by_id(campaign_id)
    if not campaign:
        raise api_error("CAMPAIGN_NOT_FOUND", "Campaign not found", status_code=404)

    members = UserCampaignRepository(db).list_users_for_campaign(campaign_id)

    if current_user.center_role == "national_admin":
        return members
    # Coordinator: only see members from their own center
    return [m for m in members if m.center_id == current_user.center_id]


@router.post("/{campaign_id}/members", status_code=201)
@limiter.limit("30/minute")
def add_member(
    request: Request,
    campaign_id: UUID,
    data: CampaignMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
):
    campaign = CampaignRepository(db).find_by_id(campaign_id)
    if not campaign:
        raise api_error("CAMPAIGN_NOT_FOUND", "Campaign not found", status_code=404)

    target = UserRepository(db).find_by_id(data.user_id)
    if not target:
        raise api_error("USER_NOT_FOUND", "User not found", status_code=404)

    if current_user.center_role == "coordinator":
        if target.center_id != current_user.center_id:
            raise api_error("FORBIDDEN", "You can only assign users from your own center", status_code=403)

    UserCampaignRepository(db).assign(data.user_id, campaign_id, assigned_by_id=current_user.id)
    db.commit()
    return {"ok": True}


@router.delete("/{campaign_id}/members/{user_id}", status_code=204)
@limiter.limit("30/minute")
def remove_member(
    request: Request,
    campaign_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
):
    campaign = CampaignRepository(db).find_by_id(campaign_id)
    if not campaign:
        raise api_error("CAMPAIGN_NOT_FOUND", "Campaign not found", status_code=404)

    if campaign.is_general:
        raise api_error("PROTECTED_CAMPAIGN", "Cannot remove members from the general campaign", status_code=422)

    target = UserRepository(db).find_by_id(user_id)
    if not target:
        raise api_error("USER_NOT_FOUND", "User not found", status_code=404)

    if current_user.center_role == "coordinator":
        if target.center_id != current_user.center_id:
            raise api_error("FORBIDDEN", "You can only remove users from your own center", status_code=403)

    UserCampaignRepository(db).remove(user_id, campaign_id)
    db.commit()
