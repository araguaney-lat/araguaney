"""Incidencias de envío (Fase 22, task 5).

Cada faltante, daño, retención o diferencia de peso pasa a tener dueño, estado y
resolución. La recepción abre las suyas sola; estas son las que alguien levanta a
mano cuando algo no encaja en ninguna casilla del checklist.

Una incidencia sin resolución es un pendiente; una anomalía sin incidencia es un
mensaje que se pierde. La diferencia entre las dos es el punto de la tabla.
"""

from datetime import datetime, timezone
from uuid import UUID

from app.models.incident import INCIDENT_TYPES, Incident
from app.repositories.incident_repository import IncidentRepository
from app.repositories.shipment_repository import ShipmentRepository
from app.services.base import BaseService
from app.utils.errors import api_error


class IncidentService(BaseService):

    def create(
        self,
        shipment_id: UUID,
        center_id: UUID | None,
        user_id: UUID,
        type: str,
        description: str,
        pallet_id: UUID | None = None,
        box_id: UUID | None = None,
    ) -> Incident:
        if type not in INCIDENT_TYPES:
            raise api_error("INVALID_TYPE", f"Unknown incident type '{type}'", field="type")

        shipment_repo = ShipmentRepository(self.db)
        shipment = shipment_repo.find_by_id(shipment_id, center_id)
        if not shipment:
            raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)

        # Una incidencia que apunta a una tarima de otro envío describiría un
        # problema inexistente y ensuciaría el conteo de merma del envío ajeno.
        if pallet_id is not None:
            pallets = {p.id for p in shipment_repo.find_pallets(shipment_id)}
            if pallet_id not in pallets:
                raise api_error(
                    "PALLET_NOT_IN_SHIPMENT",
                    "Pallet does not belong to this shipment",
                    field="pallet_id",
                )

        if box_id is not None:
            from app.repositories.reception_repository import ReceptionRepository

            boxes = {b.id for b in ReceptionRepository(self.db).find_shipment_boxes(shipment_id)}
            if box_id not in boxes:
                raise api_error(
                    "BOX_NOT_IN_SHIPMENT",
                    "Box does not belong to this shipment",
                    field="box_id",
                )

        repo = IncidentRepository(self.db)
        incident = repo.save(Incident(
            shipment_id=shipment_id,
            pallet_id=pallet_id,
            box_id=box_id,
            type=type,
            description=description,
            created_by_user_id=user_id,
        ))
        repo.commit()
        return incident

    def resolve(
        self, incident_id: UUID, center_id: UUID | None, user_id: UUID, note: str
    ) -> Incident:
        """Cerrar una incidencia exige decir cómo se cerró.

        Sin nota, "resuelta" no significa nada seis meses después: ni para quien
        la levantó, ni para la auditoría, ni para quien lea la merma de esa
        campaña.
        """
        nota = (note or "").strip()
        if not nota:
            raise api_error("NOTE_REQUIRED", "Una resolución necesita nota", field="note")

        repo = IncidentRepository(self.db)
        incident = repo.find_by_id(incident_id, center_id)
        if not incident:
            raise api_error("INCIDENT_NOT_FOUND", "Incident not found", status_code=404)
        if incident.status != "OPEN":
            raise api_error("ALREADY_RESOLVED", "This incident is already resolved", status_code=409)

        incident.status = "RESOLVED"
        incident.resolution_note = nota
        incident.resolved_by_user_id = user_id
        incident.resolved_at = datetime.now(tz=timezone.utc)
        repo.commit()
        return incident

    def list_for_shipment(self, shipment_id: UUID, center_id: UUID | None) -> list[Incident]:
        return IncidentRepository(self.db).list_for_shipment(shipment_id, center_id)

    def list_all(
        self, center_id: UUID | None, status: str | None = None,
        limit: int = 100, offset: int = 0,
    ) -> list[Incident]:
        if status is not None and status not in ("OPEN", "RESOLVED"):
            raise api_error("INVALID_STATUS", f"Unknown status '{status}'", field="status")
        return IncidentRepository(self.db).list_all(center_id, status, limit, offset)
