"""Recepción en destino (Fase 22, task 4).

Registrar qué llegó de verdad, caja por caja, sin tocar lo que se despachó.

Dos invariantes sostienen todo lo demás:

1. **La recepción no muta el inventario.** Las cajas y las tarimas siguen
   congeladas en `SHIPPED`. Si la recepción reescribiera su estado, la
   diferencia entre lo que salió y lo que llegó dejaría de existir justo al
   registrarla, y la merma sería imposible de medir.
2. **El checklist se pre-llena como recibido.** La merma es la minoría: quien
   captura marca solo las excepciones. Un formulario que obligue a confirmar
   caja por caja lo que sí llegó se llena mal, y se llena mal precisamente
   cuando el envío es grande.
"""

import os
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from app.models.events import ShipmentEvent
from app.models.incident import Incident
from app.models.reception import ReceptionLine, ReceptionPalletWeight, ShipmentReception
from app.repositories.reception_repository import ReceptionRepository
from app.repositories.shipment_repository import ShipmentRepository
from app.services.base import BaseService
from app.utils.errors import api_error

RECEPTION_OUTCOMES = ("RECEIVED", "MISSING", "DAMAGED", "RETAINED_CUSTOMS")

# Qué incidencia abre cada excepción. RECEIVED no abre ninguna: es el caso normal.
_INCIDENT_BY_OUTCOME = {
    "MISSING": "MISSING_BOX",
    "DAMAGED": "DAMAGE",
    "RETAINED_CUSTOMS": "CUSTOMS_RETENTION",
}

_WEIGHT_TOLERANCE_ENV = "RECEPTION_WEIGHT_TOLERANCE_PCT"
DEFAULT_WEIGHT_TOLERANCE_PCT = Decimal("5")


def weight_tolerance_pct() -> Decimal:
    """Cuánta diferencia de peso se tolera antes de abrir incidencia.

    Una tarima pesada dos veces, en dos básculas distintas y en dos continentes,
    nunca da el mismo número. Sin margen, cada envío abriría incidencias que
    nadie va a accionar, y el ruido acabaría enterrando las que sí importan.
    """
    raw = os.environ.get(_WEIGHT_TOLERANCE_ENV)
    if not raw:
        return DEFAULT_WEIGHT_TOLERANCE_PCT
    try:
        value = Decimal(raw)
    except Exception:
        return DEFAULT_WEIGHT_TOLERANCE_PCT
    return value if value > 0 else DEFAULT_WEIGHT_TOLERANCE_PCT


