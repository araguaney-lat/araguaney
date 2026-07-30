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

logger = logging.getLogger(__name__)

# Plazo por default. Vive en env porque es una promesa publicada en el aviso de
# privacidad, no una constante de implementación: cambiarla cambia el aviso.
_DEFAULT_RETENTION_DAYS = 7

# Estados que justifican conservar la PII del donante: una donación por entregar
# o ya entregada. Lo vencido y lo cancelado no sostienen ninguna finalidad.
_ESTADOS_VIVOS = ("PENDING_EMAIL", "REGISTERED", "RECEIVED")


def _retention_days() -> int:
    try:
        return int(os.environ.get("DONATION_PENDING_RETENTION_DAYS", _DEFAULT_RETENTION_DAYS))
    except ValueError:
        return _DEFAULT_RETENTION_DAYS


def _aware(valor: datetime | None) -> datetime | None:
    """SQLite devuelve datetimes sin zona; Postgres con ella."""
    if valor is None or valor.tzinfo is not None:
        return valor
    return valor.replace(tzinfo=timezone.utc)


class DonationPurgeService:
    """Sin estado: la llama el cron con su propia sesión."""

    @staticmethod
    def purge(db: Session) -> dict[str, int]:
        ahora = datetime.now(timezone.utc)
        corte = ahora - timedelta(days=_retention_days())

        vencidas = DonationPurgeService._vencer_no_confirmadas(db, corte)
        donantes = DonationPurgeService._purgar_donantes({d.donor_id for d in vencidas}, db)
        enlaces = DonationPurgeService._borrar_enlaces_vencidos(db, ahora)

        db.commit()
        return {
            "vencidas": len(vencidas),
            "donantes_purgados": donantes,
            "enlaces_vencidos": enlaces,
        }

    @staticmethod
    def _vencer_no_confirmadas(db: Session, corte: datetime) -> list[Donation]:
        candidatas = db.execute(
            select(Donation).where(Donation.status == "PENDING_EMAIL")
        ).scalars().all()

        vencidas = [d for d in candidatas if (_aware(d.created_at) or corte) < corte]
        for donation in vencidas:
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
        return vencidas

    @staticmethod
    def _purgar_donantes(donor_ids: set, db: Session) -> int:
        """Quita la PII de quien ya no tiene ninguna donación que la justifique.

        Solo aplica al autoservicio: la cartera capturada por un centro es del
        centro, y darla de baja es una decisión suya, no de este job.
        """
        purgados = 0
        for donor_id in donor_ids:
            donor = db.get(Donor, donor_id)
            if donor is None or donor.source != "self":
                continue

            tiene_vivas = db.execute(
                select(Donation.id)
                .where(Donation.donor_id == donor_id, Donation.status.in_(_ESTADOS_VIVOS))
                .limit(1)
            ).first() is not None
            if tiene_vivas:
                continue

            donor.email = None
            donor.phone = None
            donor.email_verified_at = None
            donor.email_verify_token_hash = None
            # `first_name`/`last_name` son NOT NULL: se vacían en vez de borrarse.
            donor.first_name = ""
            donor.last_name = ""
            donor.legal_name = None
            purgados += 1
        return purgados

    @staticmethod
    def _borrar_enlaces_vencidos(db: Session, ahora: datetime) -> int:
        """El hash de un enlace vencido ya no sirve para nada: no hay razón para guardarlo."""
        candidatas = db.execute(
            select(Donation).where(Donation.manage_token_hash.is_not(None))
        ).scalars().all()

        borrados = 0
        for donation in candidatas:
            expira = _aware(donation.manage_token_expires_at)
            if expira is not None and expira > ahora:
                continue
            donation.manage_token_hash = None
            donation.manage_token_expires_at = None
            borrados += 1
        return borrados
