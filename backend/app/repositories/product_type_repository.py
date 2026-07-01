from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

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
        return self.db.execute(
            select(ProductType).where(ProductType.gtin == gtin)
        ).scalar_one_or_none()

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

    def save(self, pt: ProductType) -> ProductType:
        self.db.add(pt)
        self.db.flush()
        self.db.refresh(pt)
        return pt

    def commit(self) -> None:
        self.db.commit()
