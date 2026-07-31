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
import functools
import logging
import os
from datetime import datetime, timedelta, timezone

from arq.connections import RedisSettings

from app.config import settings
from arq.cron import cron
from arq.worker import func

logger = logging.getLogger(__name__)

# El worker corre en su propio proceso: sin esto, sus excepciones no llegan a
# ningún dashboard y solo existen en el log de Railway. Sin DSN configurado,
# `init` no se llama y no se toca nada.
if settings.sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.sentry_environment,
        traces_sample_rate=0.1,
    )


# ── Alertas de fallo (Fase 24) ────────────────────────────────────────────────
#
# El handler de 500 cubre lo que revienta con alguien enfrente. Esto cubre lo
# otro: el trabajo de fondo, que corre de madrugada y sin nadie mirando.

MAX_TRIES = 3


def alert_on_final_failure(fn):
    """Avisa a Slack cuando una tarea de ARQ **se rinde**, y vuelve a levantar.

    Se alerta solo en el último intento a propósito. ARQ reintenta tres veces;
    avisar en cada fallo triplicaría el ruido de un timeout de red o un deploy a
    medias que se resuelve solo en el segundo intento. Lo que merece una alerta
    es lo que quedó sin hacerse.

    La excepción se vuelve a levantar siempre: la alerta observa, no interfiere
    con la lógica de reintento y abandono de ARQ.
    """

    @functools.wraps(fn)
    async def wrapper(ctx: dict, *args, **kwargs):
        try:
            return await fn(ctx, *args, **kwargs)
        except Exception as exc:
            # Un ctx incompleto no puede convertir cada fallo en una alerta.
            if (ctx or {}).get("job_try", 1) >= MAX_TRIES:
                await _alert(
                    f":rotating_light: *Tarea de fondo fallida* — `{fn.__name__}`\n"
                    f"Se agotaron los {MAX_TRIES} intentos y quedó sin hacerse.\n"
                    f"```{type(exc).__name__}: {str(exc)[:300]}```"
                )
            raise

    return wrapper


# Qué promete cada purga. La alerta dice qué se rompió, no qué excepción salió:
# "TimeoutError en purge_donations_cron" le sirve a quien escribió el cron; esto
# le sirve a quien lo lee a las tres de la mañana.
_PURGE_PROMISES = {
    "purge_donations_cron":
        "Los pre-registros de donación sin confirmar dejan de vencerse y los "
        "datos de quien donó dejan de purgarse. El aviso de privacidad declara "
        "un plazo para eso.",
    "purge_audit_logs_cron":
        "Los registros de auditoría dejan de purgarse. El aviso de privacidad "
        "declara un plazo de conservación para ellos.",
    "purge_attachments_cron":
        "Los adjuntos de mensajería dejan de eliminarse del almacenamiento. El "
        "aviso de privacidad declara un plazo para eso.",
    "purge_email_failures_cron":
        "Los registros de fallos de envío dejan de purgarse. El aviso de "
        "privacidad declara un plazo de conservación para ellos.",
    "purge_export_jobs_cron":
        "Los archivos de exportación dejan de eliminarse de R2 al vencer.",
}


def alert_on_cron_failure(fn):
    """Un cron que falla no se reintenta: se avisa y se sigue.

    Reintentar una purga podría ejecutarla dos veces, y algunas no son
    idempotentes en su efecto sobre el almacenamiento. Además, propagar dejaría
    el fallo sin destinatario — nadie está mirando a las cinco de la mañana.
    """

    @functools.wraps(fn)
    async def wrapper(ctx: dict, *args, **kwargs):
        try:
            resultado = await fn(ctx, *args, **kwargs)
        except Exception as exc:
            consecuencia = _PURGE_PROMISES.get(fn.__name__, "")
            logger.error("%s falló: %s", fn.__name__, exc)
            await _alert(
                f":rotating_light: *La purga no corrió* — `{fn.__name__}`\n"
                + (f"{consecuencia}\n" if consecuencia else "")
                + f"```{type(exc).__name__}: {str(exc)[:300]}```"
            )
            return None

        # El latido se anota al final y solo si todo salió bien: un cron que
        # falló no corrió, por más que se haya ejecutado.
        await asyncio.to_thread(_record_heartbeat, fn.__name__)
        return resultado

    return wrapper


def _record_heartbeat(name: str) -> None:
    from app.database import SessionLocal
    from app.services.cron_heartbeat import record_success

    with SessionLocal() as db:
        record_success(db, name)


async def _alert(mensaje: str) -> None:
    """Manda la alerta sin que un Slack caído se trague el error original."""
    try:
        from app.utils.slack import notify_slack

        await notify_slack(mensaje, settings.slack_alert_channel)
    except Exception:
        logger.exception("No se pudo publicar la alerta en Slack")


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


@alert_on_cron_failure
async def purge_attachments_cron(ctx) -> None:
    from app.database import SessionLocal
    from app.services.thread_service import ThreadService
    with SessionLocal() as db:
        count = ThreadService.purge_expired(db)
    logger.info("Attachment purge: deleted %d expired attachments", count)


@alert_on_cron_failure
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


@alert_on_cron_failure
async def purge_audit_logs_cron(ctx) -> None:
    retention_days = int(os.environ.get("AUDIT_RETENTION_DAYS", "90"))
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=retention_days)
    from app.database import SessionLocal
    from app.repositories.audit_repository import AuditRepository
    with SessionLocal() as db:
        deleted = AuditRepository(db).purge_older_than(cutoff)
        db.commit()
    logger.info("Audit log purge: deleted %d rows older than %s days", deleted, retention_days)


