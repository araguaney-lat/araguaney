from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_center_role
from app.models.user import User
from app.repositories.product_type_repository import ProductTypeRepository
from app.repositories.user_campaign_repository import UserCampaignRepository
from app.schemas.product_type import ProductTypeOut
from app.utils.errors import api_error
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/v1/catalog", tags=["catalog"])


@router.get("/search", response_model=list[ProductTypeOut])
@limiter.limit("120/minute")
def catalog_search(
    request: Request,
    q: str = "",
    campaign_id: UUID | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
):
    """Search local catalog (global products + campaign-scoped products).

    When campaign_id is supplied, validates that the current user belongs to
    that campaign before returning scoped results.
    """
    if campaign_id is not None:
        if not UserCampaignRepository(db).is_member(current_user.id, campaign_id):
            raise api_error("FORBIDDEN", "You are not a member of this campaign", status_code=403)
        campaign_ids: list[UUID] | None = [campaign_id]
    else:
        campaign_ids = None

    results = ProductTypeRepository(db).search(q, category=category, campaign_ids=campaign_ids)
    return results
