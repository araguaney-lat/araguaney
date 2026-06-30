import io
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import require_coordinator, tenant_scope
from app.models.user import User
from app.repositories.pallet_repository import PalletRepository
from app.repositories.shipment_repository import ShipmentRepository
from app.schemas.shipment import ShipmentCreate, ShipmentDetailOut, ShipmentOut
from app.services.shipment_service import ShipmentService
from app.utils.audit import fire_audit
from app.utils.cloudflare import get_client_ip
from app.utils.manifest import ManifestBoxRow, ManifestData, ManifestPalletSection, generate_manifest_pdf
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/v1/shipments", tags=["shipments"])


@router.get("", response_model=list[ShipmentOut])
@limiter.limit("120/minute")
def list_shipments(
    request: Request,
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    return ShipmentService(db).list(center_id=scope, status=status)


@router.post("", response_model=ShipmentOut, status_code=201)
@limiter.limit("20/minute")
def create_shipment(
    request: Request,
    data: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    return ShipmentService(db).create(center_id=scope, user_id=current_user.id, data=data)


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
    background_tasks: BackgroundTasks,
    shipment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    shipment = ShipmentService(db).close(shipment_id, center_id=scope, user_id=current_user.id)
    fire_audit(background_tasks, "SHIPMENT_CLOSED", "shipment",
               user_id=current_user.id, entity_id=str(shipment_id), ip=get_client_ip(request))
    return shipment


@router.post("/{shipment_id}/ship", response_model=ShipmentOut)
@limiter.limit("5/minute")
def ship_shipment(
    request: Request,
    background_tasks: BackgroundTasks,
    shipment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    shipment = ShipmentService(db).ship(shipment_id, center_id=scope, user_id=current_user.id)
    fire_audit(background_tasks, "SHIPMENT_SHIPPED", "shipment",
               user_id=current_user.id, entity_id=str(shipment_id), ip=get_client_ip(request))
    return shipment


@router.get("/{shipment_id}/manifest.pdf")
@limiter.limit("2/minute")
def download_manifest(
    request: Request,
    shipment_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    """Generate and download the shipment manifest PDF (rate-limited: 2/min)."""
    from app.repositories.product_type_repository import ProductTypeRepository

    shipment = ShipmentRepository(db).find_by_id(shipment_id, scope)
    if not shipment:
        from app.utils.errors import api_error
        raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)

    pallet_repo = PalletRepository(db)
    pt_repo = ProductTypeRepository(db)
    pt_cache: dict = {}

    pallet_sections: list[ManifestPalletSection] = []
    for pallet in ShipmentRepository(db).find_pallets(shipment_id):
        boxes = pallet_repo.find_boxes(pallet.id)
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
        pallet_sections.append(ManifestPalletSection(code=pallet.code, boxes=rows))

    manifest_data = ManifestData(
        shipment_id=str(shipment.id),
        destination=shipment.destination,
        carrier=shipment.carrier,
        reference=shipment.reference,
        status=shipment.status,
        closed_at=shipment.closed_at,
        pallets=pallet_sections,
    )

    pdf_bytes = generate_manifest_pdf(manifest_data)
    ref = shipment.reference or str(shipment_id)[:8]
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="manifiesto-{ref}.pdf"'},
    )
