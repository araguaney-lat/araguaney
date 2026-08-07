"""Acceso a las incidencias de envío (Fase 22).

Mismo criterio de scoping que las recepciones: la incidencia no lleva
`center_id` propio, se filtra por el centro de su envío con un join.
"""

from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.shipment import Shipment
from app.repositories.base import BaseRepository


class IncidentRepository(BaseRepository[Incident]):
    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def scoped(self, stmt: Select, center_id: UUID | None) -> Select:
        stmt = stmt.join(Shipment, Incident.shipment_id == Shipment.id)
        if center_id is None:
            return stmt
        return stmt.where(Shipment.center_id == center_id)

    def find_by_id(self, incident_id: UUID, center_id: UUID | None) -> Incident | None:
        stmt = self.scoped(select(Incident).where(Incident.id == incident_id), center_id)
        return self.db.execute(stmt).scalars().first()

    def list_for_shipment(self, shipment_id: UUID, center_id: UUID | None) -> list[Incident]:
        stmt = self.scoped(
            select(Incident).where(Incident.shipment_id == shipment_id), center_id
        ).order_by(Incident.created_at.desc())
        return list(self.db.execute(stmt).scalars().all())

    def list_all(
        self,
        center_id: UUID | None,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Incident]:
        stmt = self.scoped(select(Incident), center_id)
        if status is not None:
            stmt = stmt.where(Incident.status == status)
        stmt = stmt.order_by(Incident.created_at.desc()).limit(limit).offset(offset)
        return list(self.db.execute(stmt).scalars().all())

    def save(self, incident: Incident) -> Incident:
        self.db.add(incident)
        self.db.flush()
        return incident

    def commit(self) -> None:
        self.db.commit()
