from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_superadmin
from app.models.user import User
from app.repositories.email_failure_repository import EmailFailureRepository
from app.schemas.email_failure import EmailFailureOut
from app.services.email_failure_service import EmailFailureService
from app.utils.rate_limit import limiter

# Platform-wide email deliverability — superadmin only (Studio).
router = APIRouter(tags=["email-failures"])


@router.get("/email-failures", response_model=list[EmailFailureOut])
@limiter.limit("120/minute")
def list_failures(
    request: Request,
    event_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superadmin),
) -> list[EmailFailureOut]:
    return EmailFailureRepository(db).list_recent(limit=200, event_type=event_type)


@router.post("/email-failures/{failure_id}/resend", response_model=EmailFailureOut)
@limiter.limit("30/minute")
def resend_failure(
    request: Request,
    failure_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superadmin),
) -> EmailFailureOut:
    return EmailFailureService(db).resend(failure_id, background_tasks)
