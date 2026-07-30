import secrets
from datetime import date, timezone
from uuid import UUID

from app.models.box import Box
from app.models.events import BoxEvent
from app.models.intake import Intake
from app.repositories.campaign_repository import CampaignRepository
from app.legal import CURRENT_DONATION_TERMS_VERSION
from app.repositories.donor_repository import DonorRepository
from app.repositories.intake_repository import IntakeRepository
from app.repositories.product_type_repository import ProductTypeRepository
from app.repositories.user_campaign_repository import UserCampaignRepository
from app.schemas.donor import DonorOut
from app.schemas.intake import BoxDraft, IntakeCreate, IntakeOut, BoxOut
from app.services.base import BaseService
from app.services.validation_service import validate_box
from app.utils.gtin import normalize as normalize_gtin, validate as validate_gtin
from app.utils.errors import api_error
from app.utils.volume import exceeds_volume_threshold


def _box_code() -> str:
    return f"BX-{secrets.token_urlsafe(6).upper()}"


class IntakeService(BaseService):

    def create(self, data: IntakeCreate, center_id: UUID, user_id: UUID) -> IntakeOut:
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
                raise api_error("NOT_CAMPAIGN_MEMBER", "User is not assigned to this campaign", status_code=403)

        pt_repo = ProductTypeRepository(self.db)
        intake_repo = IntakeRepository(self.db)
        capture_date = date.today()

        # Validate all product types exist before writing anything
        product_types = {}
        for bd in data.boxes:
            if bd.product_type_id not in product_types:
                pt = pt_repo.find_by_id(bd.product_type_id)
                if not pt:
                    raise api_error(
                        "PRODUCT_TYPE_NOT_FOUND",
                        f"Product type {bd.product_type_id} not found",
                        status_code=404,
                    )
                product_types[bd.product_type_id] = pt

        # Pre-registro que originó esta captura, si viene de un QR de donación.
        # Se resuelve antes del intake porque de aquí puede salir el donante.
        donation = None
        if data.donation_id is not None:
            from app.models.donation import Donation

            candidata = self.db.get(Donation, data.donation_id)
            if candidata is not None and candidata.received_center_id == center_id:
                donation = candidata

        # Fase 20 — el anonimato se acaba con el volumen. El escrutinio por tipo
        # de donante tiene una evasión obvia (registrarse como física, o no
        # registrarse); el umbral la cierra. Es escalamiento, no tope: exige
        # identificar, no impide donar.
        if data.donor is None and donation is None and exceeds_volume_threshold(
            boxes=len(data.boxes),
            kg=sum(bd.weight_kg or 0 for bd in data.boxes) or None,
        ):
            raise api_error(
                "DONOR_REQUIRED_FOR_VOLUME",
                "Esta donación supera el volumen que puede quedar anónimo. "
                "Registra a la persona o empresa donante para continuar.",
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
        ))

        saved_boxes: list[Box] = []
        for bd in data.boxes:
            pt = product_types[bd.product_type_id]
            reject_reason = validate_box(bd, pt, capture_date)
            status = "REJECTED" if reject_reason else "DRAFT"

            box = Box(
                code=_box_code(),
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

        # Cierra el circuito con el pre-registro: la donación apunta al intake
        # que la materializó en cajas.
        if donation is not None:
            donation.intake_id = intake.id

        intake_repo.commit()

        # Refresh boxes to get generated IDs
        for box in saved_boxes:
            self.db.refresh(box)

        return IntakeOut(
            id=intake.id,
            center_id=intake.center_id,
            campaign_id=campaign_id,
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
                for b in saved_boxes
            ],
        )

    def list(self, center_id: UUID | None, limit: int = 200, offset: int = 0) -> list[Intake]:
        return IntakeRepository(self.db).find_all(center_id, limit=limit, offset=offset)
