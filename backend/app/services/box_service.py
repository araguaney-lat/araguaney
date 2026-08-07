from datetime import datetime, timezone
from uuid import UUID

from app.models.box import Box
from app.models.events import BoxEvent
from app.models.product_type import ProductType
from app.repositories.box_repository import BoxRepository
from app.repositories.product_type_repository import ProductTypeRepository
from app.schemas.box import BoxOut, BoxPublicOut
from app.services.base import BaseService
from app.utils import delivery_status
from app.utils.errors import api_error


class BoxService(BaseService):

    def get(self, box_id: UUID, center_id: UUID | None) -> Box:
        box = BoxRepository(self.db).find_by_id(box_id, center_id)
        if not box:
            raise api_error("BOX_NOT_FOUND", "Box not found", status_code=404)
        return box

    def list(self, center_id: UUID | None, status: str | None = None, limit: int = 200, offset: int = 0) -> list[Box]:
        return BoxRepository(self.db).list_all(center_id, status=status, limit=limit, offset=offset)

    def seal(self, box_id: UUID, center_id: UUID | None, user_id: UUID) -> Box:
        repo = BoxRepository(self.db)
        box = repo.find_by_id(box_id, center_id)
        if not box:
            raise api_error("BOX_NOT_FOUND", "Box not found", status_code=404)
        if box.status != "DRAFT":
            raise api_error(
                "INVALID_TRANSITION",
                f"Box is in status '{box.status}'; only DRAFT boxes can be sealed",
                status_code=400,
            )

        pt: ProductType | None = ProductTypeRepository(self.db).find_by_id(box.product_type_id)
        if pt and pt.category == "MEDICINE":
            missing = [f for f in ("inn_name", "form", "strength") if not getattr(pt, f, None)]
            if missing:
                raise api_error(
                    "MISSING_FIELDS",
                    f"Cannot seal: product type missing required fields: {', '.join(missing)}",
                    status_code=422,
                )
            if not box.batch:
                raise api_error("MISSING_BATCH", "Batch is required to seal a medicine box", status_code=422)
            if not box.expiry_date:
                raise api_error("MISSING_EXPIRY", "Expiry date is required to seal a medicine box", status_code=422)

        if pt and pt.unit_weight_kg is not None and box.weight_kg is None:
            box.weight_kg = pt.unit_weight_kg * box.quantity

        now = datetime.now(tz=timezone.utc)
        box.status = "SEALED"
        box.sealed_at = now

        event = BoxEvent(
            box_id=box.id,
            user_id=user_id,
            from_status="DRAFT",
            to_status="SEALED",
        )
        self.db.add(event)
        repo.commit()
        return box

    def get_public(self, code: str) -> BoxPublicOut:
        box = BoxRepository(self.db).find_by_code(code)
        if not box:
            raise api_error("BOX_NOT_FOUND", "Box not found", status_code=404)
        pt: ProductType | None = ProductTypeRepository(self.db).find_by_id(box.product_type_id)
        entrega = delivery_status.for_box(self.db, box.id)
        return BoxPublicOut(
            code=box.code,
            status=box.status,
            category=pt.category if pt else "OTHER",
            display_name=pt.display_name if pt else "",
            quantity=box.quantity,
            unit=box.unit,
            expiry_date=box.expiry_date,
            sealed_at=box.sealed_at,
            delivered=entrega.delivered,
            delivered_at=entrega.delivered_at,
        )
