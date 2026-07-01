import io
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.arq_pool import enqueue
from app.database import get_db
from app.dependencies import get_current_superadmin, require_coordinator
from app.models.user import User
from app.repositories.center_repository import CenterRepository
from app.repositories.transfer_repository import TransferRepository
from app.schemas.transfer import (
    TransferCreate,
    TransferDetailOut,
    TransferOut,
    TransferReject,
)
from app.services.transfer_service import TransferService
from app.utils.audit import fire_audit
from app.utils.cloudflare import get_client_ip
from app.utils.manifest import ManifestBoxRow, TransferManifestData, generate_transfer_manifest_pdf
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/v1/transfers", tags=["transfers"])


@router.get("/studio", response_model=list[TransferOut])
@limiter.limit("30/minute")
def list_transfers_studio(
    request: Request,
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
):
    """All transfers across all centers — superadmin only."""
    transfers = TransferRepository(db).list_by_center(center_id=None, status=status)
    from app.services.transfer_service import _transfer_out
    return [_transfer_out(t) for t in transfers]


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
    # Task 14: notify coordinators of both centers (exclude initiator)
    center_repo = CenterRepository(db)
    from_center = center_repo.find_by_id(data.from_center_id)
    to_center = center_repo.find_by_id(data.to_center_id)
    from_name = from_center.name if from_center else str(data.from_center_id)[:8]
    to_name = to_center.name if to_center else str(data.to_center_id)[:8]
    repo = TransferRepository(db)
    notify_emails = (
        set(repo.get_coordinator_emails(data.from_center_id))
        | set(repo.get_coordinator_emails(data.to_center_id))
    ) - {current_user.email}
    for email in notify_emails:
        enqueue(background_tasks, "send_transfer_created_email_task", email, from_name, to_name)
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


@router.get("/{transfer_id}/manifest.pdf")
@limiter.limit("2/minute")
def download_transfer_manifest(
    request: Request,
    transfer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
):
    """Generate and stream the transfer manifest PDF (rate-limited: 2/min)."""
    from app.repositories.product_type_repository import ProductTypeRepository
    from app.utils.errors import api_error

    repo = TransferRepository(db)
    transfer = repo.find_by_id(transfer_id)
    if not transfer:
        raise api_error("NOT_FOUND", "Transfer not found", status_code=404)

    if current_user.center_role != "national_admin":
        if current_user.center_id not in (transfer.from_center_id, transfer.to_center_id):
            raise api_error("FORBIDDEN", "Access denied", status_code=403)

    allowed_statuses = ("APPROVED", "IN_TRANSIT", "RECEIVED")
    if transfer.status not in allowed_statuses:
        raise api_error(
            "INVALID_STATE",
            f"Manifest available from APPROVED onward (current: {transfer.status})",
            status_code=409,
        )

    center_repo = CenterRepository(db)
    from_center = center_repo.find_by_id(transfer.from_center_id)
    to_center = center_repo.find_by_id(transfer.to_center_id)

    pt_repo = ProductTypeRepository(db)
    pt_cache: dict = {}
    boxes = repo.find_boxes(transfer_id)
    rows: list[ManifestBoxRow] = []
    for box in boxes:
        pt_id = box.product_type_id
        if pt_id not in pt_cache:
            pt_cache[pt_id] = pt_repo.find_by_id(pt_id)
        pt = pt_cache[pt_id]
        rows.append(ManifestBoxRow(
            code=box.code,
            display_name=pt.display_name if pt else "—",
            category=pt.category if pt else "OTHER",
            inn_name=pt.inn_name if pt else None,
            strength=pt.strength if pt else None,
            batch=box.batch,
            expiry_date=box.expiry_date,
            quantity=box.quantity,
            unit=box.unit,
            weight_kg=box.weight_kg,
        ))

    manifest_data = TransferManifestData(
        transfer_id=str(transfer.id),
        from_center=from_center.name if from_center else str(transfer.from_center_id)[:8],
        to_center=to_center.name if to_center else str(transfer.to_center_id)[:8],
        status=transfer.status,
        created_at=transfer.created_at,
        boxes=rows,
    )

    pdf_bytes = generate_transfer_manifest_pdf(manifest_data)
    short_id = str(transfer_id)[:8]
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="transferencia-{short_id}.pdf"'},
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
    # Task 15: notify initiator
    _notify_initiator(db, background_tasks, transfer, "APPROVED", current_user.email)
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
    # Task 15: notify initiator
    _notify_initiator(db, background_tasks, transfer, "REJECTED", current_user.email, body.reason)
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
    # Task 16: notify origin coordinators
    center_repo = CenterRepository(db)
    from_c = center_repo.find_by_id(transfer.from_center_id)
    to_c = center_repo.find_by_id(transfer.to_center_id)
    from_name = from_c.name if from_c else str(transfer.from_center_id)[:8]
    to_name = to_c.name if to_c else str(transfer.to_center_id)[:8]
    repo = TransferRepository(db)
    for email in repo.get_coordinator_emails(transfer.from_center_id):
        enqueue(background_tasks, "send_transfer_received_email_task", email, from_name, to_name)
    return transfer


# ── Helpers ───────────────────────────────────────────────────────────────────

def _notify_initiator(
    db,
    background_tasks: BackgroundTasks,
    transfer: TransferOut,
    status: str,
    actor_email: str,
    reason: str | None = None,
) -> None:
    repo = TransferRepository(db)
    initiator_email = repo.get_user_email(transfer.initiated_by)
    if not initiator_email or initiator_email == actor_email:
        return
    center_repo = CenterRepository(db)
    from_c = center_repo.find_by_id(transfer.from_center_id)
    to_c = center_repo.find_by_id(transfer.to_center_id)
    enqueue(
        background_tasks, "send_transfer_status_email_task",
        initiator_email, status,
        from_c.name if from_c else str(transfer.from_center_id)[:8],
        to_c.name if to_c else str(transfer.to_center_id)[:8],
        reason,
    )
