"""
Email sending module — Resend + Jinja2.

Templates live in app/templates/emails/*.html

Workflow to add a new template:
  1. Design in Beefree (or write manually).
  2. Save as app/templates/emails/<name>.html
  3. Add a send_<name>_email() function below.
  4. Add <meta name="color-scheme" content="light"> for Gmail dark mode safety.
"""

from datetime import datetime, timezone
from pathlib import Path

import resend
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.config import settings

_TEMPLATES_DIR = Path(__file__).parent / "templates" / "emails"
_jinja = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)

# Logo de marca servido desde Cloudinary (el mismo que usa la app). Vive aquí y
# no en cada plantilla para no repetir la URL en las 19; las plantillas lo
# reciben como {{ logo_url }} vía el header compartido (_header.html).
_LOGO_URL = (
    "https://res.cloudinary.com/dtvdqlxtd/image/upload"
    "/w_84,h_84,c_fill/v1782794310/image_degkq9.png"
)


def _render(template_name: str, **kwargs: object) -> str:
    site_url = settings.frontend_url.split(",")[0].strip()
    # current_year alimenta el año del footer compartido (_footer.html); se
    # calcula al enviar para que no quede congelado en el texto.
    return _jinja.get_template(template_name).render(
        site_url=site_url,
        logo_url=_LOGO_URL,
        current_year=datetime.now(timezone.utc).year,
        **kwargs,
    )


def _send(
    *,
    to: str | list[str],
    subject: str,
    html: str,
    reply_to: str | None = None,
    email_type: str | None = None,
) -> None:
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
    # Tag every email with its type so the Resend webhook can correlate a
    # bounce/complaint back to what it was (invitation, confirmation, …). The
    # recipient itself is not a tag (Resend forbids "@") — it comes from the
    # webhook payload. Tag values must be ASCII [A-Za-z0-9_-].
    if email_type:
        payload["tags"] = [{"name": "email_type", "value": email_type}]
    resend.Emails.send(payload)


# ---------------------------------------------------------------------------
# Send functions — add one per email type
# ---------------------------------------------------------------------------

def send_verification_email(to: str, token: str) -> None:
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        email_type="verification",
        subject="Verifica tu correo de Araguaney",
        html=_render("verification.html", verify_url=f"{site_url}/verify?token={token}"),
    )


def send_password_reset_email(to: str, token: str) -> None:
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        email_type="password_reset",
        subject="Restablece tu contraseña de Araguaney",
        html=_render("password_reset.html", reset_url=f"{site_url}/reset-password?token={token}"),
    )


def send_invitation_email(to: str, username: str, temp_password: str) -> None:
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        email_type="invitation",
        subject="Fuiste invitado a Araguaney",
        html=_render(
            "invitation.html",
            email=to,  # login is by email, not username — show the email to use
            temp_password=temp_password,
            login_url=f"{site_url}/login",
        ),
    )


def send_request_reply_email(to: str, request_title: str, reply_body: str, request_url: str) -> None:
    _send(
        to=to,
        email_type="request_reply",
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
        email_type="message_private",
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
        email_type="message_public",
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
        email_type="message_reply",
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
        email_type="transfer_created",
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
        email_type="transfer_status",
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
        email_type="password_changed",
        subject="Tu contraseña de Araguaney fue actualizada",
        html=_render("password_changed.html", login_url=f"{site_url}/login"),
    )


def send_transfer_received_email(to: str, from_center: str, to_center: str) -> None:
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        email_type="transfer_received",
        subject=f"Transferencia recibida: {from_center} → {to_center}",
        html=_render(
            "transfer_received.html",
            from_center=from_center,
            to_center=to_center,
            transfers_url=f"{site_url}/dashboard/transfers",
        ),
    )


def send_center_application_confirm_email(to: str, token: str) -> None:
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        email_type="center_application_confirm",
        subject="Confirma tu solicitud de centro de acopio",
        html=_render(
            "center_application_confirm.html",
            confirm_url=f"{site_url}/registrar-centro/confirmar?token={token}",
        ),
    )


def send_center_application_received_email(to: str, center_name: str) -> None:
    _send(
        to=to,
        email_type="center_application_received",
        subject="Solicitud de centro recibida — en revisión",
        html=_render("center_application_received.html", center_name=center_name),
    )


def send_center_application_rejected_email(to: str, center_name: str, reason: str) -> None:
    _send(
        to=to,
        email_type="center_application_rejected",
        subject="Sobre tu solicitud de centro de acopio",
        html=_render("center_application_rejected.html", center_name=center_name, reason=reason),
    )


def send_center_application_admin_notice_email(
    to: str, center_name: str, country_code: str
) -> None:
    """Notify a reviewer (national_admin / superadmin) that a new center
    application is ready for review."""
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        email_type="center_application_admin_notice",
        subject=f"Nueva solicitud de centro pendiente de revisión ({country_code})",
        html=_render(
            "center_application_admin_notice.html",
            center_name=center_name,
            country_code=country_code,
            review_url=f"{site_url}/dashboard/admin/center-applications",
        ),
    )


def send_donation_confirmation_email(to: str, first_name: str, token: str) -> None:
    """Doble opt-in del pre-registro: hasta confirmar, la donación no existe."""
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        email_type="donation_confirm",
        subject="Confirma tu donación",
        html=_render(
            "donation_confirm.html",
            confirm_url=f"{site_url}/donar/confirmar?token={token}",
            first_name=first_name,
        ),
    )


def send_donation_registered_email(to: str, code: str, manage_token: str) -> None:
    """Entrega el código para el QR y el enlace de gestión de esa donación."""
    site_url = settings.frontend_url.split(",")[0].strip()
    _send(
        to=to,
        email_type="donation_registered",
        subject=f"Tu donación {code} está lista",
        html=_render(
            "donation_registered.html",
            code=code,
            manage_url=f"{site_url}/donacion/{manage_token}",
        ),
    )


def send_donation_shipped_email(to: str, code: str, shipment_reference: str) -> None:
    """Cierra el círculo: lo que donó esta persona salió en un envío."""
    _send(
        to=to,
        email_type="donation_shipped",
        subject=f"Tu donación {code} salió en un envío",
        html=_render("donation_shipped.html", code=code, shipment_reference=shipment_reference),
    )


def send_donation_received_email(to: str, code: str, center_name: str, items: list) -> None:
    """Resumen del doble check: qué se recibió y qué no."""
    _send(
        to=to,
        email_type="donation_received",
        subject=f"Recibimos tu donación {code}",
        html=_render("donation_received.html", code=code, center_name=center_name, items=items),
    )
