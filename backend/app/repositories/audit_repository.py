import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select, and_
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


class AuditRepository:
    def __init__(self, db: Session):
        self._db = db

    def log(
        self,
        action: str,
        entity_type: str,
        *,
        user_id: uuid.UUID | None = None,
        entity_id: str | None = None,
        extra: dict[str, Any] | None = None,
        ip: str | None = None,
    ) -> None:
        entry = AuditLog(
            id=uuid.uuid4(),
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            extra=extra,
            ip=ip,
        )
        self._db.add(entry)
        self._db.flush()

    def list(
        self,
        *,
        entity_type: str | None = None,
        user_id: uuid.UUID | None = None,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[AuditLog], int]:
        conditions = []
        if entity_type:
            conditions.append(AuditLog.entity_type == entity_type)
        if user_id:
            conditions.append(AuditLog.user_id == user_id)
        if from_date:
            conditions.append(AuditLog.created_at >= from_date)
        if to_date:
            conditions.append(AuditLog.created_at <= to_date)

        base = select(AuditLog)
        if conditions:
            base = base.where(and_(*conditions))

        total = self._db.execute(
            base.with_only_columns(func.count(AuditLog.id))
        ).scalar() or 0
        rows = list(
            self._db.execute(
                base.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
            ).scalars().all()
        )
        return rows, total

    def purge_older_than(self, cutoff: datetime) -> int:
        from sqlalchemy import delete
        result = self._db.execute(
            delete(AuditLog).where(AuditLog.created_at < cutoff)
        )
        self._db.flush()
        return result.rowcount
