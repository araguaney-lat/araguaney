from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Query, Request, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_center_role, resolve_write_center_id, tenant_scope
from app.models.user import User
from app.repositories.donor_repository import DonorRepository
from app.schemas.donor import DonorOut
from app.schemas.intake import IntakeCreate, IntakeOut
from app.services.ai import label_ocr
from app.services.intake_service import IntakeService
from app.utils.audit import fire_audit
from app.utils.cloudflare import get_client_ip
from app.utils.errors import api_error
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/intakes", tags=["intakes"])


@router.post("", response_model=IntakeOut, status_code=201)
@limiter.limit("60/minute")
def create_intake(
    request: Request,
    background_tasks: BackgroundTasks,
    data: IntakeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
    scope: UUID | None = Depends(tenant_scope),
):
    center_id = resolve_write_center_id(current_user, data.center_id)
    intake = IntakeService(db).create(
        data,
        center_id=center_id,
        user_id=current_user.id,
        background_tasks=background_tasks,
    )
    fire_audit(background_tasks, "INTAKE_CREATED", "intake",
               user_id=current_user.id, entity_id=str(intake.id), ip=get_client_ip(request))
    return intake


@router.get("", response_model=list[IntakeOut])
@limiter.limit("60/minute")
def list_intakes(
    request: Request,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_center_role),
    scope: UUID | None = Depends(tenant_scope),
):
    from app.services.intake_service import IntakeService
    intakes = IntakeService(db).list(center_id=scope, limit=limit, offset=offset)
    return [
        IntakeOut(
            id=i.id,
            center_id=i.center_id,
            campaign_id=i.campaign_id,
            donante_libre=i.donante_libre,
            notes=i.notes,
            created_at=i.created_at,
            boxes=[],
        )
        for i in intakes
    ]


@router.post("/read-label", response_model=dict)
@limiter.limit("20/minute")
async def read_label(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
):
    """Lee la etiqueta de una foto tomada en el mostrador.

    Existe aparte de la que lee una foto del pre-registro porque ahí hay una
    foto subida antes y aquí no: hay una cajita en la mano. La imagen no se
    guarda en ningún lado — llega, se lee y se descarta.

    Los campos vuelven como **sugerencia**: quien captura los confirma o los
    corrige antes de sellar, y la caducidad sigue pasando por la validación de
    vida útil. Diccionario vacío si la capacidad está apagada, sin presupuesto o
    el proveedor no responde: se teclea como siempre.
    """
    contents = await file.read()
    campos = label_ocr.extract_from_bytes(
        db,
        contents,
        file.content_type or "",
        user_id=current_user.id,
        center_id=current_user.center_id,
    )
    # `suggested` es explícito para que ningún cliente confunda esto con datos
    # confirmados: nada llega a SEALED sin que una persona lo haya mirado.
    return {"suggested": campos}


@router.get("/{intake_id}", response_model=IntakeOut)
@limiter.limit("120/minute")
def get_intake(
    request: Request,
    intake_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_center_role),
    scope: UUID | None = Depends(tenant_scope),
):
    return IntakeService(db).get(intake_id, center_id=scope)


@router.get("/donors/search", response_model=list[DonorOut])
@limiter.limit("60/minute")
def search_donors(
    request: Request,
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
    scope: UUID | None = Depends(tenant_scope),
):
    """Autocompletado de donantes del propio centro.

    Scoped siempre: la cartera de donantes no cruza entre centros. Un
    national_admin (scope None) no tiene centro propio, así que debe indicar
    cuál consulta.
    """
    if scope is None:
        raise api_error(
            "CENTER_REQUIRED",
            "Indica el centro cuyos donantes quieres consultar",
            field="center_id",
        )
    return DonorRepository(db).search(q, scope)
