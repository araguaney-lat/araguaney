"""Purga del pre-registro de donaciones (Fase 18, task 11).

Tres barridos, en este orden:

1. Las no confirmadas que ya pasaron su plazo vencen (`PENDING_EMAIL` → `EXPIRED`).
2. Quien las escribió pierde su PII, salvo que tenga otra donación viva o entregada.
3. Los enlaces de gestión vencidos se borran de la base.

La fila de la donación vencida sobrevive: sirve para medir cuánta gente empieza
el formulario y no lo termina, y ya no identifica a nadie. Lo que se va es el
dato personal, que es lo que la LFPDPPP obliga a suprimir cuando deja de ser
necesario para la finalidad que lo originó.
"""

import logging
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.donation import Donation, DonationEvent
from app.models.donor import Donor
from app.utils.r2 import delete_object

logger = logging.getLogger(__name__)

# Plazo por default. Vive en env porque es una promesa publicada en el aviso de
# privacidad, no una constante de implementación: cambiarla cambia el aviso.
_DEFAULT_RETENTION_DAYS = 7

# Estados que justifican conservar la PII del donante: una donación por entregar
# o ya entregada. Lo vencido y lo cancelado no sostienen ninguna finalidad.
_LIVE_STATUSES = ("PENDING_EMAIL", "REGISTERED", "RECEIVED")


def _retention_days() -> int:
    try:
        return int(os.environ.get("DONATION_PENDING_RETENTION_DAYS", _DEFAULT_RETENTION_DAYS))
    except ValueError:
        return _DEFAULT_RETENTION_DAYS


def _delete_photos(donation: Donation) -> None:
    """Las fotos se van con la donación que vence.

    Conservar el objeto en R2 después de purgar la fila sería guardar el dato
    personal justo donde nadie va a ir a buscarlo. Un fallo del almacenamiento no
    detiene la purga: la fila igual deja de existir.
    """
    for photo in list(donation.photos):
        try:
            delete_object(photo.storage_key)
        except Exception:                       # noqa: BLE001
            logger.warning("No se pudo borrar la foto %s de R2", photo.storage_key)


def _aware(valor: datetime | None) -> datetime | None:
    """SQLite devuelve datetimes sin zona; Postgres con ella."""
    if valor is None or valor.tzinfo is not None:
        return valor
    return valor.replace(tzinfo=timezone.utc)


class DonationPurgeService:
    """Sin estado: la llama el cron con su propia sesión."""

    @staticmethod
    def purge(db: Session) -> dict[str, int]:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=_retention_days())

        expired = DonationPurgeService._expire_unconfirmed(db, cutoff)
        donors = DonationPurgeService._purge_donors({d.donor_id for d in expired}, db)
        links = DonationPurgeService._clear_expired_links(db, now)

        db.commit()
        return {
            "vencidas": len(expired),
            "donantes_purgados": donors,
            "enlaces_vencidos": links,
        }

    @staticmethod
    def _expire_unconfirmed(db: Session, cutoff: datetime) -> list[Donation]:
        candidates = db.execute(
            select(Donation).where(Donation.status == "PENDING_EMAIL")
        ).scalars().all()

        # El reloj es el último correo de confirmación enviado; `created_at` solo
        # respalda a las filas anteriores a que existiera esa columna.
        def _clock(d):
            return _aware(d.confirmation_sent_at) or _aware(d.created_at) or cutoff

        expired = [d for d in candidates if _clock(d) < cutoff]
        for donation in expired:
            _delete_photos(donation)
            donation.status = "EXPIRED"
            donation.manage_token_hash = None
            donation.manage_token_expires_at = None
            db.add(DonationEvent(
                donation_id=donation.id,
                user_id=None,               # la hizo el sistema, no una persona
                from_status="PENDING_EMAIL",
                to_status="EXPIRED",
                note="Vencida sin confirmar el correo",
            ))
        return expired

    @staticmethod
    def _purge_donors(donor_ids: set, db: Session) -> int:
        """Quita la PII de quien ya no tiene ninguna donación que la justifique.

        Solo aplica al autoservicio: la cartera capturada por un centro es del
        centro, y darla de baja es una decisión suya, no de este job.
        """
        purged = 0
        for donor_id in donor_ids:
            donor = db.get(Donor, donor_id)
            if donor is None or donor.source != "self":
                continue

            has_live = db.execute(
                select(Donation.id)
                .where(Donation.donor_id == donor_id, Donation.status.in_(_LIVE_STATUSES))
                .limit(1)
            ).first() is not None
            if has_live:
                continue

            donor.email = None
            donor.phone = None
            donor.email_verified_at = None
            donor.email_verify_token_hash = None
            # `first_name`/`last_name` son NOT NULL: se vacían en vez de borrarse.
            donor.first_name = ""
            donor.last_name = ""
            donor.legal_name = None
            purged += 1
        return purged

    @staticmethod
    def _clear_expired_links(db: Session, now: datetime) -> int:
        """El hash de un enlace vencido ya no sirve para nada: no hay razón para guardarlo."""
        candidates = db.execute(
            select(Donation).where(Donation.manage_token_hash.is_not(None))
        ).scalars().all()

        deleted = 0
        for donation in candidates:
            expires_at = _aware(donation.manage_token_expires_at)
            if expires_at is not None and expires_at > now:
                continue
            donation.manage_token_hash = None
            donation.manage_token_expires_at = None
            deleted += 1
        return deleted
