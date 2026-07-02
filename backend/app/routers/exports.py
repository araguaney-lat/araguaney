from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.repositories.export_job_repository import ExportJobRepository
from app.schemas.export_job import ExportJobOut
from app.utils.errors import api_error
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/v1/exports", tags=["exports"])


@router.get("/{job_id}", response_model=ExportJobOut)
@limiter.limit("120/minute")
def get_export_job(
    request: Request,
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Poll an async export job's status. Called every ~1.5s by the frontend while PENDING/RUNNING."""
    job = ExportJobRepository(db).find_by_id(job_id)
    if not job:
        raise api_error("NOT_FOUND", "Export job not found", status_code=404)
    if job.requested_by != current_user.id and current_user.center_role != "national_admin":
        raise api_error("FORBIDDEN", "This export job belongs to another user", status_code=403)

    download_url = None
    if job.status == "DONE" and job.r2_key:
        from app.utils.r2 import generate_download_url
        download_url = generate_download_url(job.r2_key)

    return ExportJobOut(
        id=job.id,
        kind=job.kind,
        status=job.status,
        error=job.error,
        download_url=download_url,
    )
