import io
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_coordinator, tenant_scope
from app.models.user import User
from app.repositories.pallet_repository import PalletRepository
from app.schemas.pallet import PalletCreate, PalletDetailOut, PalletOut, PalletPublicOut
from app.schemas.qr_ficha import QrEventOut
from app.services.pallet_service import PalletService
from app.repositories.audit_repository import AuditRepository
from app.utils.cloudflare import get_client_ip
from app.utils.pdf_pallet_label import PalletLabelData, generate_pallet_label_pdf
from app.utils.qr import pallet_qr_png
from app.utils.rate_limit import limiter

router = APIRouter(tags=["pallets"])

_PUBLIC_CACHE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"


# ── Public endpoints (cacheable) ──────────────────────────────────────────────

@router.get("/p/{code}", response_model=PalletPublicOut)
@limiter.limit("300/minute")
def pallet_public_ficha(
    request: Request,
    code: str,
    db: Session = Depends(get_db),
):
    result = PalletService(db).get_public(code)
    return Response(
        content=result.model_dump_json(),
        media_type="application/json",
        headers={"Cache-Control": _PUBLIC_CACHE},
    )


@router.get("/p/{code}/qr.png")
@limiter.limit("120/minute")
def pallet_qr_image(
    request: Request,
    code: str,
    db: Session = Depends(get_db),
):
    PalletService(db).get_public(code)  # validates existence
    base_url = settings.frontend_url.split(",")[0].strip().rstrip("/")
    png = pallet_qr_png(code, base_url)
    return Response(content=png, media_type="image/png", headers={"Cache-Control": _PUBLIC_CACHE})


# ── Authenticated endpoints ───────────────────────────────────────────────────

@router.get("/v1/pallets", response_model=list[PalletOut])
@limiter.limit("120/minute")
def list_pallets(
    request: Request,
    status: str | None = None,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    return PalletService(db).list(center_id=scope, status=status, limit=limit, offset=offset)


@router.post("/v1/pallets", response_model=PalletOut, status_code=201)
@limiter.limit("30/minute")
def create_pallet(
    request: Request,
    data: PalletCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    return PalletService(db).create(center_id=scope, user_id=current_user.id, data=data)


@router.get("/v1/pallets/{pallet_id}", response_model=PalletDetailOut)
@limiter.limit("120/minute")
def get_pallet(
    request: Request,
    pallet_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    return PalletService(db).get_detail(pallet_id, center_id=scope)


@router.post("/v1/pallets/{pallet_id}/add-box", response_model=PalletDetailOut)
@limiter.limit("120/minute")
def add_box_to_pallet(
    request: Request,
    pallet_id: UUID,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    box_code: str = body.get("code", "")
    if not box_code:
        from app.utils.errors import api_error
        raise api_error("MISSING_CODE", "box code is required", field="code", status_code=422)
    return PalletService(db).add_box(pallet_id, box_code, center_id=scope, user_id=current_user.id)


@router.delete("/v1/pallets/{pallet_id}/boxes/{box_code}", response_model=PalletDetailOut)
@limiter.limit("60/minute")
def remove_box_from_pallet(
    request: Request,
    pallet_id: UUID,
    box_code: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    return PalletService(db).remove_box(pallet_id, box_code, center_id=scope)


@router.post("/v1/pallets/{pallet_id}/close", response_model=PalletOut)
@limiter.limit("30/minute")
def close_pallet(
    request: Request,
    pallet_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    pallet = PalletService(db).close(pallet_id, center_id=scope, user_id=current_user.id)
    AuditRepository(db).log("PALLET_CLOSED", "pallet",
        user_id=current_user.id, entity_id=str(pallet_id), ip=get_client_ip(request))
    db.commit()
    return pallet


@router.get("/v1/pallets/{pallet_id}/label.pdf")
@limiter.limit("10/minute")
def pallet_label_pdf(
    request: Request,
    pallet_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    detail = PalletService(db).get_detail(pallet_id, center_id=scope)
    base_url = settings.frontend_url.split(",")[0].strip().rstrip("/")
    label = PalletLabelData(
        code=detail.code,
        center_name=str(detail.center_id),
        status=detail.status,
        box_codes=[b.code for b in detail.boxes],
        closed_at=detail.closed_at,
        base_url=base_url,
    )
    pdf_bytes = generate_pallet_label_pdf(label)
    filename = f"tarima-{detail.code}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/v1/pallets/{pallet_id}/events", response_model=list[QrEventOut])
@limiter.limit("120/minute")
def list_pallet_events(
    request: Request,
    pallet_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    pallet = PalletService(db).get_detail(pallet_id, center_id=scope)  # validates tenant
    return PalletRepository(db).list_events(pallet.id)
