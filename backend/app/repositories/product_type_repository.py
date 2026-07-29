from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.product_gtin import ProductGtin
from app.models.product_type import ProductType
from app.repositories.base import BaseRepository


class ProductTypeRepository(BaseRepository):

    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def _visible_scope(self, stmt, campaign_ids: list[UUID] | None):
        """Filter to global products + those scoped to the given campaigns."""
        if not campaign_ids:
            return stmt.where(ProductType.campaign_id.is_(None))
        return stmt.where(
            or_(
                ProductType.campaign_id.is_(None),
                ProductType.campaign_id.in_(campaign_ids),
            )
        )

    def find_all(
        self,
        category: str | None = None,
        campaign_ids: list[UUID] | None = None,
    ) -> list[ProductType]:
        stmt = select(ProductType)
        stmt = self._visible_scope(stmt, campaign_ids)
        if category:
            stmt = stmt.where(ProductType.category == category)
        return list(self.db.execute(stmt.order_by(ProductType.display_name)).scalars())

    def search(
        self,
        q: str,
        category: str | None = None,
        campaign_ids: list[UUID] | None = None,
    ) -> list[ProductType]:
        term = f"%{q}%"
        stmt = select(ProductType).where(
            or_(
                ProductType.display_name.ilike(term),
                ProductType.inn_name.ilike(term),
                ProductType.gtin.ilike(term),
                ProductType.unspsc_code.ilike(term),
            )
        )
        stmt = self._visible_scope(stmt, campaign_ids)
        if category:
            stmt = stmt.where(ProductType.category == category)
        return list(self.db.execute(stmt.order_by(ProductType.display_name).limit(20)).scalars())

    def find_by_id(self, pt_id: UUID) -> ProductType | None:
        return self.db.get(ProductType, pt_id)

    def find_by_gtin(self, gtin: str) -> ProductType | None:
        """Busca por código de barras: primero lo aprendido del uso, luego el catálogo."""
        aprendido = self.db.execute(
            select(ProductType)
            .join(ProductGtin, ProductGtin.product_type_id == ProductType.id)
            .where(ProductGtin.gtin == gtin)
        ).scalar_one_or_none()
        if aprendido is not None:
            return aprendido

        return self.db.execute(
            select(ProductType).where(ProductType.gtin == gtin)
        ).scalar_one_or_none()

    def link_gtin(
        self,
        *,
        product_type_id: UUID,
        gtin: str,
        user_id: UUID | None = None,
        source: str = "intake",
    ) -> ProductGtin | None:
        """Liga un código de barras a un tipo de producto. No pisa lo ya existente.

        Devuelve la asociación vigente si el GTIN ya estaba ligado a este mismo
        producto, y None si pertenece a otro: gana quien lo capturó primero, para
        que una captura equivocada no reescriba el catálogo de todos los centros.
        """
        existente = self.db.execute(
            select(ProductGtin).where(ProductGtin.gtin == gtin)
        ).scalar_one_or_none()
        if existente is not None:
            return existente if existente.product_type_id == product_type_id else None

        enlace = ProductGtin(
            product_type_id=product_type_id,
            gtin=gtin,
            source=source,
            created_by_user_id=user_id,
        )
        self.db.add(enlace)
        return enlace

    def list_gtins(self, product_type_id: UUID) -> list[ProductGtin]:
        return list(self.db.execute(
            select(ProductGtin)
            .where(ProductGtin.product_type_id == product_type_id)
            .order_by(ProductGtin.created_at.desc())
        ).scalars().all())

    def find_gtin(self, gtin_id: UUID) -> ProductGtin | None:
        return self.db.get(ProductGtin, gtin_id)

    def delete_gtin(self, enlace: ProductGtin) -> None:
        """Desliga el código. Queda libre para que otra captura lo reclame."""
        self.db.delete(enlace)

    def exists_in_scope(
        self,
        inn_name: str,
        form: str | None,
        strength: str | None,
        campaign_ids: list[UUID] | None,
    ) -> bool:
        """Dedup check using unaccent+lower within visible scope."""
        from sqlalchemy import text
        stmt = select(ProductType.id).where(
            func.unaccent(func.lower(ProductType.inn_name)) == func.unaccent(func.lower(inn_name))
        )
        if form:
            stmt = stmt.where(
                func.unaccent(func.lower(ProductType.form)) == func.unaccent(func.lower(form))
            )
        if strength:
            stmt = stmt.where(
                func.unaccent(func.lower(ProductType.strength)) == func.unaccent(func.lower(strength))
            )
        stmt = self._visible_scope(stmt, campaign_ids)
        return self.db.execute(stmt.limit(1)).scalar_one_or_none() is not None

    def promote(self, pt_id: UUID) -> ProductType | None:
        """Move a campaign-scoped product type to global (campaign_id → None)."""
        pt = self.find_by_id(pt_id)
        if pt is None:
            return None
        pt.campaign_id = None
        self.db.flush()
        self.db.refresh(pt)
        return pt

    def save(self, pt: ProductType) -> ProductType:
        self.db.add(pt)
        self.db.flush()
        self.db.refresh(pt)
        return pt

    def commit(self) -> None:
        self.db.commit()
