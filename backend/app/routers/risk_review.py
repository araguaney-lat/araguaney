"""Cola de revisiones de riesgo (Fase 20).

La coordinación abre esto y ve qué capturas levantaron bandera. Resolver deja
quién, cuándo y por qué — en la revisión y en la auditoría general.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_center_role, tenant_scope
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.schemas.risk_review import RiskReviewOut, RiskReviewResolveIn
from app.services.risk_review_service import RiskReviewService
from app.utils.cloudflare import get_client_ip
from app.utils.rate_limit import limiter

router = APIRouter(tags=["risk-reviews"])

_NO_CACHE = "no-store"


@router.get("/risk-reviews", response_model=list[RiskReviewOut])
@limiter.limit("120/minute")
def list_risk_reviews(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
    scope=Depends(tenant_scope),
):
    response.headers["Cache-Control"] = _NO_CACHE
    return RiskReviewService(db).list_pending(scope)


@router.post("/risk-reviews/{review_id}/resolve", response_model=RiskReviewOut)
@limiter.limit("60/minute")
def resolve_risk_review(
    request: Request,
    review_id: UUID,
    data: RiskReviewResolveIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
):
    review = RiskReviewService(db).resolve(
        review_id, data.resolution, data.note or "", current_user
    )
    AuditRepository(db).log(
        f"RISK_REVIEW_{data.resolution}",
        "risk_review",
        user_id=current_user.id,
        entity_id=str(review_id),
        ip=get_client_ip(request),
    )
    db.commit()
    return review
