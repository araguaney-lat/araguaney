from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_national_admin
from app.models.user import User
from app.schemas.center import CenterCreate, CenterOut, CenterUpdate
from app.services.center_service import CenterService
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/centers", tags=["centers"])


@router.get("", response_model=list[CenterOut])
@limiter.limit("60/minute")
def list_centers(
    request: Request,
    active_only: bool = False,
    country_code: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_national_admin),
):
    # Default to the requesting national_admin's own country (Team page's
    # center selector) when the caller doesn't explicitly filter — falls
    # back to "all countries" for admins with no country_code set yet.
    effective_country = country_code if country_code is not None else current_user.country_code
    return CenterService(db).list_centers(active_only=active_only, country_code=effective_country)


@router.get("/{center_id}", response_model=CenterOut)
@limiter.limit("60/minute")
def get_center(
    request: Request,
    center_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_national_admin),
):
    return CenterService(db).get_center(center_id)


@router.post("", response_model=CenterOut, status_code=201)
@limiter.limit("20/hour")
def create_center(
    request: Request,
    data: CenterCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_national_admin),
):
    return CenterService(db).create_center(data)


@router.patch("/{center_id}", response_model=CenterOut)
@limiter.limit("30/minute")
def update_center(
    request: Request,
    center_id: UUID,
    data: CenterUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_national_admin),
):
    return CenterService(db).update_center(center_id, data)
