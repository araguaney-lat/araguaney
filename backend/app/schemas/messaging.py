from datetime import datetime
from uuid import UUID

from pydantic import field_validator

from app.schemas._base import StrictModel, StrictORMModel
from app.utils.r2 import ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILES_PER_MESSAGE


class UploadUrlRequest(StrictModel):
    filename: str
    content_type: str
    size_bytes: int

    @field_validator("content_type")
    @classmethod
    def validate_content_type(cls, v: str) -> str:
        if v not in ALLOWED_CONTENT_TYPES:
            raise ValueError(f"Tipo de archivo no permitido: {v}")
        return v

    @field_validator("size_bytes")
    @classmethod
    def validate_size(cls, v: int) -> int:
        if v <= 0 or v > MAX_FILE_SIZE_BYTES:
            raise ValueError(f"Tamaño inválido (máx {MAX_FILE_SIZE_BYTES // 1024 // 1024} MB)")
        return v


class UploadUrlOut(StrictModel):
    upload_url: str
    r2_key: str


class ConfirmAttachmentRequest(StrictModel):
    r2_key: str
    filename: str
    content_type: str
    size_bytes: int
    thread_id: UUID | None = None
    reply_id: UUID | None = None


class AttachmentOut(StrictORMModel):
    id: UUID
    filename: str
    content_type: str
    size_bytes: int
    created_at: datetime


class ThreadCreate(StrictModel):
    title: str
    body: str
    thread_type: str
    campaign_id: UUID
    recipient_ids: list[UUID] = []

    @field_validator("thread_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in ("PRIVATE", "PUBLIC"):
            raise ValueError("thread_type debe ser PRIVATE o PUBLIC")
        return v

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El título no puede estar vacío")
        return v[:200]


class ReplyCreate(StrictModel):
    body: str

    @field_validator("body")
    @classmethod
    def validate_body(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El cuerpo no puede estar vacío")
        return v


class ThreadReplyOut(StrictORMModel):
    id: UUID
    thread_id: UUID
    sender_id: UUID | None
    body: str
    created_at: datetime
    attachments: list[AttachmentOut] = []


class ThreadOut(StrictORMModel):
    id: UUID
    title: str
    body: str
    sender_id: UUID | None
    campaign_id: UUID
    thread_type: str
    created_at: datetime
    updated_at: datetime


class ThreadDetailOut(ThreadOut):
    replies: list[ThreadReplyOut] = []
    attachments: list[AttachmentOut] = []
    participant_ids: list[UUID] = []
