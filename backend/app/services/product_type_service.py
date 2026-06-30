from uuid import UUID

from app.models.product_type import ProductType, PRODUCT_CATEGORIES
from app.repositories.product_type_repository import ProductTypeRepository
from app.schemas.product_type import ProductTypeCreate, ProductTypeUpdate
from app.services.base import BaseService
from app.utils.errors import api_error


class ProductTypeService(BaseService):

    def get_all(self, category: str | None = None) -> list[ProductType]:
        if category and category not in PRODUCT_CATEGORIES:
            raise api_error("INVALID_CATEGORY", f"Category must be one of: {', '.join(PRODUCT_CATEGORIES)}", field="category")
        return ProductTypeRepository(self.db).find_all(category=category)

    def search(self, q: str, category: str | None = None) -> list[ProductType]:
        if len(q) < 2:
            raise api_error("QUERY_TOO_SHORT", "Search query must be at least 2 characters", field="q")
        return ProductTypeRepository(self.db).search(q, category=category)

    def get(self, pt_id: UUID) -> ProductType:
        pt = ProductTypeRepository(self.db).find_by_id(pt_id)
        if not pt:
            raise api_error("PRODUCT_TYPE_NOT_FOUND", "Product type not found", status_code=404)
        return pt

    def create(self, data: ProductTypeCreate) -> ProductType:
        if data.category not in PRODUCT_CATEGORIES:
            raise api_error("INVALID_CATEGORY", f"Category must be one of: {', '.join(PRODUCT_CATEGORIES)}", field="category")
        pt = ProductType(**data.model_dump())
        return ProductTypeRepository(self.db).save(pt)

    def update(self, pt_id: UUID, data: ProductTypeUpdate) -> ProductType:
        repo = ProductTypeRepository(self.db)
        pt = repo.find_by_id(pt_id)
        if not pt:
            raise api_error("PRODUCT_TYPE_NOT_FOUND", "Product type not found", status_code=404)
        updates = data.model_dump(exclude_none=True)
        if "category" in updates and updates["category"] not in PRODUCT_CATEGORIES:
            raise api_error("INVALID_CATEGORY", f"Category must be one of: {', '.join(PRODUCT_CATEGORIES)}", field="category")
        for field, value in updates.items():
            setattr(pt, field, value)
        repo.commit()
        return pt
