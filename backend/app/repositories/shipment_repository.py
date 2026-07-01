from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.events import ShipmentEvent
from app.models.pallet import Pallet
from app.models.shipment import Shipment
from app.repositories.base import TenantRepository


class ShipmentRepository(TenantRepository[Shipment]):

    def __init__(self, db: Session) -> None:
        super().__init__(db)
        self.model = Shipment

    def find_by_id(self, shipment_id: UUID, center_id: UUID | None) -> Shipment | None:
        stmt = self.scoped(select(Shipment).where(Shipment.id == shipment_id), center_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_all(self, center_id: UUID | None, status: str | None = None) -> list[Shipment]:
        stmt = select(Shipment).order_by(Shipment.created_at.desc())
        if status:
            stmt = stmt.where(Shipment.status == status)
        return list(self.db.execute(self.scoped(stmt, center_id)).scalars())

    def find_pallets(self, shipment_id: UUID) -> list[Pallet]:
        stmt = select(Pallet).where(Pallet.shipment_id == shipment_id).order_by(Pallet.created_at)
        return list(self.db.execute(stmt).scalars())

    def list_events(self, shipment_id: UUID) -> list[ShipmentEvent]:
        return list(self.db.execute(
            select(ShipmentEvent).where(ShipmentEvent.shipment_id == shipment_id).order_by(ShipmentEvent.ts)
        ).scalars())

    def save(self, shipment: Shipment) -> Shipment:
        self.db.add(shipment)
        self.db.commit()
        self.db.refresh(shipment)
        return shipment

    def commit(self) -> None:
        self.db.commit()
