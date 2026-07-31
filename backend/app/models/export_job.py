import uuid
from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func
from app.database import Base

EXPORT_JOB_KINDS = (
    "SHIPMENT_MANIFEST_PDF",
    "SHIPMENT_MANIFEST_XLSX",
    "BOX_LABELS_PDF",
    "PALLET_LABEL_PDF",
    "TRANSFER_MANIFEST_PDF",
    "REPORT_EXPORT_CSV",
    "SHIPMENT_DECLARATION_XLSX",
    "SHIPMENT_DECLARATION_JSON",
)
EXPORT_JOB_STATUSES = ("PENDING", "RUNNING", "DONE", "FAILED")


class ExportJob(Base):
    """Tracks an async PDF/XLSX/CSV generation job (Fase 12 tarea 15c).

    The ARQ worker runs in a separate process with no direct channel back to
    the original HTTP response, so generated files are uploaded to R2 and the
    client polls this row's status instead of streaming the file inline.
    """

    __tablename__ = "export_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kind = Column(String, nullable=False)
    status = Column(String, nullable=False, server_default="PENDING")
    params = Column(JSONB, nullable=False)
    r2_key = Column(String, nullable=True)
    error = Column(String, nullable=True)
    requested_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    center_id = Column(UUID(as_uuid=True), ForeignKey("centers.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
