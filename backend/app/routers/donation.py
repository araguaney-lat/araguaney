"""Endpoints públicos del pre-registro de donaciones (Fase 18).

Todo lo de aquí es alcanzable sin sesión, así que cada endpoint lleva su límite
de tasa y las respuestas de error son deliberadamente genéricas: un 404 no
distingue entre "no existe", "aún no confirmada" y "cancelada".

Turnstile se valida en el proxy de Next.js, mismo patrón que las solicitudes de
centro y las fichas de caja. El backend añade el límite estricto.

Ninguna de estas rutas invoca IA ni encola trabajo caro: lo único que sale de
aquí son correos, ya acotados por el límite de tasa.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_center_role, resolve_write_center_id, tenant_scope
from app.models.user import User
from app.schemas.donation import (
    DonationCreate,
    DonationItemInput,
    DonationOut,
    DonationPublicOut,
    PublicCenterOut,
)
from app.schemas._base import StrictModel, StrictUUID
from app.services.donation_service import DonationService
from app.utils.rate_limit import limiter

router = APIRouter(tags=["donations"])

# La ficha pública es de solo lectura y cambia poco: se cachea en el edge para
# que un QR compartido no golpee la base en cada escaneo.
_FICHA_CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=600"


class TokenIn(StrictModel):
    token: str


class ItemsIn(StrictModel):
    items: list[DonationItemInput]


# ── Alta y confirmación ──────────────────────────────────────────────────────

@router.post("/public/donations", response_model=DonationOut, status_code=201)
@limiter.limit("5/hour")
def submit_donation(
    request: Request,
    data: DonationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Registra la donación en PENDING_EMAIL y manda el correo de confirmación."""
    return DonationService(db).submit(data, background_tasks)


@router.post("/public/donations/confirm", response_model=DonationOut)
@limiter.limit("20/hour")
def confirm_donation(
    request: Request,
    data: TokenIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Confirma el correo: la donación pasa a REGISTERED y se emite el QR."""
    return DonationService(db).confirm_email(data.token, background_tasks)


# ── Gestión por el donante (enlace firmado, sin sesión) ──────────────────────

@router.get("/public/donations/manage/{token}", response_model=DonationOut)
@limiter.limit("60/hour")
def get_managed_donation(
    request: Request,
    token: str,
    db: Session = Depends(get_db),
):
    return DonationService(db).get_by_manage_token(token)


@router.put("/public/donations/manage/{token}/items", response_model=DonationOut)
@limiter.limit("30/hour")
def update_managed_items(
    request: Request,
    token: str,
    data: ItemsIn,
    db: Session = Depends(get_db),
):
    return DonationService(db).update_items(token, data.items)


@router.post("/public/donations/manage/{token}/cancel", response_model=DonationOut)
@limiter.limit("10/hour")
def cancel_managed_donation(
    request: Request,
    token: str,
    db: Session = Depends(get_db),
):
    return DonationService(db).cancel(token)


# ── Ficha pública del QR ─────────────────────────────────────────────────────

@router.get("/d/{code}", response_model=DonationPublicOut)
@limiter.limit("120/minute")
def public_donation(
    request: Request,
    code: str,
    response: Response,
    db: Session = Depends(get_db),
):
    """Lo que ve quien escanea: estado y contenido, sin un solo dato del donante."""
    donation = DonationService(db).get_public(code)
    response.headers["Cache-Control"] = _FICHA_CACHE
    return donation


@router.get("/d/{code}/qr.png")
@limiter.limit("60/minute")
def public_donation_qr(request: Request, code: str, db: Session = Depends(get_db)):
    from app.config import settings
    from app.utils.qr import donation_qr_png

    # Se valida el código antes de generar: así el endpoint no es un generador
    # gratuito de imágenes para códigos inventados.
    DonationService(db).get_public(code)
    base_url = settings.frontend_url.split(",")[0].strip()
    return Response(
        content=donation_qr_png(code, base_url),
        media_type="image/png",
        headers={"Cache-Control": _FICHA_CACHE},
    )


# ── Catálogos públicos que necesita el formulario ────────────────────────────

@router.get("/public/centers", response_model=list[PublicCenterOut])
@limiter.limit("60/minute")
def public_centers(request: Request, response: Response, db: Session = Depends(get_db)):
    """Centros activos, sin datos de contacto. Cacheable: cambia poco."""
    from app.models.center import Center

    response.headers["Cache-Control"] = _FICHA_CACHE
    return db.execute(
        select(Center).where(Center.is_active.is_(True)).order_by(Center.name)
    ).scalars().all()


# ── Recepción en el centro (autenticado) ─────────────────────────────────────

class ReceiveIn(StrictModel):
    """Solo las excepciones: lo que no viene marcado se da por recibido."""

    results: dict[str, str] = {}
    extras: list[DonationItemInput] = []
    # Solo lo usa national_admin, que no tiene centro propio.
    center_id: StrictUUID | None = None


@router.get("/donations", response_model=list[DonationOut])
@limiter.limit("120/minute")
def list_donations(
    request: Request,
    incoming: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
    scope=Depends(tenant_scope),
):
    """`incoming=true` da las que vienen en camino a mi centro; si no, las recibidas."""
    from app.repositories.donation_repository import DonationRepository

    return DonationRepository(db).list_for_center(scope, incoming=incoming)


@router.get("/donations/{code}", response_model=DonationOut)
@limiter.limit("120/minute")
def get_donation(
    request: Request,
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
):
    """Detalle para el doble check. Cualquier centro puede abrir un código:
    el QR no está atado al centro que el donante eligió."""
    from app.repositories.donation_repository import DonationRepository
    from app.utils.errors import api_error as _err

    donation = DonationRepository(db).find_by_code(code)
    if donation is None or donation.status in ("PENDING_EMAIL", "EXPIRED"):
        raise _err("NOT_FOUND", "Donación no encontrada", status_code=404)
    return donation


@router.post("/donations/{code}/receive", response_model=DonationOut)
@limiter.limit("60/minute")
def receive_donation(
    request: Request,
    code: str,
    data: ReceiveIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
):
    # national_admin no tiene centro propio: debe decir en cuál está recibiendo.
    center_id = resolve_write_center_id(current_user, data.center_id)
    return DonationService(db).receive(
        code, data.results, data.extras, center_id=center_id, user_id=current_user.id
    )
