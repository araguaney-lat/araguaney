from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import (
    require_application_reviewer,
    reviewer_country_scope,
)
from app.models.user import User
from app.schemas.center_application import (
    CenterApplicationConfirm,
    CenterApplicationCreate,
    CenterApplicationOut,
    CenterApplicationReject,
    CenterApplicationSubmitOut,
)
from app.services.center_application_service import CenterApplicationService
from app.utils.rate_limit import limiter

router = APIRouter(tags=["center-applications"])


# ── Public: self-registration ─────────────────────────────────────────────────
# Turnstile is verified at the Next.js proxy (same pattern as /b/{code}); the
# backend adds a strict rate limit. Never cached (public WRITE).

@router.post("/public/center-applications", response_model=CenterApplicationSubmitOut, status_code=201)
@limiter.limit("5/hour")
def submit_application(
    request: Request,
    data: CenterApplicationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    application = CenterApplicationService(db).submit(data, background_tasks)
    return application


@router.post("/public/center-applications/confirm", response_model=CenterApplicationSubmitOut)
@limiter.limit("20/hour")
def confirm_application_email(
    request: Request,
    data: CenterApplicationConfirm,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    application = CenterApplicationService(db).confirm_email(data.token, background_tasks)
    return application


# ── Reviewer: queue + decisions ───────────────────────────────────────────────

@router.get("/center-applications", response_model=list[CenterApplicationOut])
@limiter.limit("120/minute")
def list_queue(
    request: Request,
    db: Session = Depends(get_db),
    reviewer: User = Depends(require_application_reviewer),
):
    scope = reviewer_country_scope(reviewer)
    return CenterApplicationService(db).list_queue(scope)


@router.post("/center-applications/{app_id}/approve", response_model=CenterApplicationOut)
@limiter.limit("60/minute")
def approve_application(
    request: Request,
    app_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    reviewer: User = Depends(require_application_reviewer),
):
    scope = reviewer_country_scope(reviewer)
    return CenterApplicationService(db).approve(app_id, reviewer, scope, background_tasks)


@router.post("/center-applications/{app_id}/reject", response_model=CenterApplicationOut)
@limiter.limit("60/minute")
def reject_application(
    request: Request,
    app_id: UUID,
    data: CenterApplicationReject,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    reviewer: User = Depends(require_application_reviewer),
):
    scope = reviewer_country_scope(reviewer)
    return CenterApplicationService(db).reject(app_id, reviewer, data.reason, scope, background_tasks)
