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

    def has_open_for_email(self, email: str) -> bool:
        """Evita que un formulario público acumule donaciones abiertas del mismo correo."""
        return self.db.execute(
            select(Donation.id)
            .join(Donor, Donor.id == Donation.donor_id)
            .where(Donor.email == email, Donation.status.in_(_ABIERTAS))
            .limit(1)
        ).first() is not None

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
