"""
Email sending module — Resend + Jinja2.

Templates live in app/templates/emails/*.html

Workflow to add a new template:
  1. Design in Beefree (or write manually).
  2. Save as app/templates/emails/<name>.html
  3. Add a send_<name>_email() function below.
  4. Add <meta name="color-scheme" content="light"> for Gmail dark mode safety.
"""

from pathlib import Path

import resend
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import settings

_TEMPLATES_DIR = Path(__file__).parent / "templates" / "emails"
_jinja = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def _render(template_name: str, **kwargs: object) -> str:
    site_url = settings.frontend_url.split(",")[0].strip()
    return _jinja.get_template(template_name).render(site_url=site_url, **kwargs)


def _send(*, to: str | list[str], subject: str, html: str, reply_to: str | None = None) -> None:
    if not settings.resend_api_key:
        return
    resend.api_key = settings.resend_api_key
    payload: dict = {
        "from": f"{settings.mail_from_name} <{settings.mail_from}>",
        "to": [to] if isinstance(to, str) else to,
        "subject": subject,
        "html": html,
    }
    if reply_to:
        payload["reply_to"] = reply_to
    resend.Emails.send(payload)


# ---------------------------------------------------------------------------
# Send functions — add one per email type
# ---------------------------------------------------------------------------

def send_verification_email(to: str, token: str) -> None:
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        subject="Verify your email",
        html=_render("verification.html", verify_url=f"{site_url}/verify?token={token}"),
    )


def send_password_reset_email(to: str, token: str) -> None:
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        subject="Restablece tu contraseña de Araguaney",
        html=_render("password_reset.html", reset_url=f"{site_url}/reset-password?token={token}"),
    )


def send_invitation_email(to: str, username: str, temp_password: str) -> None:
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        subject="Fuiste invitado a Araguaney",
        html=_render(
            "invitation.html",
            username=username,
            temp_password=temp_password,
            login_url=f"{site_url}/login",
        ),
    )


def send_request_reply_email(to: str, request_title: str, reply_body: str, request_url: str) -> None:
    _send(
        to=to,
        subject=f"Nueva respuesta: {request_title}",
        html=_render(
            "request_reply.html",
            request_title=request_title,
            reply_body=reply_body,
            request_url=request_url,
        ),
    )


def send_message_private_email(to: str, sender_name: str, title: str) -> None:
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        subject=f"Nuevo mensaje de {sender_name}: {title}",
        html=_render(
            "message_private.html",
            sender_name=sender_name,
            title=title,
            messages_url=f"{site_url}/dashboard/messages",
        ),
    )


def send_message_public_email(to: str, title: str, campaign_id: str) -> None:
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        subject=f"Nuevo mensaje en campaña: {title}",
        html=_render(
            "message_public.html",
            title=title,
            messages_url=f"{site_url}/dashboard/messages",
        ),
    )


def send_message_reply_email(to: str, thread_title: str, reply_preview: str, sender_name: str) -> None:
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        subject=f"Nueva respuesta en: {thread_title}",
        html=_render(
            "message_reply.html",
            thread_title=thread_title,
            reply_preview=reply_preview,
            sender_name=sender_name,
            messages_url=f"{site_url}/dashboard/messages",
        ),
    )


def send_transfer_created_email(to: str, from_center: str, to_center: str) -> None:
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        subject=f"Nueva transferencia: {from_center} → {to_center}",
        html=_render(
            "transfer_created.html",
            from_center=from_center,
            to_center=to_center,
            transfers_url=f"{site_url}/dashboard/transfers",
        ),
    )


def send_transfer_status_email(
    to: str,
    status: str,
    from_center: str,
    to_center: str,
    reason: str | None = None,
) -> None:
    labels = {"APPROVED": "aprobada", "REJECTED": "rechazada"}
    status_label = labels.get(status, status.lower())
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        subject=f"Transferencia {status_label}: {from_center} → {to_center}",
        html=_render(
            "transfer_status.html",
            status_label=status_label,
            from_center=from_center,
            to_center=to_center,
            reason=reason,
            transfers_url=f"{site_url}/dashboard/transfers",
        ),
    )


def send_password_changed_email(to: str) -> None:
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        subject="Tu contraseña de Araguaney fue actualizada",
        html=_render("password_changed.html", login_url=f"{site_url}/login"),
    )


def send_transfer_received_email(to: str, from_center: str, to_center: str) -> None:
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        subject=f"Transferencia recibida: {from_center} → {to_center}",
        html=_render(
            "transfer_received.html",
            from_center=from_center,
            to_center=to_center,
            transfers_url=f"{site_url}/dashboard/transfers",
        ),
    )
