from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.messaging import (
    AttachmentOut,
    ConfirmAttachmentRequest,
    ReplyCreate,
    ThreadCreate,
    ThreadDetailOut,
    ThreadOut,
    ThreadReplyOut,
    UploadUrlOut,
    UploadUrlRequest,
)
from app.repositories.thread_repository import ThreadRepository
from app.services.thread_service import ThreadService
from app.utils.audit import fire_audit
from app.utils.cloudflare import get_client_ip
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/v1/messages", tags=["messages"])


@router.post("/attachments/upload-url", response_model=UploadUrlOut)
@limiter.limit("30/minute")
def get_upload_url(
    request: Request,
    data: UploadUrlRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ThreadService(db).get_upload_url(data, current_user)


@router.post("/attachments/confirm", response_model=AttachmentOut, status_code=201)
@limiter.limit("30/minute")
def confirm_attachment(
    request: Request,
    data: ConfirmAttachmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ThreadService(db).confirm_attachment(data, current_user)


@router.get("/attachments/{attachment_id}/url")
@limiter.limit("60/minute")
def get_download_url(
    request: Request,
    attachment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    url = ThreadService(db).get_download_url(attachment_id, current_user)
    return {"url": url}


@router.post("", response_model=ThreadOut, status_code=201)
@limiter.limit("20/minute")
def create_thread(
    request: Request,
    background_tasks: BackgroundTasks,
    data: ThreadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread = ThreadService(db).create(data, current_user, background_tasks)
    fire_audit(
        background_tasks, "MESSAGE_CREATED", "thread",
        user_id=current_user.id, entity_id=str(thread.id), ip=get_client_ip(request),
        extra={
            "thread_type": data.thread_type,
            "campaign_id": str(data.campaign_id),
            "recipient_count": len(data.recipient_ids),
        },
    )
    return thread


@router.get("", response_model=list[ThreadOut])
@limiter.limit("60/minute")
def list_threads(
    request: Request,
    thread_type: str | None = Query(None),
    campaign_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ThreadService(db).list(current_user, thread_type, campaign_id)


@router.get("/unread-count")
@limiter.limit("60/minute")
def get_unread_count(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = ThreadRepository(db).count_unread_private(current_user.id)
    return {"unread": count}


@router.get("/{thread_id}", response_model=ThreadDetailOut)
@limiter.limit("60/minute")
def get_thread(
    request: Request,
    thread_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ThreadService(db).get_detail(thread_id, current_user)


@router.post("/{thread_id}/replies", response_model=ThreadReplyOut, status_code=201)
@limiter.limit("30/minute")
def add_reply(
    request: Request,
    background_tasks: BackgroundTasks,
    thread_id: UUID,
    data: ReplyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    reply = ThreadService(db).add_reply(thread_id, data, current_user, background_tasks)
    fire_audit(
        background_tasks, "MESSAGE_REPLIED", "thread_reply",
        user_id=current_user.id, entity_id=str(reply.id), ip=get_client_ip(request),
        extra={"thread_id": str(thread_id), "has_attachments": False},
    )
    return reply


@router.patch("/{thread_id}/read", status_code=204)
@limiter.limit("120/minute")
def mark_read(
    request: Request,
    thread_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ThreadService(db).mark_read(thread_id, current_user)
