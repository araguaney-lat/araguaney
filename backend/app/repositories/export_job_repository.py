import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.export_job import ExportJob
from app.repositories.base import BaseRepository

DOWNLOAD_TTL_SECONDS = 60 * 60  # 1 hour — matches r2.DOWNLOAD_URL_TTL
FAILED_JOB_TTL_SECONDS = 24 * 60 * 60  # keep failed jobs longer so the user has time to see the error


class ExportJobRepository(BaseRepository):

    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def create(
        self,
        kind: str,
        params: dict,
        requested_by: uuid.UUID | None,
        center_id: uuid.UUID | None,
    ) -> ExportJob:
        job = ExportJob(
            kind=kind,
            status="PENDING",
            params=params,
            requested_by=requested_by,
            center_id=center_id,
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def find_by_id(self, job_id: uuid.UUID) -> ExportJob | None:
        return self.db.get(ExportJob, job_id)

    def mark_running(self, job_id: uuid.UUID) -> None:
        job = self.db.get(ExportJob, job_id)
        if job:
            job.status = "RUNNING"
            self.db.commit()

    def mark_done(self, job_id: uuid.UUID, r2_key: str) -> None:
        job = self.db.get(ExportJob, job_id)
        if job:
            job.status = "DONE"
            job.r2_key = r2_key
            job.completed_at = datetime.now(timezone.utc)
            job.expires_at = datetime.now(timezone.utc) + timedelta(seconds=DOWNLOAD_TTL_SECONDS)
            self.db.commit()

    def mark_failed(self, job_id: uuid.UUID, error: str) -> None:
        job = self.db.get(ExportJob, job_id)
        if job:
            job.status = "FAILED"
            job.error = error[:2000]
            job.completed_at = datetime.now(timezone.utc)
            job.expires_at = datetime.now(timezone.utc) + timedelta(seconds=FAILED_JOB_TTL_SECONDS)
            self.db.commit()

    def purge_expired(self, cutoff: datetime) -> list[ExportJob]:
        """Returns the expired jobs (caller deletes their R2 objects, then this row)."""
        stmt = select(ExportJob).where(ExportJob.expires_at.is_not(None), ExportJob.expires_at < cutoff)
        return list(self.db.execute(stmt).scalars())

    def delete(self, job_id: uuid.UUID) -> None:
        job = self.db.get(ExportJob, job_id)
        if job:
            self.db.delete(job)
            self.db.commit()
