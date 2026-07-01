from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_coordinator, get_current_user
from app.models.user import User
from app.schemas.transfer import (
    TransferCreate,
    TransferDetailOut,
    TransferOut,
    TransferReject,
)
from app.services.transfer_service import TransferService
from app.utils.audit import fire_audit
from app.utils.cloudflare import get_client_ip
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/v1/transfers", tags=["transfers"])


@router.post("", response_model=TransferOut, status_code=201)
@limiter.limit("20/minute")
def create_transfer(
    request: Request,
    background_tasks: BackgroundTasks,
    data: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
):
    transfer = TransferService(db).create(data, current_user)
    fire_audit(
        background_tasks, "TRANSFER_CREATED", "transfer",
        user_id=current_user.id, entity_id=str(transfer.id), ip=get_client_ip(request),
        extra={
            "from_center_id": str(data.from_center_id),
            "to_center_id": str(data.to_center_id),
            "box_count": len(data.box_ids),
            "initiated_by_role": current_user.center_role,
        },
    )
    return transfer


@router.get("", response_model=list[TransferOut])
@limiter.limit("60/minute")
def list_transfers(
    request: Request,
    status: str | None = Query(None),
    from_center_id: UUID | None = Query(None),
    to_center_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
):
    return TransferService(db).list(
        current_user,
        status=status,
        from_center_id=from_center_id,
        to_center_id=to_center_id,
    )


@router.get("/{transfer_id}", response_model=TransferDetailOut)
@limiter.limit("120/minute")
def get_transfer(
    request: Request,
    transfer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
):
    return TransferService(db).get_detail(transfer_id, current_user)


@router.post("/{transfer_id}/approve", response_model=TransferOut)
@limiter.limit("30/minute")
def approve_transfer(
    request: Request,
    background_tasks: BackgroundTasks,
    transfer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
):
    transfer = TransferService(db).approve(transfer_id, current_user)
    fire_audit(background_tasks, "TRANSFER_APPROVED", "transfer",
               user_id=current_user.id, entity_id=str(transfer_id), ip=get_client_ip(request),
               extra={"approved_by_role": current_user.center_role})
    return transfer


@router.post("/{transfer_id}/reject", response_model=TransferOut)
@limiter.limit("30/minute")
def reject_transfer(
    request: Request,
    background_tasks: BackgroundTasks,
    transfer_id: UUID,
    body: TransferReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
):
    transfer = TransferService(db).reject(transfer_id, current_user, body.reason)
    fire_audit(background_tasks, "TRANSFER_REJECTED", "transfer",
               user_id=current_user.id, entity_id=str(transfer_id), ip=get_client_ip(request),
               extra={"reason": body.reason})
    return transfer


@router.post("/{transfer_id}/dispatch", response_model=TransferOut)
@limiter.limit("30/minute")
def dispatch_transfer(
    request: Request,
    background_tasks: BackgroundTasks,
    transfer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
):
    transfer = TransferService(db).dispatch(transfer_id, current_user)
    fire_audit(background_tasks, "TRANSFER_DISPATCHED", "transfer",
               user_id=current_user.id, entity_id=str(transfer_id), ip=get_client_ip(request))
    return transfer


@router.post("/{transfer_id}/receive", response_model=TransferOut)
@limiter.limit("30/minute")
def receive_transfer(
    request: Request,
    background_tasks: BackgroundTasks,
    transfer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
):
    transfer = TransferService(db).receive(transfer_id, current_user)
    fire_audit(
        background_tasks, "TRANSFER_RECEIVED", "transfer",
        user_id=current_user.id, entity_id=str(transfer_id), ip=get_client_ip(request),
        extra={
            "from_center_id": str(transfer.from_center_id),
            "to_center_id": str(transfer.to_center_id),
        },
    )
    return transfer
