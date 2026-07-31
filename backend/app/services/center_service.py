from uuid import UUID

from app.models.center import Center
from app.repositories.center_repository import CenterRepository
from app.schemas.center import CenterCreate, CenterUpdate
from app.services.base import BaseService
from app.utils.errors import api_error


class CenterService(BaseService):

    def list_centers(self, active_only: bool = False, country_code: str | None = None) -> list[Center]:
        return CenterRepository(self.db).find_all(active_only=active_only, country_code=country_code)

    def get_center(self, center_id: UUID) -> Center:
        center = CenterRepository(self.db).find_by_id(center_id)
        if not center:
            raise api_error("CENTER_NOT_FOUND", "Center not found", status_code=404)
        return center

    def create_center(self, data: CenterCreate) -> Center:
        center = Center(
            name=data.name,
            address=data.address,
            contact_name=data.contact_name,
            contact_email=data.contact_email,
            contact_phone=data.contact_phone,
            country_code=data.country_code,
            state_name=data.state_name,
            legal_name=data.legal_name,
            tax_id=data.tax_id,
        )
        return CenterRepository(self.db).save(center)

    def update_center(self, center_id: UUID, data: CenterUpdate) -> Center:
        repo = CenterRepository(self.db)
        center = repo.find_by_id(center_id)
        if not center:
            raise api_error("CENTER_NOT_FOUND", "Center not found", status_code=404)
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(center, field, value)
        repo.commit()
        return center
