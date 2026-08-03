"""Alta y confirmación del pre-registro de donaciones (Fase 18).

Doble opt-in calcado del patrón de solicitudes de centro: el token se genera
con `secrets`, se guarda **solo hasheado** y es de un solo uso.
"""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import BackgroundTasks

from app.arq_pool import enqueue
from app.legal import CURRENT_DONATION_TERMS_VERSION
from app.models.center import Center
from app.models.donation import Donation, DonationItem
from app.repositories.donation_repository import DonationRepository
from app.repositories.donor_repository import DonorRepository
from app.schemas.donation import DonationCreate
from app.services.base import BaseService
from app.utils.errors import api_error
from app.utils.r2 import delete_object
from app.utils.volume import exceeds_volume_threshold

logger = logging.getLogger(__name__)

_MANAGE_TOKEN_DAYS = 30
_RECEPTION_STATES = ("RECEIVED", "MISSING", "REJECTED")

# Lo que el donante lee en su correo. El estado interno no le dice nada.
_RECEPTION_LABEL = {
    "RECEIVED": "Recibido",
    "MISSING": "No llegó",
    "REJECTED": "No aceptado",
}


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _donation_code() -> str:
    return f"DN-{secrets.token_urlsafe(6).upper()}"


class DonationService(BaseService):

    def submit(self, data: DonationCreate, background_tasks: BackgroundTasks) -> Donation | None:
        """Registra la donación en estado PENDING_EMAIL y manda la confirmación.

        Nada existe para el centro hasta que el correo se confirma: sin ese paso
        el formulario público sería un vector de basura.

        Devuelve `None` cuando ese correo ya tenía una donación abierta. El
        router responde igual en ambos casos: contestar distinto convertiría al
        formulario en un verificador de correos ajenos, y basta con probar una
        dirección para saber si esa persona está donando.
        """
        repo = DonationRepository(self.db)

        open_donation = repo.find_open_for_email(data.donor.email)
        if open_donation is not None:
            self._resend_if_pending(open_donation, background_tasks)
            return None

        donor = DonorRepository(self.db).find_or_create_self(data.donor)
        self.db.flush()

        raw_token = secrets.token_urlsafe(32)
        donor.email_verify_token_hash = _hash_token(raw_token)

        donation = Donation(
            code=_donation_code(),
            donor_id=donor.id,
            intended_center_id=data.intended_center_id,
            intended_campaign_id=data.intended_campaign_id,
            status="PENDING_EMAIL",
            notes=data.notes,
            confirmation_sent_at=datetime.now(timezone.utc),
            terms_version=CURRENT_DONATION_TERMS_VERSION,
            terms_accepted_at=datetime.now(timezone.utc),
            # No bloquea: quien se pre-registra ya está identificado. Le avisa al
            # centro que reciba con la guía de banderas rojas a la mano.
            atypical_volume=exceeds_volume_threshold(
                boxes=sum(item.quantity for item in data.items), kg=None
            ),
        )
        donation.donor = donor
        donation.items = [
            DonationItem(
                product_type_id=item.product_type_id,
                free_text=item.free_text,
                quantity=item.quantity,
                unit=item.unit,
                added_by="donor",
            )
            for item in data.items
        ]
        repo.save(donation)
        repo.log_event(donation, to_status="PENDING_EMAIL")
        repo.commit()

        enqueue(
            background_tasks,
            "send_donation_confirmation_email_task",
            donor.email,
            donor.first_name,
            raw_token,
        )
        return donation

    def _resend_if_pending(self, open_donation: Donation, background_tasks: BackgroundTasks) -> None:
        """Quien de verdad es dueño del correo recibe su enlace otra vez.

        Solo aplica a la que sigue sin confirmar. Una donación ya confirmada tiene
        su QR en el buzón, y rotarle el enlace de gestión dejaría que cualquiera
        que conozca el correo se lo tumbara a voluntad.
        """
        if open_donation.status != "PENDING_EMAIL":
            return

        raw_token = secrets.token_urlsafe(32)
        open_donation.donor.email_verify_token_hash = _hash_token(raw_token)
        open_donation.confirmation_sent_at = datetime.now(timezone.utc)
        DonationRepository(self.db).commit()

        enqueue(
            background_tasks,
            "send_donation_confirmation_email_task",
            open_donation.donor.email,
            open_donation.donor.first_name,
            raw_token,
        )

    def confirm_email(self, token: str, background_tasks: BackgroundTasks) -> Donation:
        """Confirma el correo, deja la donación REGISTERED y emite el enlace de gestión."""
        repo = DonationRepository(self.db)
        donation = repo.find_by_verify_token_hash(_hash_token(token))

        # Misma respuesta para token inexistente, ya usado o donación en otro
        # estado: no se le confirma nada a quien prueba tokens al azar.
        if donation is None or donation.status != "PENDING_EMAIL":
            raise api_error("INVALID_TOKEN", "Enlace inválido o ya utilizado", status_code=404)

        now = datetime.now(timezone.utc)
        donation.donor.email_verify_token_hash = None   # un solo uso
        donation.donor.email_verified_at = now

        raw_manage = secrets.token_urlsafe(32)
        donation.manage_token_hash = _hash_token(raw_manage)
        donation.manage_token_expires_at = now + timedelta(days=_MANAGE_TOKEN_DAYS)

        donation.status = "REGISTERED"
        donation.registered_at = now

        repo.log_event(donation, from_status="PENDING_EMAIL", to_status="REGISTERED")
        repo.commit()

        enqueue(
            background_tasks,
            "send_donation_registered_email_task",
            donation.donor.email,
            donation.code,
            raw_manage,
        )
        return donation

    def resend(self, email: str, background_tasks: BackgroundTasks) -> None:
        """Reenvía la confirmación rotando el token: el enlace anterior muere.

        Un correo desconocido no levanta error y no manda nada. Responder
        distinto convertiría al formulario en un verificador de correos: bastaría
        probar direcciones para saber cuáles tienen una donación en curso.
        """
        repo = DonationRepository(self.db)
        donation = repo.find_pending_by_email(email)
        if donation is None:
            return

        raw_token = secrets.token_urlsafe(32)
        donation.donor.email_verify_token_hash = _hash_token(raw_token)
        # Reinicia el reloj de la purga: pedirlo el último día tiene que servir.
        donation.confirmation_sent_at = datetime.now(timezone.utc)
        repo.log_event(
            donation,
            from_status="PENDING_EMAIL",
            to_status="PENDING_EMAIL",
            note="Reenvío del correo de confirmación",
        )
        repo.commit()

        enqueue(
            background_tasks,
            "send_donation_confirmation_email_task",
            donation.donor.email,
            donation.donor.first_name,
            raw_token,
        )

    def get_by_manage_token(self, token: str) -> Donation:
        """Resuelve el enlace de gestión. Vencido o inexistente responden igual."""
        donation = DonationRepository(self.db).find_by_manage_token_hash(_hash_token(token))
        if donation is None:
            raise api_error("INVALID_TOKEN", "Enlace inválido o vencido", status_code=404)

        expires_at = donation.manage_token_expires_at
        if expires_at is not None and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at is None or expires_at <= datetime.now(timezone.utc):
            raise api_error("INVALID_TOKEN", "Enlace inválido o vencido", status_code=404)

        return donation

    # ── Gestión por el donante ───────────────────────────────────────────────

    def _editable(self, token: str) -> Donation:
        """Resuelve el enlace y exige que la donación siga siendo del donante.

        Desde RECEIVED manda el inventario del centro: lo que se despachó es un
        registro inmutable y el donante ya no lo toca.
        """
        donation = self.get_by_manage_token(token)
        if donation.status != "REGISTERED":
            raise api_error(
                "NOT_EDITABLE",
                "Esta donación ya no se puede modificar",
                status_code=409,
            )
        return donation

    def update_items(self, token: str, items: list) -> Donation:
        """Reemplaza los renglones. El donante manda mientras no entregue."""
        donation = self._editable(token)
        repo = DonationRepository(self.db)

        donation.items = [
            DonationItem(
                product_type_id=item.product_type_id,
                free_text=item.free_text,
                quantity=item.quantity,
                unit=item.unit,
                added_by="donor",
            )
            for item in items
        ]
        repo.log_event(donation, from_status="REGISTERED", to_status="REGISTERED",
                       note="El donante actualizó los renglones")
        repo.commit()
        return donation

    def cancel(self, token: str) -> Donation:
        donation = self._editable(token)
        repo = DonationRepository(self.db)

        # Quien cancela retira su donación entera. Dejar las fotos en R2 sería
        # conservar el dato personal justo donde nadie irá a buscarlo.
        for photo in list(donation.photos):
            try:
                delete_object(photo.storage_key)
            except Exception:                   # noqa: BLE001
                logger.warning("No se pudo borrar la foto %s de R2", photo.storage_key)
            self.db.delete(photo)

        donation.status = "CANCELLED"
        donation.manage_token_hash = None   # el enlace deja de servir
        repo.log_event(donation, from_status="REGISTERED", to_status="CANCELLED",
                       note="Cancelada por el donante")
        repo.commit()
        return donation

    # ── Ficha pública del QR ─────────────────────────────────────────────────

    def get_public(self, code: str) -> Donation:
        """Ficha mínima del QR.

        Una donación sin confirmar responde igual que una inexistente: si no
        respondieran igual, probar códigos revelaría cuáles existen.
        """
        donation = DonationRepository(self.db).find_by_code(code)
        if donation is None or donation.status in ("PENDING_EMAIL", "EXPIRED", "CANCELLED"):
            raise api_error("NOT_FOUND", "Donación no encontrada", status_code=404)
        return donation

    # ── Recepción en el centro ───────────────────────────────────────────────

    def receive(
        self,
        code: str,
        results: dict,
        extras: list,
        center_id,
        user_id,
        background_tasks: BackgroundTasks | None = None,
    ) -> Donation:
        """Doble check del centro: confirma lo que llegó y registra la merma.

        `resultados` solo lleva las **excepciones** (id de renglón → estado). Lo
        que no viene marcado se da por recibido: el formulario optimiza para el
        caso normal, que es que todo llegue.

        El centro que recibe puede no ser el que eligió el donante — aquel era
        intención, este es el hecho.
        """
        repo = DonationRepository(self.db)
        donation = repo.find_by_code(code)

        if donation is None or donation.status not in ("REGISTERED",):
            raise api_error(
                "NOT_RECEIVABLE",
                "Esta donación no está lista para recibirse",
                status_code=409 if donation is not None else 404,
            )

        invalid = set(results.values()) - set(_RECEPTION_STATES)
        if invalid:
            raise api_error(
                "INVALID_RECEPTION_STATUS",
                f"Estado de recepción inválido: {', '.join(sorted(invalid))}",
                field="reception_status",
            )

        for item in donation.items:
            item.reception_status = results.get(str(item.id), "RECEIVED")

        for extra in extras:
            donation.items.append(
                DonationItem(
                    donation_id=donation.id,
                    product_type_id=extra.product_type_id,
                    free_text=extra.free_text,
                    quantity=extra.quantity,
                    unit=extra.unit,
                    added_by="center",
                    reception_status="RECEIVED",
                )
            )

        donation.received_center_id = center_id
        donation.received_at = datetime.now(timezone.utc)
        donation.status = "RECEIVED"
        donation.manage_token_hash = None   # el enlace del donante deja de servir

        repo.log_event(
            donation,
            from_status="REGISTERED",
            to_status="RECEIVED",
            user_id=user_id,
            note=f"Recibida con {len(extras)} renglón(es) agregado(s) por el centro"
            if extras else None,
        )
        repo.commit()

        self._notify_reception(donation, background_tasks)
        return donation

    def _notify_reception(self, donation: Donation, background_tasks) -> None:
        """Resumen del doble check. Sin correo no hay a quién avisar: un donante
        capturado en ventanilla puede no haberlo dado."""
        email = getattr(donation.donor, "email", None)
        if background_tasks is None or not email:
            return

        center = self.db.get(Center, donation.received_center_id)
        rows = [
            {
                "label": item.free_text or "",
                "status": _RECEPTION_LABEL.get(item.reception_status, item.reception_status),
            }
            for item in donation.items
        ]
        enqueue(
            background_tasks,
            "send_donation_received_email_task",
            email,
            donation.code,
            getattr(center, "name", ""),
            rows,
        )
