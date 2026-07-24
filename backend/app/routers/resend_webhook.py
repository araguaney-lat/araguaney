import logging

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.services.email_failure_service import EmailFailureService

logger = logging.getLogger(__name__)

# Unversioned (registered without the /v1 prefix in main.py): a third party
# (Resend) calls this with a hardcoded URL, same as Stripe webhooks.
router = APIRouter(tags=["webhooks"])


@router.post("/webhooks/resend")
async def resend_webhook(request: Request, db: Session = Depends(get_db)) -> Response:
    if not settings.resend_webhook_secret:
        logger.warning("Resend webhook hit but RESEND_WEBHOOK_SECRET is unset")
        return Response(status_code=503)

    body = await request.body()
    headers = {
        "svix-id": request.headers.get("svix-id", ""),
        "svix-timestamp": request.headers.get("svix-timestamp", ""),
        "svix-signature": request.headers.get("svix-signature", ""),
    }

    # Verify the Svix signature — this is the auth guard for the endpoint.
    from svix.webhooks import Webhook, WebhookVerificationError

    try:
        payload = Webhook(settings.resend_webhook_secret).verify(body, headers)
    except WebhookVerificationError:
        return Response(status_code=401)

    event_type = str(payload.get("type", ""))
    data = payload.get("data") or {}
    try:
        EmailFailureService(db).record_event(event_type, headers["svix-id"], data)
    except Exception:  # noqa: BLE001 — never 500 on a bad payload (avoids retry storms)
        logger.exception("Resend webhook processing failed for %s", event_type)

    return Response(status_code=200)
