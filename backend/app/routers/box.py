import io
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_center_role, tenant_scope
from app.models.user import User
from app.repositories.box_repository import BoxRepository
from app.repositories.product_type_repository import ProductTypeRepository
from app.repositories.center_repository import CenterRepository
from app.schemas.box import BoxOut, BoxPublicOut
from app.services.box_service import BoxService
from app.utils.pdf_labels import LabelData, generate_labels_pdf
from app.utils.qr import box_qr_png
from app.utils.rate_limit import limiter

router = APIRouter(tags=["boxes"])

_PUBLIC_CACHE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"


# ── Public endpoints (cacheable) ──────────────────────────────────────────────

@router.get("/b/{code}", response_model=BoxPublicOut)
@limiter.limit("30/minute")
def box_public_ficha(
    request: Request,
    code: str,
    db: Session = Depends(get_db),
):
    """Public box ficha — called via Next.js proxy (Turnstile-gated). No edge cache."""
    result = BoxService(db).get_public(code)
    return Response(
        content=result.model_dump_json(),
        media_type="application/json",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/b/{code}/qr.png")
@limiter.limit("120/minute")
def box_qr_image(
    request: Request,
    code: str,
    db: Session = Depends(get_db),
):
    """Return the QR PNG for a box. Cacheable."""
    BoxService(db).get_public(code)  # validates existence
    base_url = settings.frontend_url.split(",")[0].strip().rstrip("/")
    png = box_qr_png(code, base_url)
    return Response(
        content=png,
        media_type="image/png",
        headers={"Cache-Control": _PUBLIC_CACHE},
    )


# ── Authenticated endpoints ───────────────────────────────────────────────────

@router.get("/v1/boxes", response_model=list[BoxOut])
@limiter.limit("120/minute")
def list_boxes(
    request: Request,
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_center_role),
    scope: UUID | None = Depends(tenant_scope),
):
    return BoxService(db).list(center_id=scope, status=status)


@router.get("/v1/boxes/{box_id}", response_model=BoxOut)
@limiter.limit("120/minute")
def get_box(
    request: Request,
    box_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_center_role),
    scope: UUID | None = Depends(tenant_scope),
):
    return BoxService(db).get(box_id, center_id=scope)


@router.post("/v1/boxes/{box_id}/seal", response_model=BoxOut)
@limiter.limit("60/minute")
def seal_box(
    request: Request,
    box_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
    scope: UUID | None = Depends(tenant_scope),
):
    return BoxService(db).seal(box_id, center_id=scope, user_id=current_user.id)


@router.get("/v1/boxes/{box_id}/qr.png")
@limiter.limit("60/minute")
def box_qr_authenticated(
    request: Request,
    box_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
    scope: UUID | None = Depends(tenant_scope),
):
    """QR PNG accessible with auth (for label preview before seal)."""
    box = BoxService(db).get(box_id, center_id=scope)
    base_url = settings.frontend_url.split(",")[0].strip().rstrip("/")
    png = box_qr_png(box.code, base_url)
    return Response(content=png, media_type="image/png")


@router.get("/v1/boxes/labels/pdf")
@limiter.limit("10/minute")
def download_labels_pdf(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
    scope: UUID | None = Depends(tenant_scope),
    status: str = "DRAFT",
):
    """Generate A4 multi-label PDF for boxes (10 per page). Rate-limited."""
    boxes = BoxRepository(db).list_all(scope, status=status)
    if not boxes:
        from app.utils.errors import api_error
        raise api_error("NO_BOXES", "No boxes found with the given filters", status_code=404)

    pt_cache: dict = {}
    center_name = "Acopio"
    if scope:
        cr = CenterRepository(db)
        center = cr.find_by_id(scope)
        if center:
            center_name = center.name

    base_url = settings.frontend_url.split(",")[0].strip().rstrip("/")

    labels: list[LabelData] = []
    for box in boxes:
        pt_id = box.product_type_id
        if pt_id not in pt_cache:
            pt_cache[pt_id] = ProductTypeRepository(db).find_by_id(pt_id)
        pt = pt_cache[pt_id]
        labels.append(LabelData(
            code=box.code,
            display_name=pt.display_name if pt else "—",
            category=pt.category if pt else "OTHER",
            batch=box.batch,
            expiry_date=box.expiry_date,
            quantity=box.quantity,
            unit=box.unit,
            center_name=center_name,
            base_url=base_url,
        ))

    pdf_bytes = generate_labels_pdf(labels)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="etiquetas-{status.lower()}.pdf"'},
    )
