from uuid import UUID

from app.schemas._base import StrictORMModel


class ExportJobOut(StrictORMModel):
    id: UUID
    kind: str
    status: str
    error: str | None
    download_url: str | None = None
