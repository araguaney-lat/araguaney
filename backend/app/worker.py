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
from arq.worker import func

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


async def send_invitation_email_task(ctx, to: str, username: str, temp_password: str) -> None:
    from app.email import send_invitation_email
    await asyncio.to_thread(send_invitation_email, to, username, temp_password)


async def send_donation_confirmation_email_task(ctx, to: str, first_name: str, token: str) -> None:
    from app.email import send_donation_confirmation_email
    await asyncio.to_thread(send_donation_confirmation_email, to, first_name, token)


async def send_donation_registered_email_task(ctx, to: str, code: str, manage_token: str) -> None:
    from app.email import send_donation_registered_email
    await asyncio.to_thread(send_donation_registered_email, to, code, manage_token)


async def send_donation_received_email_task(ctx, to: str, code: str, center_name: str, items: list) -> None:
    from app.email import send_donation_received_email
    await asyncio.to_thread(send_donation_received_email, to, code, center_name, items)


async def send_donation_shipped_email_task(ctx, to: str, code: str, shipment_reference: str) -> None:
    from app.email import send_donation_shipped_email
    await asyncio.to_thread(send_donation_shipped_email, to, code, shipment_reference)


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


async def send_center_application_confirm_email_task(ctx, to: str, token: str) -> None:
    from app.email import send_center_application_confirm_email
    await asyncio.to_thread(send_center_application_confirm_email, to, token)


async def send_center_application_received_email_task(ctx, to: str, center_name: str) -> None:
    from app.email import send_center_application_received_email
    await asyncio.to_thread(send_center_application_received_email, to, center_name)


async def send_center_application_rejected_email_task(ctx, to: str, center_name: str, reason: str) -> None:
    from app.email import send_center_application_rejected_email
    await asyncio.to_thread(send_center_application_rejected_email, to, center_name, reason)


def _send_admin_notice(application_id: str) -> None:
    """Load the application, resolve its reviewers, and email each one."""
    from uuid import UUID

    from app.database import SessionLocal
    from app.email import send_center_application_admin_notice_email
    from app.models.center_application import CenterApplication
    from app.repositories.user_repository import UserRepository

    with SessionLocal() as db:
        application = db.get(CenterApplication, UUID(application_id))
        if application is None:
            return
        center_name = application.center_name
        country_code = application.country_code
        recipients = UserRepository(db).find_review_recipients(country_code)
    for email in recipients:
        send_center_application_admin_notice_email(email, center_name, country_code)


async def send_center_application_admin_notice_task(ctx, application_id: str) -> None:
    await asyncio.to_thread(_send_admin_notice, application_id)


async def submit_indexnow_task(ctx, path: str) -> None:
    from app.utils.indexnow import submit_url
    await submit_url(path)


async def generate_shipment_manifest_pdf_task(ctx, job_id: str) -> None:
    from app.services.export_generation import run_export_job
    await asyncio.to_thread(run_export_job, job_id)


async def generate_shipment_manifest_xlsx_task(ctx, job_id: str) -> None:
    from app.services.export_generation import run_export_job
    await asyncio.to_thread(run_export_job, job_id)


async def generate_box_labels_pdf_task(ctx, job_id: str) -> None:
    from app.services.export_generation import run_export_job
    await asyncio.to_thread(run_export_job, job_id)


async def generate_pallet_label_pdf_task(ctx, job_id: str) -> None:
    from app.services.export_generation import run_export_job
    await asyncio.to_thread(run_export_job, job_id)


async def generate_transfer_manifest_pdf_task(ctx, job_id: str) -> None:
    from app.services.export_generation import run_export_job
    await asyncio.to_thread(run_export_job, job_id)


async def generate_shipment_declaration_xlsx_task(ctx, job_id: str) -> None:
    from app.services.export_generation import run_export_job
    await asyncio.to_thread(run_export_job, job_id)


async def generate_shipment_declaration_json_task(ctx, job_id: str) -> None:
    from app.services.export_generation import run_export_job
    await asyncio.to_thread(run_export_job, job_id)


async def generate_report_export_csv_task(ctx, job_id: str) -> None:
    from app.services.export_generation import run_export_job
    await asyncio.to_thread(run_export_job, job_id)


async def purge_attachments_cron(ctx) -> None:
    from app.database import SessionLocal
    from app.services.thread_service import ThreadService
    with SessionLocal() as db:
        count = ThreadService.purge_expired(db)
    logger.info("Attachment purge: deleted %d expired attachments", count)


async def purge_export_jobs_cron(ctx) -> None:
    from app.database import SessionLocal
    from app.repositories.export_job_repository import ExportJobRepository
    from app.utils.r2 import delete_object

    with SessionLocal() as db:
        repo = ExportJobRepository(db)
        expired = repo.purge_expired(datetime.now(tz=timezone.utc))
        count = 0
        for job in expired:
            if job.r2_key:
                delete_object(job.r2_key)
            repo.delete(job.id)
            count += 1
    logger.info("Export job purge: deleted %d expired jobs", count)


async def purge_audit_logs_cron(ctx) -> None:
    retention_days = int(os.environ.get("AUDIT_RETENTION_DAYS", "90"))
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=retention_days)
    from app.database import SessionLocal
    from app.repositories.audit_repository import AuditRepository
    with SessionLocal() as db:
        deleted = AuditRepository(db).purge_older_than(cutoff)
        db.commit()
    logger.info("Audit log purge: deleted %d rows older than %s days", deleted, retention_days)


