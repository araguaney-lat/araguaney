from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.donation import Donation, DonationEvent
from app.models.donor import Donor
from app.repositories.base import BaseRepository

_ABIERTAS = ("PENDING_EMAIL", "REGISTERED")


class DonationRepository(BaseRepository):
    """Acceso a donaciones pre-registradas.

    Las búsquedas por token filtran por el **hash**: el token en claro nunca se
    guarda ni se compara contra la base.
    """

    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def save(self, donation: Donation) -> Donation:
        self.db.add(donation)
        self.db.flush()
        return donation

    def find_open_for_email(self, email: str) -> Donation | None:
        """La donación abierta de este correo, si la hay.

        Evita que el formulario público acumule donaciones abiertas del mismo
        correo. Devuelve la fila, no un booleano, porque quien sí es dueño del
        correo necesita que se le reenvíe su confirmación.
        """
        return self.db.execute(
            select(Donation)
            .join(Donor, Donor.id == Donation.donor_id)
            .where(Donor.email == email, Donation.status.in_(_ABIERTAS))
            .order_by(Donation.created_at.desc())
            .limit(1)
        ).scalars().first()

    def find_pending_by_email(self, email: str) -> Donation | None:
        """La donación sin confirmar de este correo. La más reciente, si hay varias."""
        return self.db.execute(
            select(Donation)
            .join(Donor, Donor.id == Donation.donor_id)
            .where(Donor.email == email, Donation.status == "PENDING_EMAIL")
            .order_by(Donation.created_at.desc())
            .limit(1)
        ).scalars().first()

    def find_by_verify_token_hash(self, token_hash: str) -> Donation | None:
        return self.db.execute(
            select(Donation)
            .join(Donor, Donor.id == Donation.donor_id)
            .where(Donor.email_verify_token_hash == token_hash)
        ).scalar_one_or_none()

    def find_by_manage_token_hash(self, token_hash: str) -> Donation | None:
        return self.db.execute(
            select(Donation).where(Donation.manage_token_hash == token_hash)
        ).scalar_one_or_none()

    def find_by_code(self, code: str) -> Donation | None:
        return self.db.execute(
            select(Donation).where(Donation.code == code)
        ).scalar_one_or_none()

    def find_donations_for_shipment(self, shipment_id: UUID) -> list[Donation]:
        """Donaciones pre-registradas cuya carga va en este envío.

        El camino es donación → intake → cajas → tarima → envío. Solo las que
        dejaron un correo: al resto no hay a quién avisarle.
        """
        from app.models.box import Box
        from app.models.pallet import Pallet

        return list(self.db.execute(
            select(Donation)
            .join(Donor, Donor.id == Donation.donor_id)
            .join(Box, Box.intake_id == Donation.intake_id)
            .join(Pallet, Pallet.id == Box.pallet_id)
            .where(
                Pallet.shipment_id == shipment_id,
                Donation.intake_id.is_not(None),
                Donor.email.is_not(None),
            )
            .distinct()
        ).scalars().all())

    def log_event(
        self,
        donation: Donation,
        to_status: str,
        from_status: str | None = None,
        user_id: UUID | None = None,
        note: str | None = None,
    ) -> None:
        """Toda transición deja rastro. `user_id` nulo = la hizo el donante."""
        self.db.add(
            DonationEvent(
                donation_id=donation.id,
                user_id=user_id,
                from_status=from_status,
                to_status=to_status,
                note=note,
            )
        )

    def commit(self) -> None:
        self.db.commit()

    def list_for_center(self, center_id, incoming: bool = False) -> list[Donation]:
        """Donaciones de un centro: las recibidas, o las que vienen en camino.

        `center_id=None` solo para national_admin, que ve todos los centros.
        """
        if incoming:
            stmt = select(Donation).where(Donation.status == "REGISTERED")
            if center_id is not None:
                stmt = stmt.where(Donation.intended_center_id == center_id)
        else:
            stmt = select(Donation).where(Donation.status == "RECEIVED")
            if center_id is not None:
                stmt = stmt.where(Donation.received_center_id == center_id)
        return list(self.db.execute(stmt.order_by(Donation.created_at.desc()).limit(200)).scalars().all())
