from datetime import datetime, timezone
from typing import TYPE_CHECKING
from uuid import UUID

from app.arq_pool import enqueue
from app.models.events import SHIPMENT_MILESTONES, BoxEvent, PalletEvent, ShipmentEvent
from app.models.shipment import Shipment
from app.services.push import events as push_events

if TYPE_CHECKING:  # pragma: no cover - solo para la anotación
    from fastapi import BackgroundTasks
from app.repositories.donation_repository import DonationRepository
from app.repositories.pallet_repository import PalletRepository
from app.repositories.shipment_repository import ShipmentRepository
from app.schemas.box import BoxOut
from app.schemas.pallet import PalletDetailOut
from app.schemas.shipment import ShipmentCreate, ShipmentDetailOut
from app.services.base import BaseService
from app.utils.errors import api_error
from app.utils.weight import height_warning
from app.utils.weight import boxes_weight as _boxes_weight, net_weight, weight_discrepancy


# Estados en los que el envío ya salió del centro y admite hitos. Un hito sobre
# un envío que aún se está armando describiría algo que no ocurrió.
_POST_DISPATCH = ("SHIPPED", "DELIVERED", "RECONCILED")


class ShipmentService(BaseService):

    def create(self, center_id: UUID | None, user_id: UUID, data: ShipmentCreate) -> Shipment:
        repo = ShipmentRepository(self.db)
        shipment = Shipment(
            center_id=center_id,
            campaign_id=data.campaign_id,
            destination=data.destination,
            carrier=data.carrier,
            reference=data.reference,
            notes=data.notes,
            height_profile=data.height_profile,
            status="OPEN",
        )
        shipment = repo.save(shipment)
        self.db.add(ShipmentEvent(shipment_id=shipment.id, user_id=user_id, from_status=None, to_status="OPEN"))
        self.db.commit()
        return shipment

    def add_pallet(
        self, shipment_id: UUID, pallet_id: UUID, center_id: UUID | None, user_id: UUID
    ) -> ShipmentDetailOut:
        shipment = ShipmentRepository(self.db).find_by_id(shipment_id, center_id)
        if not shipment:
            raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)
        if shipment.status != "OPEN":
            raise api_error("INVALID_STATUS", "Only OPEN shipments accept pallets", status_code=400)

        pallet = PalletRepository(self.db).find_by_id(pallet_id, center_id)
        if not pallet:
            raise api_error("PALLET_NOT_FOUND", "Pallet not found", status_code=404)
        if pallet.status != "CLOSED":
            raise api_error("PALLET_NOT_CLOSED", "Only CLOSED pallets can be added to a shipment", status_code=400)
        if pallet.shipment_id is not None:
            raise api_error("PALLET_ALREADY_IN_SHIPMENT", "Pallet is already assigned to a shipment", status_code=400)

        pallet.shipment_id = shipment_id
        self.db.commit()
        return self._build_detail(shipment)

    def remove_pallet(self, shipment_id: UUID, pallet_id: UUID, center_id: UUID | None) -> ShipmentDetailOut:
        shipment = ShipmentRepository(self.db).find_by_id(shipment_id, center_id)
        if not shipment:
            raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)
        if shipment.status != "OPEN":
            raise api_error("INVALID_STATUS", "Cannot remove pallets from a non-OPEN shipment", status_code=400)

        pallet = PalletRepository(self.db).find_by_id(pallet_id, center_id)
        if not pallet or str(pallet.shipment_id) != str(shipment_id):
            raise api_error("PALLET_NOT_IN_SHIPMENT", "Pallet is not in this shipment", status_code=400)

        pallet.shipment_id = None
        self.db.commit()
        return self._build_detail(shipment)

    def close(self, shipment_id: UUID, center_id: UUID | None, user_id: UUID) -> Shipment:
        repo = ShipmentRepository(self.db)
        shipment = repo.find_by_id(shipment_id, center_id)
        if not shipment:
            raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)
        if shipment.status != "OPEN":
            raise api_error(
                "INVALID_TRANSITION",
                f"Shipment is '{shipment.status}'; only OPEN shipments can be closed",
                status_code=400,
            )
        if not repo.find_pallets(shipment_id):
            raise api_error("EMPTY_SHIPMENT", "Cannot close a shipment with no pallets", status_code=400)

        shipment.status = "CLOSED"
        shipment.closed_at = datetime.now(tz=timezone.utc)
        self.db.add(ShipmentEvent(shipment_id=shipment.id, user_id=user_id, from_status="OPEN", to_status="CLOSED"))
        repo.commit()
        return shipment

    def ship(
        self, shipment_id: UUID, center_id: UUID | None, user_id: UUID,
        background_tasks=None,
    ) -> Shipment:
        """CLOSED → SHIPPED: freeze all pallets and their boxes."""
        repo = ShipmentRepository(self.db)
        shipment = repo.find_by_id(shipment_id, center_id)
        if not shipment:
            raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)
        if shipment.status != "CLOSED":
            raise api_error(
                "INVALID_TRANSITION",
                f"Shipment is '{shipment.status}'; only CLOSED shipments can be shipped",
                status_code=400,
            )

        pallet_repo = PalletRepository(self.db)
        pallets = repo.find_pallets(shipment_id)
        boxes_by_pallet = pallet_repo.find_boxes_for_pallets([p.id for p in pallets])
        for pallet in pallets:
            for box in boxes_by_pallet[pallet.id]:
                box.status = "SHIPPED"
                self.db.add(BoxEvent(box_id=box.id, user_id=user_id, from_status="SEALED", to_status="SHIPPED"))
            pallet.status = "SHIPPED"
            self.db.add(PalletEvent(pallet_id=pallet.id, user_id=user_id, from_status="CLOSED", to_status="SHIPPED"))

        shipment.status = "SHIPPED"
        shipment.shipped_at = datetime.now(tz=timezone.utc)
        self.db.add(ShipmentEvent(shipment_id=shipment.id, user_id=user_id, from_status="CLOSED", to_status="SHIPPED"))
        repo.commit()

        self._notify_donors(shipment_id, shipment.reference, background_tasks)
        return shipment

    def _notify_donors(self, shipment_id: UUID, reference: str, background_tasks) -> None:
        """Cierra el círculo con quien se pre-registró: su donación ya salió.

        Va después del commit: un fallo mandando correos no puede deshacer un
        despacho que ya ocurrió.
        """
        if background_tasks is None:
            return
        for donation in DonationRepository(self.db).find_donations_for_shipment(shipment_id):
            enqueue(
                background_tasks,
                "send_donation_shipped_email_task",
                donation.donor.email,
                donation.code,
                reference,
            )

    def get_detail(self, shipment_id: UUID, center_id: UUID | None) -> ShipmentDetailOut:
        shipment = ShipmentRepository(self.db).find_by_id(shipment_id, center_id)
        if not shipment:
            raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)
        return self._build_detail(shipment)

    def list(
        self, center_id: UUID | None, status: str | None = None, limit: int = 200, offset: int = 0
    ) -> list[Shipment]:
        return ShipmentRepository(self.db).list_all(center_id, status=status, limit=limit, offset=offset)

    # ── Después de despachar (Fase 22) ────────────────────────────────────────

    def add_milestone(
        self, shipment_id: UUID, center_id: UUID | None, user_id: UUID,
        milestone: str, note: str | None = None, occurred_at: datetime | None = None,
    ) -> Shipment:
        """Anota un hito logístico sin mover el estado.

        Un hito es un evento con `from_status = to_status`: registra que algo
        pasó sin inventar estados intermedios. Si cada paso del camino fuera un
        estado, la máquina crecería con cada aeropuerto.
        """
        if milestone not in SHIPMENT_MILESTONES:
            raise api_error("INVALID_MILESTONE", f"Unknown milestone '{milestone}'", field="milestone")

        repo = ShipmentRepository(self.db)
        shipment = repo.find_by_id(shipment_id, center_id)
        if not shipment:
            raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)
        if shipment.status not in _POST_DISPATCH:
            raise api_error(
                "INVALID_STATUS",
                f"Shipment is '{shipment.status}'; milestones only apply once it has been shipped",
                status_code=400,
            )

        evento = ShipmentEvent(
            shipment_id=shipment.id,
            user_id=user_id,
            from_status=shipment.status,
            to_status=shipment.status,
            milestone=milestone,
            note=note,
        )
        # La fecha del hito la pone quien lo registra: el reporte del
        # consignatario llega tarde y con frecuencia describe algo de ayer.
        if occurred_at is not None:
            evento.ts = occurred_at
        self.db.add(evento)
        repo.commit()
        return shipment

    def mark_delivered(
        self, shipment_id: UUID, center_id: UUID | None, user_id: UUID,
        note: str | None = None, delivered_at: datetime | None = None,
        background_tasks: "BackgroundTasks | None" = None,
    ) -> Shipment:
        """SHIPPED → DELIVERED. Llegó; qué llegó se registra en la recepción."""
        repo = ShipmentRepository(self.db)
        shipment = repo.find_by_id(shipment_id, center_id)
        if not shipment:
            raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)
        if shipment.status != "SHIPPED":
            raise api_error(
                "INVALID_TRANSITION",
                f"Shipment is '{shipment.status}'; only SHIPPED shipments can be marked delivered",
                status_code=400,
            )

        shipment.status = "DELIVERED"
        shipment.delivered_at = delivered_at or datetime.now(tz=timezone.utc)
        self.db.add(ShipmentEvent(
            shipment_id=shipment.id, user_id=user_id,
            from_status="SHIPPED", to_status="DELIVERED", note=note,
        ))
        repo.commit()
        # La ficha pública de cada caja y tarima pasa a decir "entregada".
        self._purge_qr_cache(shipment_id)

        # Después del commit, por lo mismo que en el intake: nadie debe recibir
        # el aviso de una entrega que no quedó guardada. Se usa el centro del
        # envío y no el del scope, porque una administración nacional marca
        # entregas de cualquier centro y el aviso es para el de origen.
        push_events.shipment_delivered(
            self.db,
            background_tasks,
            center_id=shipment.center_id,
            shipment_id=shipment.id,
            reference=shipment.reference,
        )
        return shipment

    def _purge_qr_cache(self, shipment_id: UUID) -> None:
        """Invalida la ficha pública de cada pieza del envío.

        El TTL del edge acota cuánto puede tardar el dato en aparecer; esto lo
        quita de en medio en el origen. Sin Redis no hace nada, y no pasa nada:
        el TTL sigue siendo el techo.
        """
        from app.utils import cache

        repo = ShipmentRepository(self.db)
        pallet_repo = PalletRepository(self.db)
        pallets = repo.find_pallets(shipment_id)
        boxes_by_pallet = pallet_repo.find_boxes_for_pallets([p.id for p in pallets])
        for pallet in pallets:
            cache.delete(f"qr:{pallet.code}")
            for box in boxes_by_pallet[pallet.id]:
                cache.delete(f"qr:{box.code}")

    def _build_detail(self, shipment: Shipment) -> ShipmentDetailOut:
        s_repo = ShipmentRepository(self.db)
        p_repo = PalletRepository(self.db)
        pallets = s_repo.find_pallets(shipment.id)
        boxes_by_pallet = p_repo.find_boxes_for_pallets([p.id for p in pallets])
        pallet_details = []
        for pallet in pallets:
            boxes = boxes_by_pallet[pallet.id]
            pallet_details.append(PalletDetailOut(
                id=pallet.id,
                code=pallet.code,
                center_id=pallet.center_id,
                shipment_id=pallet.shipment_id,
                status=pallet.status,
                notes=pallet.notes,
                closed_at=pallet.closed_at,
                created_at=pallet.created_at,
                gross_weight_kg=pallet.gross_weight_kg,
                tare_weight_kg=pallet.tare_weight_kg,
                height_cm=pallet.height_cm,
                boxes_weight_kg=(suma := _boxes_weight(boxes)),
                weight_discrepancy_kg=weight_discrepancy(
                    net_weight(pallet.gross_weight_kg, pallet.tare_weight_kg), suma
                ),
                boxes=[BoxOut.model_validate(b) for b in boxes],
            ))
        return ShipmentDetailOut(
            id=shipment.id,
            center_id=shipment.center_id,
            campaign_id=shipment.campaign_id,
            destination=shipment.destination,
            carrier=shipment.carrier,
            reference=shipment.reference,
            status=shipment.status,
            notes=shipment.notes,
            closed_at=shipment.closed_at,
            shipped_at=shipment.shipped_at,
            created_at=shipment.created_at,
            height_profile=shipment.height_profile,
            # Se calcula al leer, no se guarda: cambiar el perfil del envío
            # tiene que recalcularlo sin tocar cada tarima.
            height_warnings=[
                aviso for p in pallets
                if (aviso := height_warning(p.height_cm, shipment.height_profile))
            ],
            pallets=pallet_details,
        )
