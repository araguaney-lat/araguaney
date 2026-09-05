import secrets
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING
from uuid import UUID

if TYPE_CHECKING:  # pragma: no cover - solo para la anotación
    from fastapi import BackgroundTasks

from sqlalchemy.exc import IntegrityError

from app.models.box import Box
from app.services.push import events as push_events
from app.models.events import BoxEvent
from app.models.intake import Intake
from app.models.risk_review import RiskReview
from app.repositories.campaign_repository import CampaignRepository
from app.legal import CURRENT_DONATION_TERMS_VERSION
from app.repositories.donor_repository import DonorRepository
from app.repositories.intake_repository import IntakeRepository
from app.repositories.product_type_repository import ProductTypeRepository
from app.repositories.user_campaign_repository import UserCampaignRepository
from app.schemas.donor import DonorOut
from app.schemas.intake import BoxDraft, IntakeCreate, IntakeOut, BoxOut
from app.services import box_code_service
from app.services.base import BaseService
from app.services.validation_service import validate_box
from app.utils.gtin import normalize as normalize_gtin, validate as validate_gtin
from app.utils.errors import api_error
from app.utils.volume import exceeds_volume_threshold


def _box_code() -> str:
    return f"BX-{secrets.token_urlsafe(6).upper()}"


def _capture_date() -> date:
    """El día de la captura, en UTC.

    Alimenta la regla de vida útil (`validate_box`), que resta esta fecha de una
    caducidad impresa en la caja para decidir si se acepta. Antes salía de
    `date.today()`, o sea del reloj del proceso: la misma caja podía aceptarse o
    rechazarse según dónde corriera el servidor, y eso no puede depender de ahí.

    UTC y no la hora local del centro porque es lo mismo que guardan las marcas
    de tiempo de todo lo demás. La diferencia máxima es de un día contra el
    calendario de quien captura, y cae del lado estricto: cuenta un día menos de
    vida útil, nunca uno de más.
    """
    return datetime.now(timezone.utc).date()


