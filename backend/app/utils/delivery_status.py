"""Estado de entrega para las fichas públicas (Fase 22, task 10).

La caja no se muta cuando el envío llega: sigue congelada en `SHIPPED` desde que
salió, y esa inmutabilidad es lo que permite comparar después lo enviado con lo
recibido. Lo que la ficha muestra no es un estado nuevo de la caja, es **un dato
de su envío** leído en el momento de responder.

Es también la respuesta a la pregunta que trae quien escanea un QR en el andén:
"¿esto ya llegó?". Sin este dato, la ficha de una caja entregada hace tres
semanas sigue diciendo "despachada".
"""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.box import Box
from app.models.pallet import Pallet
from app.models.shipment import Shipment

# Estados del envío que significan "ya llegó a destino".
_DELIVERED_STATUSES = ("DELIVERED", "RECONCILED")


@dataclass(frozen=True)
class DeliveryStatus:
    delivered: bool
    delivered_at: datetime | None


_NOT_DELIVERED = DeliveryStatus(delivered=False, delivered_at=None)


def _from_shipment(shipment: Shipment | None) -> DeliveryStatus:
    if shipment is None or shipment.status not in _DELIVERED_STATUSES:
        return _NOT_DELIVERED
    return DeliveryStatus(delivered=True, delivered_at=shipment.delivered_at)


def for_pallet(db: Session, pallet_id: UUID | None) -> DeliveryStatus:
    if pallet_id is None:
        return _NOT_DELIVERED
    shipment = db.execute(
        select(Shipment)
        .join(Pallet, Pallet.shipment_id == Shipment.id)
        .where(Pallet.id == pallet_id)
    ).scalars().first()
    return _from_shipment(shipment)


def for_box(db: Session, box_id: UUID) -> DeliveryStatus:
    """Caja → tarima → envío. Una caja sin tarima nunca viajó."""
    shipment = db.execute(
        select(Shipment)
        .join(Pallet, Pallet.shipment_id == Shipment.id)
        .join(Box, Box.pallet_id == Pallet.id)
        .where(Box.id == box_id)
    ).scalars().first()
    return _from_shipment(shipment)
