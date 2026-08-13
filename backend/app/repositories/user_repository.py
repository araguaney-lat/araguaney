from uuid import UUID

from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):

    def find_by_id(self, user_id: UUID) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def find_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def find_by_username(self, username: str) -> User | None:
        return self.db.query(User).filter(User.username == username).first()

    def find_by_verification_token(self, token: str) -> User | None:
        return self.db.query(User).filter(User.verification_token == token).first()

    def find_by_reset_token(self, token: str) -> User | None:
        return self.db.query(User).filter(User.reset_password_token == token).first()

    def find_active_by_identifier(self, identifier: str) -> User | None:
        """Find active user by email OR username."""
        return self.db.query(User).filter(
            (User.email == identifier) | (User.username == identifier)
        ).first()

    def find_review_recipients(self, country_code: str) -> list[str]:
        """Emails of who should be notified about a new center application in
        `country_code`: active national_admins of that country. If that country
        has no national_admin yet, fall back to active superadmins so nothing
        goes unreviewed."""
        admins = (
            self.db.query(User.email)
            .filter(
                User.is_active.is_(True),
                User.center_role == "national_admin",
                User.country_code == country_code,
            )
            .all()
        )
        if admins:
            return [e for (e,) in admins]
        supers = (
            self.db.query(User.email)
            .filter(User.is_active.is_(True), User.role == "superadmin")
            .all()
        )
        return [e for (e,) in supers]

    def coordinator_ids(self, center_id: UUID) -> list[UUID]:
        """Quién coordina ese centro, para avisarle de algo que le toca resolver.

        Solo coordinación, no voluntariado: las dos cosas que hoy generan aviso
        —una revisión de riesgo y un envío entregado— son suyas por el modelo de
        roles. Avisarle a quien captura de una revisión sería además invitarlo a
        intervenir en algo que la regla del dominio le prohíbe resolver.

        La administración nacional no entra aquí: no tiene centro, y sus avisos
        (si algún día los hay) se resuelven por otra vía.
        """
        rows = (
            self.db.query(User.id)
            .filter(
                User.is_active.is_(True),
                User.center_id == center_id,
                User.center_role == "coordinator",
            )
            .all()
        )
        return [row_id for (row_id,) in rows]

    def email_exists(self, email: str) -> bool:
        return self.db.query(User).filter(User.email == email).first() is not None

    def username_exists(self, username: str) -> bool:
        return self.db.query(User).filter(User.username == username).first() is not None

    def save(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def commit(self) -> None:
        self.db.commit()
