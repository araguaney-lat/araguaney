from uuid import UUID

from app.models.product_gtin import ProductGtin
from app.models.product_type import ProductType, PRODUCT_CATEGORIES
from app.repositories.audit_repository import AuditRepository
from app.utils.text_matching import normalize, shares_stem, words
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

    def list_aliases(self, pt_id: UUID) -> list:
        repo = ProductTypeRepository(self.db)
        if not repo.find_by_id(pt_id):
            raise api_error("PRODUCT_TYPE_NOT_FOUND", "Product type not found", status_code=404)
        return repo.list_aliases(pt_id)

    def add_alias(self, pt_id: UUID, alias: str, user_id: UUID | None = None):
        """Agrega otro nombre por el que la gente pide este producto.

        Tres rechazos, y el tercero es el que importa: **un alias que el
        catálogo ya encontraba no se guarda**. No rompe nada tenerlo, pero hace
        creer que la lista cubre más de lo que cubre, y quien la mantiene deja
        de distinguir lo que agrega valor de lo que solo ocupa lugar. Es la
        misma regla que vigila a los alias sembrados, aplicada en la frontera.
        """
        repo = ProductTypeRepository(self.db)
        producto = repo.find_by_id(pt_id)
        if not producto:
            raise api_error("PRODUCT_TYPE_NOT_FOUND", "Product type not found", status_code=404)

        limpio = " ".join(alias.split())
        palabras = words(limpio)
        if not palabras:
            raise api_error(
                "ALIAS_TOO_SHORT",
                "Escribe al menos una palabra de tres letras o más.",
                field="alias",
            )

        if repo.find_alias_by_text(pt_id, normalize(limpio)) is not None:
            raise api_error(
                "ALIAS_ALREADY_EXISTS",
                f"«{limpio}» ya está registrado para este producto.",
                field="alias",
            )

        propias = set(words(" ".join(
            w for w in (producto.display_name, producto.inn_name, producto.brand) if w
        )))
        if all(shares_stem(palabra, propias) for palabra in palabras):
            raise api_error(
                "ALIAS_ALREADY_FOUND",
                f"«{limpio}» ya encuentra este producto sin necesidad del alias. "
                "Guardarlo no cambiaría nada.",
                field="alias",
            )

        fila = repo.add_alias(
            product_type_id=pt_id, alias=limpio, source="manual", user_id=user_id
        )
        AuditRepository(self.db).log(
            "PRODUCT_ALIAS_ADDED",
            "product_type",
            user_id=user_id,
            entity_id=str(pt_id),
            extra={"alias": limpio},
        )
        repo.commit()
        return fila

    def delete_alias(self, pt_id: UUID, alias_id: UUID, user_id: UUID | None = None) -> None:
        """Quita un alias. También los sembrados: uno que resultó equivocado
        arrastra al producto equivocado en cada captura, y dejarlo fijo por
        haber venido con el catálogo no lo haría más correcto.

        Queda en auditoría porque el catálogo es de todos los centros.
        """
        repo = ProductTypeRepository(self.db)
        fila = repo.find_alias(alias_id)
        # Si el alias cuelga de otro producto se responde igual que si no
        # existiera: la ruta declara a qué producto pertenece.
        if not fila or fila.product_type_id != pt_id:
            raise api_error("ALIAS_NOT_FOUND", "Alias not found", status_code=404)

        AuditRepository(self.db).log(
            "PRODUCT_ALIAS_REMOVED",
            "product_type",
            user_id=user_id,
            entity_id=str(pt_id),
            extra={"alias": fila.alias, "source": fila.source},
        )
        repo.delete_alias(fila)
        repo.commit()

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
