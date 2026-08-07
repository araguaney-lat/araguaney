"""Acceso a las recepciones en destino (Fase 22).

El scoping no es por una columna propia: ni la recepción ni sus líneas tienen
`center_id`. Cuelgan del envío, así que el filtro va por `shipments.center_id`
con un join. Duplicar la columna sería una segunda fuente de verdad que puede
desincronizarse; el join no puede.
"""

from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.box import Box
from app.models.pallet import Pallet
from app.models.reception import ReceptionLine, ReceptionPalletWeight, ShipmentReception
from app.models.shipment import Shipment
from app.repositories.base import BaseRepository


class ReceptionRepository(BaseRepository[ShipmentReception]):
    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def scoped(self, stmt: Select, center_id: UUID | None) -> Select:
        """Filtra por el centro del envío. `None` es national_admin: ve todo."""
        stmt = stmt.join(Shipment, ShipmentReception.shipment_id == Shipment.id)
        if center_id is None:
            return stmt
        return stmt.where(Shipment.center_id == center_id)

    def find_by_shipment(self, shipment_id: UUID, center_id: UUID | None) -> ShipmentReception | None:
        stmt = self.scoped(
            select(ShipmentReception).where(ShipmentReception.shipment_id == shipment_id),
            center_id,
        )
        return self.db.execute(stmt).scalars().first()

    def find_lines(self, reception_id: UUID) -> list[ReceptionLine]:
        return list(
            self.db.execute(
                select(ReceptionLine).where(ReceptionLine.reception_id == reception_id)
            ).scalars().all()
        )

    def find_weights(self, reception_id: UUID) -> list[ReceptionPalletWeight]:
        return list(
            self.db.execute(
                select(ReceptionPalletWeight).where(
                    ReceptionPalletWeight.reception_id == reception_id
                )
            ).scalars().all()
        )

    def find_shipment_boxes(self, shipment_id: UUID) -> list[Box]:
        """Cajas del envío, vía sus tarimas. Es el universo del checklist."""
        return list(
            self.db.execute(
                select(Box)
                .join(Pallet, Box.pallet_id == Pallet.id)
                .where(Pallet.shipment_id == shipment_id)
                .order_by(Box.code)
            ).scalars().all()
        )

    def save(self, reception: ShipmentReception) -> ShipmentReception:
        self.db.add(reception)
        self.db.flush()
        return reception

    def commit(self) -> None:
        self.db.commit()