class IntakeService(BaseService):

    def create(
        self,
        data: IntakeCreate,
        center_id: UUID,
        user_id: UUID,
        background_tasks: "BackgroundTasks | None" = None,
    ) -> IntakeOut:
        # Idempotencia primero (Fase 25). Una captura offline reintenta con la
        # misma llave, y una respuesta perdida no puede convertirse en inventario
        # duplicado: cajas que nadie audita, que inflan el stock nacional y que
        # llegan a un manifiesto ante una aduana.
        if data.capture_id is not None:
            existente = IntakeRepository(self.db).find_by_capture_id(data.capture_id, center_id)
            if existente is not None:
                return self._to_out(existente)

        if not data.boxes:
            raise api_error("NO_BOXES", "At least one box is required")

        campaign_repo = CampaignRepository(self.db)

        # Resolve campaign — default to Donaciones Generales if not provided
        campaign_id = data.campaign_id
        if campaign_id is None:
            general = campaign_repo.find_general()
            if general is None:
                raise api_error("NO_GENERAL_CAMPAIGN", "Default campaign not configured", status_code=500)
            campaign_id = general.id
        else:
            campaign = campaign_repo.find_by_id(campaign_id)
            if not campaign or not campaign.is_active:
                raise api_error("CAMPAIGN_NOT_FOUND", "Campaign not found or inactive", status_code=400)
            if not UserCampaignRepository(self.db).is_member(user_id, campaign_id):
                raise api_error("NOT_CAMPAIGN_MEMBER", "No perteneces a esta campaña", status_code=403)

        pt_repo = ProductTypeRepository(self.db)
        intake_repo = IntakeRepository(self.db)
        capture_date = _capture_date()

        # Validate all product types exist before writing anything
        product_types = {}
        for bd in data.boxes:
            if bd.product_type_id not in product_types:
                pt = pt_repo.find_by_id(bd.product_type_id)
                if not pt:
                    # A reference inside the request body, not a URL resource —
                    # same category as CAMPAIGN_NOT_FOUND above, which is why
                    # this is 400 and not 404. A 404 here would tell the mobile
                    # client "nothing to say about this", when the actual fix
                    # (refresh the cached catalog) is something the person
                    # capturing can act on.
                    raise api_error(
                        "PRODUCT_TYPE_NOT_FOUND",
                        f"No existe el tipo de producto {bd.product_type_id}",
                        status_code=400,
                    )
                product_types[bd.product_type_id] = pt

        # Pre-registro que originó esta captura, si viene de un QR de donación.
        # Se resuelve antes del intake porque de aquí puede salir el donante.
        donation = None
        if data.donation_id is not None:
            from app.models.donation import Donation

            candidate = self.db.get(Donation, data.donation_id)
            if candidate is not None and candidate.received_center_id == center_id:
                donation = candidate

        # Fase 20 — el anonimato se acaba con el volumen. El escrutinio por tipo
        # de donante tiene una evasión obvia (registrarse como física, o no
        # registrarse); el umbral la cierra. Es escalamiento, no tope: exige
        # identificar, no impide donar.
        unusual_volume = donation is None and exceeds_volume_threshold(
            boxes=len(data.boxes),
            kg=sum(bd.weight_kg or 0 for bd in data.boxes) or None,
        )
        exception_reason = (getattr(data, "anonymous_exception_reason", None) or "").strip()

        # Sobre el umbral se pide identificar. Si la persona se niega —que es en
        # sí una bandera roja— la captura no se detiene: quien captura registra
        # el motivo y la revisión queda abierta para la coordinación. Bloquear
        # aquí le trasladaría el costo a la operación en plena emergencia, y no
        # recuperaría nada: para cuando alguien revise, la persona ya se fue.
        if unusual_volume and data.donor is None and not exception_reason:
            raise api_error(
                "DONOR_REQUIRED_FOR_VOLUME",
                "Esta donación supera el volumen que puede quedar anónimo. "
                "Registra a la persona o empresa donante, o pide la excepción "
                "explicando por qué no fue posible.",
                field="donor",
            )

        # Donante identificado (opcional): sin bloque `donor` la donacion es
        # anonima. Se resuelve antes de crear el intake para que un dato
        # invalido no deje un intake a medias.
        donor = None
        if data.donor is not None:
            # Quien dona a nombre de una empresa acepta los Términos siempre: es
            # la parte del control que cierra el "yo dono, yo recibo en destino".
            if data.donor.donor_type == "moral" and not data.donor_terms_accepted:
                raise api_error(
                    "TERMS_NOT_ACCEPTED",
                    "La persona moral debe aceptar los Términos de Donación",
                    field="donor_terms_accepted",
                )
            donor = DonorRepository(self.db).find_or_create(data.donor, center_id)
            self.db.flush()  # asigna el id antes de ligarlo al intake
        elif donation is not None:
            # Quien se pre-registró ya se identificó: volver a teclearlo en el
            # mostrador solo abriría la puerta a un segundo donante duplicado.
            donor = donation.donor

        try:
            return self._write(
                data, center_id, user_id, campaign_id, donor, donation,
                product_types, capture_date, intake_repo, pt_repo,
                unusual_volume, exception_reason, background_tasks,
            )
        except IntegrityError:
            # Dos reintentos concurrentes de la misma captura. El unique de la
            # base es lo que los ordena; una comprobación previa sola tiene una
            # carrera justo aquí. Quien pierde devuelve lo que ganó el otro: su
            # captura sí quedó registrada, solo que la escribió el otro hilo.
            self.db.rollback()
            ganador = IntakeRepository(self.db).find_by_capture_id(data.capture_id, center_id)
            if ganador is None:
                raise
            return self._to_out(ganador)

    def _write(
        self, data, center_id, user_id, campaign_id, donor, donation,
        product_types, capture_date, intake_repo, pt_repo,
        unusual_volume, exception_reason, background_tasks=None,
    ) -> IntakeOut:
        """La escritura propiamente dicha, aislada para poder reintentarla."""
        intake = intake_repo.save_intake(Intake(
            center_id=center_id,
            campaign_id=campaign_id,
            received_by_user_id=user_id,
            donor_id=donor.id if donor else None,
            # Solo hay aceptación que registrar si alguien se identificó.
            donor_terms_version=(
                CURRENT_DONATION_TERMS_VERSION
                if donor is not None and data.donor_terms_accepted else None
            ),
            donante_libre=data.donante_libre,
            notes=data.notes,
            capture_id=data.capture_id,
        ))

        saved_boxes: list[Box] = []
        for bd in data.boxes:
            pt = product_types[bd.product_type_id]
            reject_reason = validate_box(bd, pt, capture_date)
            status = "REJECTED" if reject_reason else "DRAFT"

            # Se reclama antes de crear la caja: así el error de dominio gana al
            # unique de `boxes.code` y el cliente sabe qué pasó.
            reserva = box_code_service.claim(self.db, bd.code, center_id) if bd.code else None

            box = Box(
                # Un código pre-asignado llega de una captura offline: la
                # etiqueta ya se imprimió con él, así que la caja tiene que
                # nacer con ese número y no con uno nuevo.
                code=bd.code or _box_code(),
                center_id=center_id,
                product_type_id=bd.product_type_id,
                intake_id=intake.id,
                quantity=bd.quantity,
                unit=bd.unit,
                batch=bd.batch,
                expiry_date=bd.expiry_date,
                weight_kg=bd.weight_kg,
                status=status,
                reject_reason=reject_reason,
            )
            intake_repo.save_box(box)
            saved_boxes.append(box)

            if reserva is not None:
                reserva.box_id = box.id

            # El catálogo aprende: el código leído queda ligado al producto que
            # la persona eligió. Un GTIN mal formado se ignora en silencio, no
            # vale la pena tumbar una captura del almacén por eso.
            if bd.gtin:
                gtin = normalize_gtin(bd.gtin)
                if validate_gtin(gtin):
                    pt_repo.link_gtin(
                        product_type_id=bd.product_type_id,
                        gtin=gtin,
                        user_id=user_id,
                    )

            event = BoxEvent(
                box_id=box.id,
                user_id=user_id,
                from_status=None,
                to_status=status,
                note=reject_reason,
            )
            self.db.add(event)

        # La bandera se levanta con el intake ya creado: la revisión apunta a algo
        # que existe, y quien revisa puede ver exactamente qué entró.
        if unusual_volume:
            self.db.add(RiskReview(
                center_id=center_id,
                intake_id=intake.id,
                kind="ANONYMOUS_EXCEPTION" if data.donor is None else "ATYPICAL_VOLUME",
                status="PENDING",
                reason=exception_reason or None,
                boxes=str(len(data.boxes)),
                created_by_user_id=user_id,
            ))

        # Cierra el circuito con el pre-registro: la donación apunta al intake
        # que la materializó en cajas.
        if donation is not None:
            donation.intake_id = intake.id

        intake_repo.commit()

        # El aviso va **después** del commit: si se encolara antes y la
        # transacción fallara, alguien recibiría el aviso de una revisión que no
        # existe. Falla en silencio por dentro, porque el intake ya está hecho y
        # eso es lo que le importa a quien capturó.
        if unusual_volume:
            push_events.risk_review_opened(
                self.db,
                background_tasks,
                center_id=center_id,
                intake_id=intake.id,
            )

        # Refresh boxes to get generated IDs
        for box in saved_boxes:
            self.db.refresh(box)

        return self._to_out(intake, saved_boxes, donor)

    def _to_out(self, intake: Intake, boxes: list[Box] | None = None, donor=None) -> IntakeOut:
        """Respuesta del intake.

        Los tres caminos de `create` la comparten: la captura nueva, la que ya
        existía por su `capture_id` y la que perdió una carrera concurrente.
        Quien reintenta debe recibir exactamente lo mismo que recibió el
        original, o el cliente creerá que su cola quedó a medias.
        """
        if boxes is None:
            boxes = IntakeRepository(self.db).boxes_for_intake(intake.id)
        if donor is None and intake.donor_id is not None:
            donor = DonorRepository(self.db).find_by_id(intake.donor_id)

        return IntakeOut(
            id=intake.id,
            center_id=intake.center_id,
            campaign_id=intake.campaign_id,
            donante_libre=intake.donante_libre,
            donor=DonorOut.model_validate(donor) if donor else None,
            notes=intake.notes,
            created_at=intake.created_at,
            boxes=[
                BoxOut(
                    id=b.id,
                    code=b.code,
                    product_type_id=b.product_type_id,
                    quantity=b.quantity,
                    unit=b.unit,
                    batch=b.batch,
                    expiry_date=b.expiry_date,
                    weight_kg=b.weight_kg,
                    status=b.status,
                    reject_reason=b.reject_reason,
                    created_at=b.created_at,
                )
                for b in boxes
            ],
        )

    def list(self, center_id: UUID | None, limit: int = 200, offset: int = 0) -> list[Intake]:
        return IntakeRepository(self.db).find_all(center_id, limit=limit, offset=offset)

    def get(self, intake_id: UUID, center_id: UUID | None) -> IntakeOut:
        intake = IntakeRepository(self.db).find_by_id(intake_id, center_id)
        if intake is None:
            raise api_error("INTAKE_NOT_FOUND", "Intake not found", status_code=404)
        return self._to_out(intake)
