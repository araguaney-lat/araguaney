from uuid import UUID

from app.models.product_gtin import ProductGtin
from app.models.product_type import ProductType, PRODUCT_CATEGORIES
from app.repositories.audit_repository import AuditRepository
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
        from app.utils.gtin import validate as validate_gtin
        if data.category not in PRODUCT_CATEGORIES:
            raise api_error("INVALID_CATEGORY", f"Category must be one of: {', '.join(PRODUCT_CATEGORIES)}", field="category")
        if data.gtin and not validate_gtin(data.gtin):
            raise api_error("INVALID_GTIN", "GTIN must be a valid EAN-8, UPC-A, or EAN-13", field="gtin")
        pt = ProductType(**data.model_dump())
        return ProductTypeRepository(self.db).save(pt)

    def list_gtins(self, pt_id: UUID) -> list[ProductGtin]:
        repo = ProductTypeRepository(self.db)
        if not repo.find_by_id(pt_id):
            raise api_error("PRODUCT_TYPE_NOT_FOUND", "Product type not found", status_code=404)
        return repo.list_gtins(pt_id)

    def unlink_gtin(self, pt_id: UUID, gtin_id: UUID, user_id: UUID | None = None) -> None:
        """Desliga un código de barras capturado por error.

        El aprendizaje del catálogo se queda con quien capturó primero, así que
        sin esta salida un código mal asociado sería permanente y global. Queda
        en auditoría porque afecta al catálogo de todos los centros.
        """
        repo = ProductTypeRepository(self.db)
        link = repo.find_gtin(gtin_id)
        # Si el código cuelga de otro producto se responde igual que si no
        # existiera: la ruta declara a qué producto pertenece.
        if not link or link.product_type_id != pt_id:
            raise api_error("GTIN_NOT_FOUND", "Barcode link not found", status_code=404)

        AuditRepository(self.db).log(
            "PRODUCT_GTIN_UNLINKED",
            "product_type",
            user_id=user_id,
            entity_id=str(pt_id),
            extra={"gtin": link.gtin, "source": link.source},
        )
        repo.delete_gtin(link)
        repo.commit()

    def promote(self, pt_id: UUID) -> ProductType:
        repo = ProductTypeRepository(self.db)
        pt = repo.find_by_id(pt_id)
        if not pt:
            raise api_error("PRODUCT_TYPE_NOT_FOUND", "Product type not found", status_code=404)
        pt.campaign_id = None
        repo.commit()
        return pt

    def update(self, pt_id: UUID, data: ProductTypeUpdate) -> ProductType:
        from app.utils.gtin import validate as validate_gtin
        repo = ProductTypeRepository(self.db)
        pt = repo.find_by_id(pt_id)
        if not pt:
            raise api_error("PRODUCT_TYPE_NOT_FOUND", "Product type not found", status_code=404)
        updates = data.model_dump(exclude_none=True)
        if "category" in updates and updates["category"] not in PRODUCT_CATEGORIES:
            raise api_error("INVALID_CATEGORY", f"Category must be one of: {', '.join(PRODUCT_CATEGORIES)}", field="category")
        if "gtin" in updates and updates["gtin"] and not validate_gtin(updates["gtin"]):
            raise api_error("INVALID_GTIN", "GTIN must be a valid EAN-8, UPC-A, or EAN-13", field="gtin")
        for field, value in updates.items():
            setattr(pt, field, value)
        repo.commit()
        return pt
