from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_national_admin
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.request_repository import RequestRepository, REQUEST_STATUSES
from app.repositories.user_repository import UserRepository
from app.schemas.studio import (
    RequestCreate,
    RequestMessageCreate,
    RequestOut,
    RequestMessageOut,
    RequestStatusPatch,
)
from app.dependencies import tenant_scope
from app.services.ai import needs_matching
from app.utils.cloudflare import get_client_ip
from app.utils.errors import api_error
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/requests", tags=["requests"])


@router.post("", response_model=RequestOut, status_code=201)
@limiter.limit("10/hour")
def create_request(
    request: Request,
    data: RequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = RequestRepository(db).create(
        author_id=current_user.id,
        center_id=current_user.center_id,
        title=data.title,
        description=data.description,
    )
    AuditRepository(db).log(
        "REQUEST_CREATED", "request",
        user_id=current_user.id, entity_id=str(req.id),
        ip=get_client_ip(request),
    )
    db.commit()
    db.refresh(req)
    return req


@router.get("", response_model=list[RequestOut])
@limiter.limit("60/minute")
def list_requests(
    request: Request,
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # national_admin sees all; others see only their center
    center_id = None if current_user.center_role == "national_admin" else current_user.center_id
    return RequestRepository(db).list(center_id=center_id, status=status, limit=limit, offset=offset)


@router.get("/{request_id}", response_model=RequestOut)
@limiter.limit("60/minute")
def get_request(
    request: Request,
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = RequestRepository(db).find_by_id(request_id)
    if not req:
        raise api_error("NOT_FOUND", "Request not found", status_code=404)
    if current_user.center_role != "national_admin" and req.center_id != current_user.center_id:
        raise api_error("FORBIDDEN", "Access denied", status_code=403)
    return req


@router.post("/{request_id}/messages", response_model=RequestMessageOut, status_code=201)
@limiter.limit("30/hour")
def add_message(
    request: Request,
    background_tasks: BackgroundTasks,
    request_id: UUID,
    data: RequestMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repo = RequestRepository(db)
    req = repo.find_by_id(request_id)
    if not req:
        raise api_error("NOT_FOUND", "Request not found", status_code=404)
    if current_user.center_role != "national_admin" and req.center_id != current_user.center_id:
        raise api_error("FORBIDDEN", "Access denied", status_code=403)
    if req.status == "CLOSED":
        raise api_error("CLOSED", "Cannot reply to a closed request")

    msg = repo.add_message(request_id=request_id, author_id=current_user.id, body=data.body)
    db.commit()
    db.refresh(msg)

    # Email notification: admin replies → notify request author; user replies → skip (admin sees inbox)
    if current_user.center_role == "national_admin" and req.author_id:
        author = UserRepository(db).find_by_id(req.author_id)
        if author and author.email:
            site_url = settings.frontend_url.split(",")[0].strip().rstrip("/")
            request_url = f"{site_url}/dashboard/requests"

            def _send_email() -> None:
                from app.email import send_request_reply_email
                send_request_reply_email(
                    to=author.email,
                    request_title=req.title,
                    reply_body=data.body,
                    request_url=request_url,
                )

            background_tasks.add_task(_send_email)

    return msg


@router.get("/{request_id}/matches", response_model=list[dict])
@limiter.limit("30/minute")
def match_request_with_stock(
    request: Request,
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    scope=Depends(tenant_scope),
):
    """Qué categorías pide esta solicitud y qué stock hay de cada una.

    El stock sale de la base y viene acotado por centro: un coordinador no
    descubre por aquí el inventario de otro. Lista vacía si la IA no está.
    """
    solicitud = RequestRepository(db).find_by_id(request_id)
    if solicitud is None:
        raise api_error("NOT_FOUND", "Solicitud no encontrada", status_code=404)

    return needs_matching.match(
        db, f"{solicitud.title}. {solicitud.description}",
        user_id=current_user.id, center_id=scope,
    )


@router.patch("/{request_id}/status", response_model=RequestOut)
@limiter.limit("20/hour")
def update_status(
    request: Request,
    request_id: UUID,
    data: RequestStatusPatch,
    db: Session = Depends(get_db),
    admin: User = Depends(require_national_admin),
):
    if data.status not in REQUEST_STATUSES:
        raise api_error("INVALID_STATUS", f"Status must be one of {REQUEST_STATUSES}", field="status")
    repo = RequestRepository(db)
    req = repo.find_by_id(request_id)
    if not req:
        raise api_error("NOT_FOUND", "Request not found", status_code=404)

    req = repo.update_status(req, data.status)
    AuditRepository(db).log(
        "REQUEST_STATUS_CHANGED", "request",
        user_id=admin.id, entity_id=str(req.id),
        extra={"status": data.status},
        ip=get_client_ip(request),
    )
    db.commit()
    db.refresh(req)
    return req
