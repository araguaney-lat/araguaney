from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select

from app.models.email_failure import EmailFailure
from app.repositories.base import BaseRepository


class EmailFailureRepository(BaseRepository[EmailFailure]):
    """Platform-wide (not tenant-scoped): only superadmins read this."""

    def get(self, failure_id: UUID) -> EmailFailure | None:
        return self.db.get(EmailFailure, failure_id)

    def get_by_svix_id(self, svix_id: str) -> EmailFailure | None:
        return (
            self.db.execute(select(EmailFailure).where(EmailFailure.svix_id == svix_id))
            .scalars()
            .first()
        )

    def save(self, failure: EmailFailure) -> EmailFailure:
        self.db.add(failure)
        self.db.commit()
        self.db.refresh(failure)
        return failure

    def mark_resolved(self, resend_email_id: str, when: datetime) -> int:
        """Resolve any open failures for a Resend email id (e.g. a later
        `delivered` event). Returns the number updated."""
        rows = (
            self.db.execute(
                select(EmailFailure).where(
                    EmailFailure.resend_email_id == resend_email_id,
                    EmailFailure.resolved_at.is_(None),
                )
            )
            .scalars()
            .all()
        )
        for row in rows:
            row.resolved_at = when
        if rows:
            self.db.commit()
        return len(rows)

    def list_recent(self, limit: int = 100, event_type: str | None = None) -> list[EmailFailure]:
        stmt = select(EmailFailure)
        if event_type is not None:
            stmt = stmt.where(EmailFailure.event_type == event_type)
        stmt = stmt.order_by(EmailFailure.created_at.desc()).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def count_unresolved_by_domain_since(self, cutoff: datetime) -> dict[str, int]:
        """Rebotes sin resolver desde `cutoff`, agrupados por dominio destino.

        Se agrupa por **dominio y no por dirección** a propósito: la señal que
        importa es "un proveedor nos está bloqueando", y el dominio la da entera
        sin mover una sola dirección de correo fuera de la base.
        """
        rows = (
            self.db.execute(
                select(EmailFailure.to_email).where(
                    EmailFailure.created_at >= cutoff,
                    EmailFailure.resolved_at.is_(None),
                )
            )
            .scalars()
            .all()
        )

        by_domain: dict[str, int] = {}
        for address in rows:
            domain = (address or "").rsplit("@", 1)[-1].strip().lower() or "desconocido"
            by_domain[domain] = by_domain.get(domain, 0) + 1
        return by_domain

    def purge_older_than(self, days: int) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        rows = (
            self.db.execute(select(EmailFailure).where(EmailFailure.created_at < cutoff))
            .scalars()
            .all()
        )
        for row in rows:
            self.db.delete(row)
        if rows:
            self.db.commit()
        return len(rows)

    def commit(self) -> None:
        self.db.commit()
