from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.arq_pool import enqueue
from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_center_role, tenant_scope
from app.models.user import User
from app.repositories.box_repository import BoxRepository
from app.repositories.export_job_repository import ExportJobRepository
from app.schemas.box import BoxOut, BoxPublicOut
from app.schemas.export_job import ExportJobOut
from app.schemas.qr_ficha import QrEventOut
from app.schemas.box import BoxCodeBlockOut, BoxCodeReserveIn
from app.services import box_code_service
from app.services.box_service import BoxService
from app.repositories.audit_repository import AuditRepository
from app.utils.cloudflare import get_client_ip
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
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_center_role),
    scope: UUID | None = Depends(tenant_scope),
):
    return BoxService(db).list(center_id=scope, status=status, limit=limit, offset=offset)


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
    box = BoxService(db).seal(box_id, center_id=scope, user_id=current_user.id)
    AuditRepository(db).log("BOX_SEALED", "box",
        user_id=current_user.id, entity_id=str(box_id), ip=get_client_ip(request))
    db.commit()
    return box


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


# ── Códigos pre-asignados para captura sin conexión (Fase 25) ────────────────

@router.post("/v1/boxes/codes/reserve", response_model=BoxCodeBlockOut, status_code=201)
@limiter.limit("10/hour")
def reserve_box_codes(
    request: Request,
    data: BoxCodeReserveIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
):
    """Aparta un bloque de códigos para capturar sin conexión.

    Se pide **con** señal, para consumirlo sin ella. El límite por hora es
    holgado para reponer antes de una jornada y estrecho para que un cliente en
    bucle no aparte miles de números.
    """
    center_id = resolve_write_center_id(current_user, data.center_id)
    codigos = box_code_service.reserve(db, center_id, current_user.id, data.count)
    AuditRepository(db).log("BOX_CODES_RESERVED", "box",
        user_id=current_user.id, entity_id=str(center_id), ip=get_client_ip(request))
    db.commit()
    return BoxCodeBlockOut(codes=codigos, available=box_code_service.available(db, center_id))


@router.get("/v1/boxes/codes/available", response_model=BoxCodeBlockOut)
@limiter.limit("60/minute")
def available_box_codes(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
    scope: UUID | None = Depends(tenant_scope),
):
    """Cuántos códigos sin usar quedan. El cliente lo consulta para reponer."""
    center_id = scope or current_user.center_id
    if center_id is None:
        # Un national_admin no captura: no tiene centro cuyo bloque contar.
        return BoxCodeBlockOut(codes=[], available=0)
    return BoxCodeBlockOut(codes=[], available=box_code_service.available(db, center_id))


@router.post("/v1/boxes/labels/pdf", response_model=ExportJobOut, status_code=202)
@limiter.limit("10/minute")
def download_labels_pdf(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
    scope: UUID | None = Depends(tenant_scope),
    status: str = "DRAFT",
):
    """Queue A4 multi-label PDF generation for boxes (10 per page, rate-limited). Poll GET /v1/exports/{id}."""
    if not BoxRepository(db).list_all(scope, status=status, limit=1):
        from app.utils.errors import api_error
        raise api_error("NO_BOXES", "No boxes found with the given filters", status_code=404)

    job = ExportJobRepository(db).create(
        kind="BOX_LABELS_PDF",
        params={"center_id": str(scope) if scope else None, "status": status},
        requested_by=current_user.id,
        center_id=scope,
    )
    enqueue(background_tasks, "generate_box_labels_pdf_task", str(job.id))
    return ExportJobOut(id=job.id, kind=job.kind, status=job.status, error=None)


@router.get("/v1/boxes/{box_id}/events", response_model=list[QrEventOut])
@limiter.limit("120/minute")
def list_box_events(
    request: Request,
    box_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_center_role),
    scope: UUID | None = Depends(tenant_scope),
):
    box = BoxService(db).get(box_id, center_id=scope)  # validates tenant
    return BoxRepository(db).list_events(box.id)
