"""
Fire-and-forget audit logging via FastAPI BackgroundTasks.

Usage in a router:
    from fastapi import BackgroundTasks
    from app.utils.audit import fire_audit

    def my_endpoint(background_tasks: BackgroundTasks, ...):
        result = service.do_something()
        fire_audit(background_tasks, "THING_DONE", "thing",
                   user_id=current_user.id, entity_id=str(result.id), ip=get_client_ip(request))
        return result
"""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import BackgroundTasks


def fire_audit(
    background_tasks: BackgroundTasks,
    action: str,
    entity_type: str,
    *,
    user_id: uuid.UUID | None = None,
    entity_id: str | None = None,
    extra: dict[str, Any] | None = None,
    ip: str | None = None,
) -> None:
    def _write() -> None:
        from app.database import SessionLocal
        from app.repositories.audit_repository import AuditRepository
        with SessionLocal() as db:
            AuditRepository(db).log(
                action, entity_type,
                user_id=user_id,
                entity_id=entity_id,
                extra=extra,
                ip=ip,
            )
            db.commit()

    background_tasks.add_task(_write)
