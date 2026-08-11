"""Endpoints públicos del pre-registro de donaciones (Fase 18).

Todo lo de aquí es alcanzable sin sesión, así que cada endpoint lleva su límite
de tasa y las respuestas de error son deliberadamente genéricas: un 404 no
distingue entre "no existe", "aún no confirmada" y "cancelada".

Turnstile se valida en el proxy de Next.js, mismo patrón que las solicitudes de
centro y las fichas de caja. El backend añade el límite estricto.

Ninguna de estas rutas invoca IA ni encola trabajo caro: lo único que sale de
aquí son correos, ya acotados por el límite de tasa.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response, Query
from pydantic import EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_center_role, resolve_write_center_id, tenant_scope
from app.models.user import User
from app.schemas.donation import (
    _MAX_ITEMS,
    DonationCreate,
    DonationPhotoOut,
    DonationItemInput,
    DonationOut,
    DonationPublicOut,
    PhotoConfirmIn,
    PhotoUploadUrlIn,
    PhotoUploadUrlOut,
    PublicCenterOut,
)
from app.schemas._base import StrictModel, StrictUUID
from app.services.donation_photo_service import DonationPhotoService
from app.schemas.product_type import ProductTypeOut
from app.services.ai import label_ocr, text_mapping
from app.services.donation_service import DonationService
from app.utils.openapi import png_response
from app.utils.rate_limit import limiter

router = APIRouter(tags=["donations"])

# La ficha pública es de solo lectura y cambia poco: se cachea en el edge para
# que un QR compartido no golpee la base en cada escaneo.
_FICHA_CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=600"

# Lo autenticado nunca se cachea. Hoy ningún proxy guardaría una respuesta con
# `Authorization`, pero eso es una convención del proxy, no una instrucción
# nuestra: decirlo explícitamente es lo que impide que un cambio de capa de
# borde deje contenido de un centro en una caché compartida.
_NO_CACHE = "no-store"


class TokenIn(StrictModel):
    token: str


class EmailIn(StrictModel):
    email: EmailStr


class ItemsIn(StrictModel):
    # Mismo tope que el alta: el enlace de gestión es legítimo, pero no es un
    # permiso ilimitado de escritura sobre la base.
    items: list[DonationItemInput] = Field(max_length=_MAX_ITEMS)


# ── Alta y confirmación ──────────────────────────────────────────────────────

@router.post("/public/donations", status_code=202)
@limiter.limit("5/hour")
def submit_donation(
    request: Request,
    data: DonationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Registra la donación en PENDING_EMAIL y manda el correo de confirmación.

    Responde lo mismo si ese correo ya tenía una donación abierta: el código de
    la donación viaja por correo, nunca en esta respuesta, para que probar
    direcciones ajenas no diga nada de quién está donando.
    """
    DonationService(db).submit(data, background_tasks)
    return {"ok": True}


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


