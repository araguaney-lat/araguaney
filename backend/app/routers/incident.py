"""Listado y resolución de incidencias (Fase 22).

El alta vive en el router de envíos, porque una incidencia siempre nace de uno.
Aquí está lo transversal: la bandeja de la coordinación nacional y el cierre.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_coordinator, require_national_admin, tenant_scope
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.schemas.incident import IncidentOut, IncidentResolve
from app.services.incident_service import IncidentService
from app.utils.cloudflare import get_client_ip
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/v1/incidents", tags=["incidents"])


@router.get("", response_model=list[IncidentOut])
@limiter.limit("60/minute")
def list_incidents(
    request: Request,
    status: str | None = Query(None),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_coordinator),
    scope: UUID | None = Depends(tenant_scope),
):
    """Bandeja de incidencias. El coordinador ve las de su centro; el nacional, todas."""
    return IncidentService(db).list_all(scope, status=status, limit=limit, offset=offset)


@router.post("/{incident_id}/resolve", response_model=IncidentOut)
@limiter.limit("30/minute")
def resolve_incident(
    request: Request,
    incident_id: UUID,
    data: IncidentResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_national_admin),
    scope: UUID | None = Depends(tenant_scope),
):
    incident = IncidentService(db).resolve(
        incident_id, center_id=scope, user_id=current_user.id, note=data.note
    )
    AuditRepository(db).log("INCIDENT_RESOLVED", "incident",
        user_id=current_user.id, entity_id=str(incident_id), ip=get_client_ip(request))
    db.commit()
    return incident
