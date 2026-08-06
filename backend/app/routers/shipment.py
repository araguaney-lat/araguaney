from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from sqlalchemy.orm import Session

from app.arq_pool import enqueue
from app.database import get_db
from app.dependencies import (
    require_coordinator,
    require_national_admin,
    resolve_write_center_id,
    tenant_scope,
)
from app.models.user import User
from app.repositories.export_job_repository import ExportJobRepository
from app.repositories.shipment_repository import ShipmentRepository
from app.schemas.export_job import ExportJobOut
from app.schemas.shipment import (
    DeliveredIn,
    MilestoneIn,
    ShipmentCreate,
    ShipmentDetailOut,
    ShipmentOut,
)
from app.services.shipment_service import ShipmentService
from app.repositories.audit_repository import AuditRepository
from app.utils.cloudflare import get_client_ip
from app.schemas.qr_ficha import QrEventOut
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/v1/shipments", tags=["shipments"])


@router.get("", response_model=list[ShipmentOut])
@limiter.limit("120/minute")
def list_shipments(
    request: Request,
    status: str | None = None,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    return ShipmentService(db).list(center_id=scope, status=status, limit=limit, offset=offset)


@router.post("", response_model=ShipmentOut, status_code=201)
@limiter.limit("20/minute")
def create_shipment(
    request: Request,
    data: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    center_id = resolve_write_center_id(current_user, data.center_id)
    return ShipmentService(db).create(center_id=center_id, user_id=current_user.id, data=data)


@router.get("/{shipment_id}", response_model=ShipmentDetailOut)
@limiter.limit("120/minute")
def get_shipment(
    request: Request,
    shipment_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    return ShipmentService(db).get_detail(shipment_id, center_id=scope)


@router.post("/{shipment_id}/add-pallet", response_model=ShipmentDetailOut)
@limiter.limit("60/minute")
def add_pallet_to_shipment(
    request: Request,
    shipment_id: UUID,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    pallet_id_raw = body.get("pallet_id")
    if not pallet_id_raw:
        from app.utils.errors import api_error
        raise api_error("MISSING_PALLET_ID", "pallet_id is required", field="pallet_id", status_code=422)
    return ShipmentService(db).add_pallet(
        shipment_id, UUID(str(pallet_id_raw)), center_id=scope, user_id=current_user.id
    )


@router.delete("/{shipment_id}/pallets/{pallet_id}", response_model=ShipmentDetailOut)
@limiter.limit("30/minute")
def remove_pallet_from_shipment(
    request: Request,
    shipment_id: UUID,
    pallet_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    return ShipmentService(db).remove_pallet(shipment_id, pallet_id, center_id=scope)


@router.post("/{shipment_id}/close", response_model=ShipmentOut)
@limiter.limit("10/minute")
def close_shipment(
    request: Request,
    shipment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    shipment = ShipmentService(db).close(shipment_id, center_id=scope, user_id=current_user.id)
    AuditRepository(db).log("SHIPMENT_CLOSED", "shipment",
        user_id=current_user.id, entity_id=str(shipment_id), ip=get_client_ip(request))
    db.commit()
    return shipment


@router.post("/{shipment_id}/ship", response_model=ShipmentOut)
@limiter.limit("5/minute")
def ship_shipment(
    request: Request,
    shipment_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    shipment = ShipmentService(db).ship(
        shipment_id, center_id=scope, user_id=current_user.id,
        background_tasks=background_tasks,
    )
    AuditRepository(db).log("SHIPMENT_SHIPPED", "shipment",
        user_id=current_user.id, entity_id=str(shipment_id), ip=get_client_ip(request))
    db.commit()
    return shipment


# ── Después de despachar (Fase 22) ────────────────────────────────────────────
#
# Hitos y llegada los registra `national_admin` con el reporte del consignatario:
# quien recibe en destino no tiene cuenta en el sistema, y crear una superficie
# de autenticación para una zona de desastre sería resolver el problema
# equivocado. El coordinador del centro emisor los ve en el timeline.

@router.post("/{shipment_id}/milestones", response_model=ShipmentOut)
@limiter.limit("30/minute")
def add_milestone(
    request: Request,
    shipment_id: UUID,
    data: MilestoneIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_national_admin),
    scope: UUID | None = Depends(tenant_scope),
):
    shipment = ShipmentService(db).add_milestone(
        shipment_id, center_id=scope, user_id=current_user.id,
        milestone=data.milestone, note=data.note, occurred_at=data.occurred_at,
    )
    AuditRepository(db).log("SHIPMENT_MILESTONE", "shipment",
        user_id=current_user.id, entity_id=str(shipment_id), ip=get_client_ip(request))
    db.commit()
    return shipment


@router.post("/{shipment_id}/delivered", response_model=ShipmentOut)
@limiter.limit("10/minute")
def mark_delivered(
    request: Request,
    shipment_id: UUID,
    data: DeliveredIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_national_admin),
    scope: UUID | None = Depends(tenant_scope),
):
    shipment = ShipmentService(db).mark_delivered(
        shipment_id, center_id=scope, user_id=current_user.id,
        note=data.note, delivered_at=data.delivered_at,
    )
    AuditRepository(db).log("SHIPMENT_DELIVERED", "shipment",
        user_id=current_user.id, entity_id=str(shipment_id), ip=get_client_ip(request))
    db.commit()
    return shipment


@router.post("/{shipment_id}/manifest.pdf", response_model=ExportJobOut, status_code=202)
@limiter.limit("2/minute")
def download_manifest(
    request: Request,
    shipment_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    """Queue shipment manifest PDF generation (rate-limited: 2/min). Poll GET /v1/exports/{id}."""
    from app.utils.errors import api_error

    shipment = ShipmentRepository(db).find_by_id(shipment_id, scope)
    if not shipment:
        raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)

    job = ExportJobRepository(db).create(
        kind="SHIPMENT_MANIFEST_PDF",
        params={"shipment_id": str(shipment_id)},
        requested_by=current_user.id,
        center_id=scope,
    )
    enqueue(background_tasks, "generate_shipment_manifest_pdf_task", str(job.id))
    return ExportJobOut(id=job.id, kind=job.kind, status=job.status, error=None)


@router.post("/{shipment_id}/declaracion.xlsx", response_model=ExportJobOut, status_code=202)
@limiter.limit("2/minute")
def download_declaration_xlsx(
    request: Request,
    shipment_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    """Declaración de mercancías del envío, en hoja de cálculo.

    Lleva lo que sabemos —qué va, cuánto pesa, cuántos bultos, de dónde a
    dónde— y los datos que el propio centro capturó sobre sí mismo. No es un
    comprobante fiscal ni una declaración aduanal: es el insumo para quien
    despacha. Si el envío declara un perfil de país, además trae los nombres de
    campo de ese régimen.
    """
    return _queue_declaration(
        request, shipment_id, background_tasks, db, current_user, scope,
        kind="SHIPMENT_DECLARATION_XLSX", task="generate_shipment_declaration_xlsx_task",
    )


@router.post("/{shipment_id}/declaracion.json", response_model=ExportJobOut, status_code=202)
@limiter.limit("2/minute")
def download_declaration_json(
    request: Request,
    shipment_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    """El mismo documento en JSON, para quien lo integra con otro sistema."""
    return _queue_declaration(
        request, shipment_id, background_tasks, db, current_user, scope,
        kind="SHIPMENT_DECLARATION_JSON", task="generate_shipment_declaration_json_task",
    )


def _queue_declaration(request, shipment_id, background_tasks, db, current_user, scope,
                       *, kind: str, task: str):
    from app.utils.errors import api_error

    if not ShipmentRepository(db).find_by_id(shipment_id, scope):
        raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)

    job = ExportJobRepository(db).create(
        kind=kind,
        params={"shipment_id": str(shipment_id)},
        requested_by=current_user.id,
        center_id=scope,
    )
    enqueue(background_tasks, task, str(job.id))
    return ExportJobOut(id=job.id, kind=job.kind, status=job.status, error=None)


@router.post("/{shipment_id}/manifest.xlsx", response_model=ExportJobOut, status_code=202)
@limiter.limit("2/minute")
def download_manifest_xlsx(
    request: Request,
    shipment_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    """Queue the IFRC packing list (.xlsx) generation (rate-limited: 2/min). Poll GET /v1/exports/{id}."""
    from app.utils.errors import api_error

    shipment = ShipmentRepository(db).find_by_id(shipment_id, scope)
    if not shipment:
        raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)

    job = ExportJobRepository(db).create(
        kind="SHIPMENT_MANIFEST_XLSX",
        params={"shipment_id": str(shipment_id)},
        requested_by=current_user.id,
        center_id=scope,
    )
    enqueue(background_tasks, "generate_shipment_manifest_xlsx_task", str(job.id))
    return ExportJobOut(id=job.id, kind=job.kind, status=job.status, error=None)


@router.get("/{shipment_id}/events", response_model=list[QrEventOut])
@limiter.limit("120/minute")
def list_shipment_events(
    request: Request,
    shipment_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    shipment = ShipmentRepository(db).find_by_id(shipment_id, scope)
    if not shipment:
        from app.utils.errors import api_error
        raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)
    return ShipmentRepository(db).list_events(shipment_id)