@alert_on_cron_failure
async def purge_donations_cron(ctx) -> None:
    from app.database import SessionLocal
    from app.services.donation_purge_service import DonationPurgeService
    with SessionLocal() as db:
        r = DonationPurgeService.purge(db)
    logger.info(
        "Donation purge: %d expired, %d donors stripped of PII, %d stale manage links cleared",
        r["vencidas"], r["donantes_purgados"], r["enlaces_vencidos"],
    )


@alert_on_cron_failure
async def purge_email_failures_cron(ctx) -> None:
    from app.database import SessionLocal
    from app.repositories.email_failure_repository import EmailFailureRepository
    with SessionLocal() as db:
        deleted = EmailFailureRepository(db).purge_older_than(90)
    logger.info("Email failure purge: deleted %d rows older than 90 days", deleted)


@alert_on_cron_failure
async def heartbeat_watchdog_cron(ctx) -> None:
    """Revisa que ningún cron se haya quedado atrás.

    **Un vigilante no puede detectar su propia muerte.** Si el worker entero deja
    de arrancar, este cron muere con los demás y nadie avisa nada — por eso el
    latido se expone además en `/health/jobs`, para que la pregunta pueda
    hacerse desde fuera del proceso que podría estar muerto.
    """
    from app.database import SessionLocal
    from app.services.cron_heartbeat import stale_crons

    with SessionLocal() as db:
        rezagados = await asyncio.to_thread(stale_crons, db)

    if rezagados:
        await _alert(
            ":rotating_light: *Hay trabajo de fondo que dejó de correr*\n"
            + "\n".join(f"· `{nombre}` — {_PURGE_PROMISES.get(nombre, 'sin correr')}"
                        for nombre in rezagados)
        )


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
    # Cada tarea se envuelve aquí y no en su definición: es un solo lugar que
    # garantiza que ninguna quede sin alerta, y la lista es justo lo que alguien
    # edita al agregar una tarea nueva.
    functions = [
        alert_on_final_failure(notify_slack_task),
        alert_on_final_failure(submit_indexnow_task),
        alert_on_final_failure(send_verification_email_task),
        alert_on_final_failure(send_password_reset_email_task),
        alert_on_final_failure(send_invitation_email_task),
        alert_on_final_failure(send_donation_confirmation_email_task),
        alert_on_final_failure(send_donation_registered_email_task),
        alert_on_final_failure(send_donation_received_email_task),
        alert_on_final_failure(send_donation_shipped_email_task),
        alert_on_final_failure(send_request_reply_email_task),
        alert_on_final_failure(send_message_private_email_task),
        alert_on_final_failure(send_message_public_email_task),
        alert_on_final_failure(send_message_reply_email_task),
        alert_on_final_failure(send_transfer_created_email_task),
        alert_on_final_failure(send_transfer_status_email_task),
        alert_on_final_failure(send_transfer_received_email_task),
        alert_on_final_failure(send_password_changed_email_task),
        alert_on_final_failure(send_center_application_confirm_email_task),
        alert_on_final_failure(send_center_application_received_email_task),
        alert_on_final_failure(send_center_application_rejected_email_task),
        alert_on_final_failure(send_center_application_admin_notice_task),
        # Export jobs get a longer per-task timeout than the global 60s: PDF/XLSX
        # generation for a shipment with many pallets (DB queries + reportlab/WeasyPrint
        # + R2 upload, all in one job) can plausibly exceed 60s where an email send can't.
        func(alert_on_final_failure(generate_shipment_manifest_pdf_task), timeout=300),
        func(alert_on_final_failure(generate_shipment_manifest_xlsx_task), timeout=300),
        func(alert_on_final_failure(generate_box_labels_pdf_task), timeout=300),
        func(alert_on_final_failure(generate_pallet_label_pdf_task), timeout=300),
        func(alert_on_final_failure(generate_transfer_manifest_pdf_task), timeout=300),
        func(alert_on_final_failure(generate_report_export_csv_task), timeout=300),
        func(alert_on_final_failure(generate_shipment_declaration_xlsx_task), timeout=300),
        func(alert_on_final_failure(generate_shipment_declaration_json_task), timeout=300),
    ]
    cron_jobs = [
        cron(purge_audit_logs_cron, hour=3, minute=0),
        cron(purge_attachments_cron, hour=4, minute=0),
        cron(purge_email_failures_cron, hour=4, minute=30),
        cron(purge_donations_cron, hour=5, minute=0),
        # Export jobs expire 1h after DONE (see ExportJobRepository.DOWNLOAD_TTL_SECONDS) —
        # runs hourly, not daily like the other purges, to keep R2/db lean on that timescale.
        cron(purge_export_jobs_cron, minute=15),
        # Cada hora: detecta que un cron se quedó atrás. Lo que NO puede
        # detectar es su propia ausencia — para eso está /health/jobs.
        cron(heartbeat_watchdog_cron, minute=45),
    ]
    redis_settings = RedisSettings.from_dsn(os.environ.get("REDIS_URL", "redis://localhost:6379"))
    max_jobs = 10
    job_timeout = 60
    keep_result = 3600
    retry_jobs = True
    max_tries = 3