@router.post("/public/donations/resend", status_code=202)
@limiter.limit("3/hour")
def resend_donation_confirmation(
    request: Request,
    data: EmailIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Reenvía la confirmación rotando el token.

    Responde 202 siempre, exista o no una donación con ese correo: distinguir
    convertiría al endpoint en un verificador de direcciones.
    """
    DonationService(db).resend(data.email, background_tasks)
    return {"ok": True}


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


# ── Fotos de la donación (enlace de gestión) ─────────────────────────────────

@router.post("/public/donations/manage/{token}/photos/upload-url", response_model=PhotoUploadUrlOut)
@limiter.limit("20/hour")
def photo_upload_url(
    request: Request,
    token: str,
    data: PhotoUploadUrlIn,
    db: Session = Depends(get_db),
):
    """URL firmada para subir directo a R2. La llave la arma el servidor."""
    return DonationPhotoService(db).upload_url(
        token, content_type=data.content_type, size_bytes=data.size_bytes
    )


@router.post("/public/donations/manage/{token}/photos", response_model=DonationPhotoOut, status_code=201)
@limiter.limit("20/hour")
def confirm_photo(
    request: Request,
    token: str,
    data: PhotoConfirmIn,
    db: Session = Depends(get_db),
):
    return DonationPhotoService(db).confirm(
        token, storage_key=data.storage_key,
        content_type=data.content_type, size_bytes=data.size_bytes,
    )


@router.get("/public/donations/manage/{token}/photos/{photo_id}/url")
@limiter.limit("60/hour")
def donor_photo_url(
    request: Request,
    token: str,
    photo_id: StrictUUID,
    response: Response,
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = _NO_CACHE
    return {"url": DonationPhotoService(db).donor_url(token, photo_id)}


@router.delete("/public/donations/manage/{token}/photos/{photo_id}", status_code=204)
@limiter.limit("30/hour")
def delete_photo(
    request: Request,
    token: str,
    photo_id: StrictUUID,
    db: Session = Depends(get_db),
):
    DonationPhotoService(db).delete(token, photo_id)
    return Response(status_code=204)


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


@router.get(
    "/d/{code}/qr.png",
    response_class=Response,
    responses=png_response("QR de la donación pre-registrada."),
)
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

    results: dict[str, str] = Field(default_factory=dict, max_length=_MAX_ITEMS)
    extras: list[DonationItemInput] = Field(default_factory=list, max_length=_MAX_ITEMS)
    # Solo lo usa national_admin, que no tiene centro propio.
    center_id: StrictUUID | None = None


@router.get("/donations", response_model=list[DonationOut])
@limiter.limit("120/minute")
def list_donations(
    request: Request,
    response: Response,
    incoming: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
    scope=Depends(tenant_scope),
):
    """`incoming=true` da las que vienen en camino a mi centro; si no, las recibidas."""
    response.headers["Cache-Control"] = _NO_CACHE
    from app.repositories.donation_repository import DonationRepository

    return DonationRepository(db).list_for_center(scope, incoming=incoming)


@router.get("/donations/{code}", response_model=DonationOut)
@limiter.limit("120/minute")
def get_donation(
    request: Request,
    code: str,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
):
    """Detalle para el doble check. Cualquier centro puede abrir un código:
    el QR no está atado al centro que el donante eligió."""
    response.headers["Cache-Control"] = _NO_CACHE
    from app.repositories.donation_repository import DonationRepository
    from app.utils.errors import api_error as _err

    donation = DonationRepository(db).find_by_code(code)
    if donation is None or donation.status in ("PENDING_EMAIL", "EXPIRED"):
        raise _err("NOT_FOUND", "Donación no encontrada", status_code=404)
    return donation


@router.get("/donations/{code}/photos/{photo_id}/url")
@limiter.limit("120/minute")
def center_photo_url(
    request: Request,
    code: str,
    photo_id: StrictUUID,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
):
    """El centro ve las fotos al preparar el doble check."""
    response.headers["Cache-Control"] = _NO_CACHE
    return {"url": DonationPhotoService(db).center_url(code, photo_id)}


@router.get("/donations/{code}/suggestions", response_model=list[ProductTypeOut])
@limiter.limit("30/minute")
def suggest_catalog_matches(
    request: Request,
    code: str,
    text: str = Query(min_length=1, max_length=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
    scope=Depends(tenant_scope),
):
    """Hasta tres productos sugeridos para un renglón de texto libre del donante.

    Autenticada y con rate limit, como toda la IA de la fase. Devuelve lista
    vacía si la capacidad está apagada, sin presupuesto o el proveedor no
    responde: la captura manual nunca depende de que la IA esté disponible.
    """
    return text_mapping.suggest(
        db, text, user_id=current_user.id, center_id=current_user.center_id
    )


@router.post("/donations/{code}/photos/{photo_id}/read-label", response_model=dict)
@limiter.limit("20/minute")
def read_label(
    request: Request,
    code: str,
    photo_id: StrictUUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
    scope=Depends(tenant_scope),
):
    """Lee la etiqueta de una foto y devuelve los campos que logró leer.

    Los campos llegan como **sugerencia**: quien captura los confirma o los
    corrige antes de que la caja se selle. La caducidad sigue pasando por la
    validación de vida útil, así que una lectura optimista no puede colar una
    caja que debía rechazarse.

    Diccionario vacío si la capacidad está apagada, sin presupuesto o el
    proveedor no responde: se teclea como siempre.
    """
    url = DonationPhotoService(db).center_url(code, photo_id)
    campos = label_ocr.extract(
        db, url, user_id=current_user.id, center_id=current_user.center_id
    )
    # `suggested` es explícito para que ningún cliente confunda esto con datos
    # confirmados: nada llega a SEALED sin que una persona lo haya mirado.
    return {"suggested": campos}


@router.post("/donations/{code}/receive", response_model=DonationOut)
@limiter.limit("60/minute")
def receive_donation(
    request: Request,
    code: str,
    data: ReceiveIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
):
    # national_admin no tiene centro propio: debe decir en cuál está recibiendo.
    center_id = resolve_write_center_id(current_user, data.center_id)
    return DonationService(db).receive(
        code, data.results, data.extras, center_id=center_id, user_id=current_user.id,
        background_tasks=background_tasks,
    )