async def purge_donations_cron(ctx) -> None:
    from app.database import SessionLocal
    from app.services.donation_purge_service import DonationPurgeService
    with SessionLocal() as db:
        r = DonationPurgeService.purge(db)
    logger.info(
        "Donation purge: %d expired, %d donors stripped of PII, %d stale manage links cleared",
        r["vencidas"], r["donantes_purgados"], r["enlaces_vencidos"],
    )


async def purge_email_failures_cron(ctx) -> None:
    from app.database import SessionLocal
    from app.repositories.email_failure_repository import EmailFailureRepository
    with SessionLocal() as db:
        deleted = EmailFailureRepository(db).purge_older_than(90)
    logger.info("Email failure purge: deleted %d rows older than 90 days", deleted)


# ── Fallbacks (called directly when Redis is unavailable) ──────────────────────
# These are the underlying callables, invoked WITHOUT the ARQ ctx argument.

def _build_fallbacks() -> dict:
    from app.utils.slack import notify_slack
    from app.email import (
        send_verification_email,
        send_password_reset_email,
        send_invitation_email,
        send_request_reply_email,
        send_message_private_email,
        send_message_public_email,
        send_message_reply_email,
        send_transfer_created_email,
        send_transfer_status_email,
        send_transfer_received_email,
        send_password_changed_email,
        send_center_application_confirm_email,
        send_center_application_received_email,
        send_center_application_rejected_email,
        send_donation_confirmation_email,
        send_donation_registered_email,
        send_donation_received_email,
        send_donation_shipped_email,
    )
    from app.services.export_generation import run_export_job
    from app.utils.indexnow import submit_url

    return {
        "notify_slack_task": notify_slack,
        "submit_indexnow_task": submit_url,
        "send_verification_email_task": send_verification_email,
        "send_password_reset_email_task": send_password_reset_email,
        "send_invitation_email_task": send_invitation_email,
        "send_donation_confirmation_email_task": send_donation_confirmation_email,
        "send_donation_registered_email_task": send_donation_registered_email,
        "send_donation_received_email_task": send_donation_received_email,
        "send_donation_shipped_email_task": send_donation_shipped_email,
        "send_request_reply_email_task": send_request_reply_email,
        "send_message_private_email_task": send_message_private_email,
        "send_message_public_email_task": send_message_public_email,
        "send_message_reply_email_task": send_message_reply_email,
        "send_transfer_created_email_task": send_transfer_created_email,
        "send_transfer_status_email_task": send_transfer_status_email,
        "send_transfer_received_email_task": send_transfer_received_email,
        "send_password_changed_email_task": send_password_changed_email,
        "send_center_application_confirm_email_task": send_center_application_confirm_email,
        "send_center_application_received_email_task": send_center_application_received_email,
        "send_center_application_rejected_email_task": send_center_application_rejected_email,
        "send_center_application_admin_notice_task": _send_admin_notice,
        "generate_shipment_manifest_pdf_task": run_export_job,
        "generate_shipment_manifest_xlsx_task": run_export_job,
        "generate_box_labels_pdf_task": run_export_job,
        "generate_pallet_label_pdf_task": run_export_job,
        "generate_transfer_manifest_pdf_task": run_export_job,
        "generate_report_export_csv_task": run_export_job,
        "generate_shipment_declaration_xlsx_task": run_export_job,
        "generate_shipment_declaration_json_task": run_export_job,
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
        submit_indexnow_task,
        send_verification_email_task,
        send_password_reset_email_task,
        send_invitation_email_task,
        send_donation_confirmation_email_task,
        send_donation_registered_email_task,
        send_donation_received_email_task,
        send_donation_shipped_email_task,
        send_request_reply_email_task,
        send_message_private_email_task,
        send_message_public_email_task,
        send_message_reply_email_task,
        send_transfer_created_email_task,
        send_transfer_status_email_task,
        send_transfer_received_email_task,
        send_password_changed_email_task,
        send_center_application_confirm_email_task,
        send_center_application_received_email_task,
        send_center_application_rejected_email_task,
        send_center_application_admin_notice_task,
        # Export jobs get a longer per-task timeout than the global 60s: PDF/XLSX
        # generation for a shipment with many pallets (DB queries + reportlab/WeasyPrint
        # + R2 upload, all in one job) can plausibly exceed 60s where an email send can't.
        func(generate_shipment_manifest_pdf_task, timeout=300),
        func(generate_shipment_manifest_xlsx_task, timeout=300),
        func(generate_box_labels_pdf_task, timeout=300),
        func(generate_pallet_label_pdf_task, timeout=300),
        func(generate_transfer_manifest_pdf_task, timeout=300),
        func(generate_report_export_csv_task, timeout=300),
        func(generate_shipment_declaration_xlsx_task, timeout=300),
        func(generate_shipment_declaration_json_task, timeout=300),
    ]
    cron_jobs = [
        cron(purge_audit_logs_cron, hour=3, minute=0),
        cron(purge_attachments_cron, hour=4, minute=0),
        cron(purge_email_failures_cron, hour=4, minute=30),
        cron(purge_donations_cron, hour=5, minute=0),
        # Export jobs expire 1h after DONE (see ExportJobRepository.DOWNLOAD_TTL_SECONDS) —
        # runs hourly, not daily like the other purges, to keep R2/db lean on that timescale.
        cron(purge_export_jobs_cron, minute=15),
    ]
    redis_settings = RedisSettings.from_dsn(os.environ.get("REDIS_URL", "redis://localhost:6379"))
    max_jobs = 10
    job_timeout = 60
    keep_result = 3600
    retry_jobs = True
    max_tries = 3
