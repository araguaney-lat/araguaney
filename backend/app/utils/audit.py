"""Audit logging utilities.

## Two patterns — choose deliberately

### 1. Synchronous (preferred for critical state changes)

Use AuditRepository(db).log() + db.commit() in the same handler:

    from app.repositories.audit_repository import AuditRepository
    from app.utils.cloudflare import get_client_ip

    result = service.do_something(db, ...)
    AuditRepository(db).log("THING_DONE", "thing",
        user_id=current_user.id, entity_id=str(result.id), ip=get_client_ip(request))
    db.commit()
    return result

Guarantees: audit is written before the response is sent; failure is visible to
the caller (500 error). Required for irreversible state changes (seal, close, ship).

### 2. Fire-and-forget (for non-critical events where main commit already happened)

Use fire_audit() when the primary transaction has already committed and you want
best-effort logging without blocking the response:

    fire_audit(background_tasks, "THING_DONE", "thing",
               user_id=current_user.id, entity_id=str(result.id), ip=get_client_ip(request))

Trade-off: audit may be lost if the background task crashes. Acceptable for
informational events (e.g. INTAKE_CREATED, MESSAGE_SENT) where the main operation
already succeeded and audit loss is tolerable.

## Critical events → must use synchronous pattern
- BOX_SEALED (box.py)
- PALLET_CLOSED (pallet.py)
- SHIPMENT_CLOSED (shipment.py)
- SHIPMENT_SHIPPED (shipment.py)
- All privilege-escalating events in studio.py / users.py / auth.py / requests.py
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
