"""Resolución de revisiones de riesgo (Fase 20, task 10).

El protocolo de la guía de banderas rojas es *registrar, escalar, rechazar*.
Este servicio es el "escalar": quien captura abre la revisión, y quien la cierra
es alguien con autoridad para hacerlo, dejando por qué.
"""

from datetime import datetime, timezone
from uuid import UUID

from app.models.risk_review import RiskReview
from app.repositories.risk_review_repository import RiskReviewRepository
from app.services.base import BaseService
from app.utils.errors import api_error

RESOLUTIONS = ("APPROVED", "REJECTED")
_RESOLVER_ROLES = ("coordinator", "national_admin")


class RiskReviewService(BaseService):

    def list_pending(self, center_id: UUID | None) -> list[RiskReview]:
        """`center_id=None` solo para national_admin, que ve todos los centros."""
        return RiskReviewRepository(self.db).list_for_center(center_id)

    def resolve(self, review_id: UUID, resolution: str, note: str, actor) -> RiskReview:
        if resolution not in RESOLUTIONS:
            raise api_error("INVALID_RESOLUTION", "Resolución inválida", field="resolution")
        if actor.center_role not in _RESOLVER_ROLES:
            raise api_error(
                "FORBIDDEN",
                "Solo la coordinación puede resolver una revisión",
                status_code=403,
            )

        review = RiskReviewRepository(self.db).find_by_id(review_id)
        is_national = actor.center_role == "national_admin"

        # Fuera de su centro responde como inexistente: un coordinador no debe
        # poder averiguar qué se está revisando en otro centro.
        if review is None or (not is_national and review.center_id != actor.center_id):
            raise api_error("NOT_FOUND", "Revisión no encontrada", status_code=404)
        if review.status != "PENDING":
            raise api_error("ALREADY_RESOLVED", "Esta revisión ya fue resuelta", status_code=409)

        # Separación de funciones: escalar no sirve de nada si quien capturó se
        # autoriza a sí mismo. El national_admin es la excepción — es el
        # escalamiento final, y sin él la revisión quedaría muerta.
        if review.created_by_user_id == actor.id and not is_national:
            raise api_error(
                "SELF_REVIEW",
                "No puedes resolver una revisión que abriste tú. Escala a la coordinación nacional.",
                status_code=403,
            )

        cleaned_note = (note or "").strip()
        # Un rechazo sin motivo no le sirve ni a quien capturó ni a la auditoría.
        if resolution == "REJECTED" and not cleaned_note:
            raise api_error(
                "REASON_REQUIRED",
                "Un rechazo necesita motivo",
                field="note",
            )

        review.status = resolution
        review.review_note = cleaned_note or None
        review.reviewed_by_user_id = actor.id
        review.reviewed_at = datetime.now(timezone.utc)
        RiskReviewRepository(self.db).commit()
        return review
