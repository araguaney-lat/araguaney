from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from sqlalchemy.orm import Session

from app.arq_pool import enqueue
from app.database import get_db
from app.dependencies import get_current_user, tenant_scope
from app.models.user import User
from app.repositories.export_job_repository import ExportJobRepository
from app.repositories.report_repository import ReportRepository
from app.schemas.export_job import ExportJobOut
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
    return repo.summary(campaign_id, tenant_scope(current_user), s, e)


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
    return repo.activity(campaign_id, tenant_scope(current_user), s, e)


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
    return repo.by_category(campaign_id, tenant_scope(current_user), s, e)


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
    return repo.by_center(campaign_id, tenant_scope(current_user), s, e)


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
    return repo.countries(campaign_id, tenant_scope(current_user), s, e)


@router.post("/campaign/{campaign_id}/export.csv", response_model=ExportJobOut, status_code=202)
@limiter.limit("10/minute")
def export_csv(
    request: Request,
    campaign_id: UUID,
    background_tasks: BackgroundTasks,
    start: date | None = Query(None),
    end: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Queue the campaign CSV export generation (rate-limited: 10/min). Poll GET /v1/exports/{id}."""
    repo = ReportRepository(db)
    _require_campaign_access(repo, current_user, campaign_id)
    s, e = _resolve_dates(start, end)
    scope = tenant_scope(current_user)

    job = ExportJobRepository(db).create(
        kind="REPORT_EXPORT_CSV",
        params={
            "campaign_id": str(campaign_id),
            "center_id": str(scope) if scope else None,
            "start": s.isoformat(),
            "end": e.isoformat(),
        },
        requested_by=current_user.id,
        center_id=scope,
    )
    enqueue(background_tasks, "generate_report_export_csv_task", str(job.id))
    return ExportJobOut(id=job.id, kind=job.kind, status=job.status, error=None)
