from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.center_application import CenterApplication
from app.repositories.base import BaseRepository

# Applications still in play (a new submission for the same email/center is a dup).
_OPEN_STATUSES = ("PENDING_EMAIL", "PENDING_REVIEW")


class CenterApplicationRepository(BaseRepository[CenterApplication]):

    def __init__(self, db: Session) -> None:
        super().__init__(db)
        self.model = CenterApplication

    def find_by_id(self, app_id: UUID) -> CenterApplication | None:
        return self.db.get(CenterApplication, app_id)

    def find_by_token_hash(self, token_hash: str) -> CenterApplication | None:
        stmt = select(CenterApplication).where(
            CenterApplication.email_verify_token_hash == token_hash
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def has_open_duplicate(self, email: str, center_name: str, country_code: str) -> bool:
        """True if an open application already exists for this email or center+country."""
        email_l = email.strip().lower()
        name_l = center_name.strip().lower()
        stmt = (
            select(CenterApplication.id)
            .where(CenterApplication.status.in_(_OPEN_STATUSES))
            .where(
                or_(
                    func.lower(CenterApplication.contact_email) == email_l,
                    (func.lower(CenterApplication.center_name) == name_l)
                    & (CenterApplication.country_code == country_code),
                )
            )
            .limit(1)
        )
        return self.db.execute(stmt).first() is not None

    def list_queue(self, country_code: str | None) -> list[CenterApplication]:
        """Review queue. country_code=None → superadmin sees all countries."""
        stmt = select(CenterApplication).where(
            CenterApplication.status == "PENDING_REVIEW"
        )
        if country_code is not None:
            stmt = stmt.where(CenterApplication.country_code == country_code)
        stmt = stmt.order_by(CenterApplication.created_at.asc())
        return list(self.db.execute(stmt).scalars().all())

    def count_pending(self, country_code: str | None) -> int:
        stmt = select(func.count(CenterApplication.id)).where(
            CenterApplication.status == "PENDING_REVIEW"
        )
        if country_code is not None:
            stmt = stmt.where(CenterApplication.country_code == country_code)
        return self.db.execute(stmt).scalar_one()

    def save(self, application: CenterApplication) -> CenterApplication:
        self.db.add(application)
        self.db.commit()
        self.db.refresh(application)
        return application

    def commit(self) -> None:
        self.db.commit()
