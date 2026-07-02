"""ARQ worker task definitions and settings.

Each task is an async function receiving (ctx, *args, **kwargs); ``ctx`` is the
dict ARQ provides (pool, job_id, job_try, ...).

FALLBACKS maps each task name to the plain callable used when Redis is down and
the work runs in-process via FastAPI BackgroundTasks instead (see arq_pool.py).

Run the worker:
    cd backend && arq app.worker.WorkerSettings

To add a task:
    1. Write an async ``<name>_task(ctx, ...)`` here that does the work.
    2. Register it in WorkerSettings.functions.
    3. Map its name → the underlying callable in _build_fallbacks().
    4. Enqueue it from a service with:
           from app.arq_pool import enqueue
           enqueue(background_tasks, "<name>_task", *args)
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone

from arq.connections import RedisSettings
from arq.cron import cron

logger = logging.getLogger(__name__)


# ── Task definitions ───────────────────────────────────────────────────────────

async def notify_slack_task(ctx, text: str, channel: str) -> None:
    from app.utils.slack import notify_slack
    await notify_slack(text, channel)


async def send_verification_email_task(ctx, to: str, token: str) -> None:
    from app.email import send_verification_email
    await asyncio.to_thread(send_verification_email, to, token)


async def send_password_reset_email_task(ctx, to: str, token: str) -> None:
    from app.email import send_password_reset_email
    await asyncio.to_thread(send_password_reset_email, to, token)


async def send_request_reply_email_task(ctx, to: str, request_title: str, reply_body: str, request_url: str) -> None:
    from app.email import send_request_reply_email
    await asyncio.to_thread(send_request_reply_email, to, request_title, reply_body, request_url)


async def send_message_private_email_task(ctx, to: str, sender_name: str, title: str) -> None:
    from app.email import send_message_private_email
    await asyncio.to_thread(send_message_private_email, to, sender_name, title)


async def send_message_public_email_task(ctx, to: str, title: str, campaign_id: str) -> None:
    from app.email import send_message_public_email
    await asyncio.to_thread(send_message_public_email, to, title, campaign_id)


async def send_message_reply_email_task(ctx, to: str, thread_title: str, reply_preview: str, sender_name: str) -> None:
    from app.email import send_message_reply_email
    await asyncio.to_thread(send_message_reply_email, to, thread_title, reply_preview, sender_name)


async def send_transfer_created_email_task(ctx, to: str, from_center: str, to_center: str) -> None:
    from app.email import send_transfer_created_email
    await asyncio.to_thread(send_transfer_created_email, to, from_center, to_center)


async def send_transfer_status_email_task(
    ctx, to: str, status: str, from_center: str, to_center: str, reason: str | None = None
) -> None:
    from app.email import send_transfer_status_email
    await asyncio.to_thread(send_transfer_status_email, to, status, from_center, to_center, reason)


async def send_transfer_received_email_task(ctx, to: str, from_center: str, to_center: str) -> None:
    from app.email import send_transfer_received_email
    await asyncio.to_thread(send_transfer_received_email, to, from_center, to_center)


async def send_password_changed_email_task(ctx, to: str) -> None:
    from app.email import send_password_changed_email
    await asyncio.to_thread(send_password_changed_email, to)


async def purge_attachments_cron(ctx) -> None:
    from app.database import SessionLocal
    from app.services.thread_service import ThreadService
    with SessionLocal() as db:
        count = ThreadService.purge_expired(db)
    logger.info("Attachment purge: deleted %d expired attachments", count)


async def purge_audit_logs_cron(ctx) -> None:
    retention_days = int(os.environ.get("AUDIT_RETENTION_DAYS", "90"))
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=retention_days)
    from app.database import SessionLocal
    from app.repositories.audit_repository import AuditRepository
    with SessionLocal() as db:
        deleted = AuditRepository(db).purge_older_than(cutoff)
        db.commit()
    logger.info("Audit log purge: deleted %d rows older than %s days", deleted, retention_days)


# ── Fallbacks (called directly when Redis is unavailable) ──────────────────────
# These are the underlying callables, invoked WITHOUT the ARQ ctx argument.

def _build_fallbacks() -> dict:
    from app.utils.slack import notify_slack
    from app.email import (
        send_verification_email,
        send_password_reset_email,
        send_request_reply_email,
        send_message_private_email,
        send_message_public_email,
        send_message_reply_email,
        send_transfer_created_email,
        send_transfer_status_email,
        send_transfer_received_email,
        send_password_changed_email,
    )

    return {
        "notify_slack_task": notify_slack,
        "send_verification_email_task": send_verification_email,
        "send_password_reset_email_task": send_password_reset_email,
        "send_request_reply_email_task": send_request_reply_email,
        "send_message_private_email_task": send_message_private_email,
        "send_message_public_email_task": send_message_public_email,
        "send_message_reply_email_task": send_message_reply_email,
        "send_transfer_created_email_task": send_transfer_created_email,
        "send_transfer_status_email_task": send_transfer_status_email,
        "send_transfer_received_email_task": send_transfer_received_email,
        "send_password_changed_email_task": send_password_changed_email,
    }


_fallbacks_cache: dict | None = None


class _LazyFallbacks:
    """Builds the fallback registry on first access to avoid import-time side effects."""

    def get(self, key: str, default=None):
        global _fallbacks_cache
        if _fallbacks_cache is None:
            _fallbacks_cache = _build_fallbacks()
        return _fallbacks_cache.get(key, default)


FALLBACKS = _LazyFallbacks()


# ── Worker settings ────────────────────────────────────────────────────────────

class WorkerSettings:
    functions = [
        notify_slack_task,
        send_verification_email_task,
        send_password_reset_email_task,
        send_request_reply_email_task,
        send_message_private_email_task,
        send_message_public_email_task,
        send_message_reply_email_task,
        send_transfer_created_email_task,
        send_transfer_status_email_task,
        send_transfer_received_email_task,
        send_password_changed_email_task,
    ]
    cron_jobs = [
        cron(purge_audit_logs_cron, hour=3, minute=0),
        cron(purge_attachments_cron, hour=4, minute=0),
    ]
    redis_settings = RedisSettings.from_dsn(os.environ.get("REDIS_URL", "redis://localhost:6379"))
    max_jobs = 10
    job_timeout = 60
    keep_result = 3600
    retry_jobs = True
    max_tries = 3
