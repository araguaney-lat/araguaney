import csv
import io
from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.repositories.report_repository import ReportRepository
from app.schemas.report import (
    ActivityPoint,
    CategoryBreakdown,
    CenterBreakdown,
    CountryPoint,
    ReportSummary,
)
from app.utils.errors import api_error
from app.utils.cloudflare import get_client_ip
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/v1/reports", tags=["reports"])

_DEFAULT_DAYS = 30
_MAX_RANGE_DAYS = 366


def _resolve_dates(start: date | None, end: date | None) -> tuple[date, date]:
    today = date.today()
    end = end or today
    start = start or (today - timedelta(days=_DEFAULT_DAYS - 1))
    if start > end:
        start = end
    if (end - start).days > _MAX_RANGE_DAYS:
        start = end - timedelta(days=_MAX_RANGE_DAYS)
    return start, end


def _require_campaign_access(repo: ReportRepository, user: User, campaign_id: UUID) -> None:
    if user.center_role == "national_admin":
        return
    if not repo.is_campaign_member(user.id, campaign_id):
        raise api_error("FORBIDDEN", "No tienes acceso a esta campaña", status_code=403)


def _center_scope(user: User) -> UUID | None:
    return None if user.center_role == "national_admin" else user.center_id


@router.get("/campaign/{campaign_id}/summary", response_model=ReportSummary)
@limiter.limit("60/minute")
def get_summary(
    request: Request,
    campaign_id: UUID,
    start: date | None = Query(None),
    end: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = ReportRepository(db)
    _require_campaign_access(repo, current_user, campaign_id)
    s, e = _resolve_dates(start, end)
    return repo.summary(campaign_id, _center_scope(current_user), s, e)


@router.get("/campaign/{campaign_id}/activity", response_model=list[ActivityPoint])
@limiter.limit("60/minute")
def get_activity(
    request: Request,
    campaign_id: UUID,
    start: date | None = Query(None),
    end: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = ReportRepository(db)
    _require_campaign_access(repo, current_user, campaign_id)
    s, e = _resolve_dates(start, end)
    return repo.activity(campaign_id, _center_scope(current_user), s, e)


@router.get("/campaign/{campaign_id}/by-category", response_model=list[CategoryBreakdown])
@limiter.limit("60/minute")
def get_by_category(
    request: Request,
    campaign_id: UUID,
    start: date | None = Query(None),
    end: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = ReportRepository(db)
    _require_campaign_access(repo, current_user, campaign_id)
    s, e = _resolve_dates(start, end)
    return repo.by_category(campaign_id, _center_scope(current_user), s, e)


@router.get("/campaign/{campaign_id}/by-center", response_model=list[CenterBreakdown])
@limiter.limit("60/minute")
def get_by_center(
    request: Request,
    campaign_id: UUID,
    start: date | None = Query(None),
    end: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = ReportRepository(db)
    _require_campaign_access(repo, current_user, campaign_id)
    s, e = _resolve_dates(start, end)
    return repo.by_center(campaign_id, _center_scope(current_user), s, e)


@router.get("/campaign/{campaign_id}/countries", response_model=list[CountryPoint])
@limiter.limit("60/minute")
def get_countries(
    request: Request,
    campaign_id: UUID,
    start: date | None = Query(None),
    end: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = ReportRepository(db)
    _require_campaign_access(repo, current_user, campaign_id)
    s, e = _resolve_dates(start, end)
    return repo.countries(campaign_id, _center_scope(current_user), s, e)


@router.get("/campaign/{campaign_id}/export.csv")
@limiter.limit("10/minute")
def export_csv(
    request: Request,
    campaign_id: UUID,
    start: date | None = Query(None),
    end: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = ReportRepository(db)
    _require_campaign_access(repo, current_user, campaign_id)
    s, e = _resolve_dates(start, end)
    rows = repo.export_rows(campaign_id, _center_scope(current_user), s, e)

    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    else:
        output.write("No data for the selected period.\n")

    filename = f"reporte_{campaign_id}_{s}_{e}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