class ReceptionService(BaseService):

    def reconcile(
        self,
        shipment_id: UUID,
        center_id: UUID | None,
        user_id: UUID,
        exceptions: dict[UUID, dict],
        pallet_weights: dict[UUID, Decimal] | None = None,
        consignee_name: str | None = None,
        notes: str | None = None,
    ) -> ShipmentReception:
        """Registra la recepción y deja el envío en RECONCILED.

        `exceptions` lleva **solo** las cajas que no llegaron bien, mapeadas a
        `{"outcome": ..., "note": ...}`. Todo lo que no aparece se da por
        recibido.
        """
        shipment_repo = ShipmentRepository(self.db)
        shipment = shipment_repo.find_by_id(shipment_id, center_id)
        if not shipment:
            raise api_error("SHIPMENT_NOT_FOUND", "Shipment not found", status_code=404)
        if shipment.status != "DELIVERED":
            raise api_error(
                "INVALID_TRANSITION",
                f"Shipment is '{shipment.status}'; only DELIVERED shipments can be reconciled",
                status_code=400,
            )

        repo = ReceptionRepository(self.db)
        if repo.find_by_shipment(shipment_id, center_id) is not None:
            # Corregir una recepción se hace con una incidencia y su nota, no
            # reescribiendo el registro: lo que se declaró recibido ya viajó a
            # un reporte y a una métrica.
            raise api_error(
                "ALREADY_RECONCILED", "This shipment already has a reception", status_code=409
            )

        boxes = repo.find_shipment_boxes(shipment_id)
        if not boxes:
            raise api_error("EMPTY_SHIPMENT", "Shipment has no boxes to reconcile", status_code=400)

        conocidas = {box.id for box in boxes}
        ajenas = set(exceptions) - conocidas
        if ajenas:
            raise api_error(
                "BOX_NOT_IN_SHIPMENT",
                f"{len(ajenas)} box(es) do not belong to this shipment",
                field="exceptions",
            )

        reception = repo.save(ShipmentReception(
            shipment_id=shipment_id,
            received_by_user_id=user_id,
            consignee_name=consignee_name,
            notes=notes,
        ))

        for box in boxes:
            excepcion = exceptions.get(box.id) or {}
            outcome = excepcion.get("outcome", "RECEIVED")
            if outcome not in RECEPTION_OUTCOMES:
                raise api_error(
                    "INVALID_OUTCOME", f"Unknown outcome '{outcome}'", field="exceptions"
                )

            self.db.add(ReceptionLine(
                reception_id=reception.id,
                box_id=box.id,
                outcome=outcome,
                note=excepcion.get("note"),
            ))

            tipo = _INCIDENT_BY_OUTCOME.get(outcome)
            if tipo:
                self.db.add(Incident(
                    shipment_id=shipment_id,
                    pallet_id=box.pallet_id,
                    box_id=box.id,
                    type=tipo,
                    description=excepcion.get("note") or f"Caja {box.code}: {outcome}",
                    created_by_user_id=user_id,
                ))

        self._record_weights(reception, shipment_id, pallet_weights or {}, user_id)

        shipment.status = "RECONCILED"
        shipment.reconciled_at = datetime.now(tz=timezone.utc)
        self.db.add(ShipmentEvent(
            shipment_id=shipment_id, user_id=user_id,
            from_status="DELIVERED", to_status="RECONCILED",
        ))

        repo.commit()
        return reception

    def _record_weights(
        self, reception: ShipmentReception, shipment_id: UUID,
        pallet_weights: dict[UUID, Decimal], user_id: UUID,
    ) -> None:
        """Guarda los pesos recibidos y abre incidencia si difieren de más.

        La comparación es contra el peso de la Fase 21, medido en báscula al
        cerrar la tarima. Si esa tarima nunca se pesó no hay contra qué comparar,
        y el peso recibido se guarda igual: sirve para el documento aunque no
        produzca señal.
        """
        if not pallet_weights:
            return

        tolerancia = weight_tolerance_pct()
        pallets = {p.id: p for p in ShipmentRepository(self.db).find_pallets(shipment_id)}

        for pallet_id, recibido in pallet_weights.items():
            pallet = pallets.get(pallet_id)
            if pallet is None:
                raise api_error(
                    "PALLET_NOT_IN_SHIPMENT",
                    "Pallet does not belong to this shipment",
                    field="pallet_weights",
                )

            self.db.add(ReceptionPalletWeight(
                reception_id=reception.id, pallet_id=pallet_id, gross_weight_kg=recibido,
            ))

            despachado = pallet.gross_weight_kg
            if not despachado:
                continue

            diferencia = abs(Decimal(recibido) - Decimal(despachado))
            porcentaje = diferencia / Decimal(despachado) * 100
            if porcentaje > tolerancia:
                self.db.add(Incident(
                    shipment_id=shipment_id,
                    pallet_id=pallet_id,
                    type="WEIGHT_DIFF",
                    description=(
                        f"Tarima {pallet.code}: se despachó con {despachado} kg y se recibió "
                        f"con {recibido} kg ({porcentaje:.1f}% de diferencia)."
                    ),
                    created_by_user_id=user_id,
                ))

    def get(self, shipment_id: UUID, center_id: UUID | None) -> ShipmentReception:
        reception = ReceptionRepository(self.db).find_by_shipment(shipment_id, center_id)
        if reception is None:
            raise api_error("RECEPTION_NOT_FOUND", "This shipment has no reception", status_code=404)
        return reception

    @staticmethod
    def shrinkage(lines: list[ReceptionLine]) -> dict:
        """Merma del envío: cuántas cajas no llegaron bien, y en qué proporción.

        Es el espejo del % de rechazo en intake: una mide lo que no se aceptó al
        entrar, la otra lo que no llegó al salir.
        """
        total = len(lines)
        recibidas = sum(1 for line in lines if line.outcome == "RECEIVED")
        faltantes = total - recibidas
        return {
            "total_boxes": total,
            "received": recibidas,
            "not_received": faltantes,
            "shrinkage_pct": round(faltantes / total * 100, 2) if total else 0.0,
        }
