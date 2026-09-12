"""De quién es este evento de Resend.

Un endpoint de webhook de Resend está en el alcance de la **cuenta**, no de un
dominio de envío ni de una clave de API. Tener un endpoint por producto no
reparte los eventos entre ellos: **duplica**. Cada endpoint recibe todo lo que
la cuenta produce, así que si la cuenta la comparten varios productos, la tabla
de rebotes de cada uno acaba llena de los rebotes del otro.

Eso no es solo ruido en una pantalla. `bounce_watch` avisa por volumen de
rebotes, y el volumen ajeno dispara el aviso propio: el canal termina
reportando la reputación de otro dominio.

El remitente es lo que identifica al producto — no la etiqueta `email_type`,
porque dos productos etiquetan igual justo los tipos que comparten
(`verification`, `password_reset`), y el filtro dejaría pasar exactamente los
casos ambiguos.

**Falla abierta a propósito.** Sin remitente reconocible, o sin saber cuál es
nuestro dominio, el evento se conserva: guardar un rebote ajeno se ve y se
corrige; perder uno propio no se nota hasta que alguien no recibió su
invitación.
"""

import logging

from app.config import settings

logger = logging.getLogger(__name__)


def sender_domain(value: object) -> str | None:
    """Dominio de un campo `from` de Resend.

    Acepta las dos formas que manda Resend: `"Araguaney <noreply@araguaney.lat>"`
    y `"noreply@araguaney.lat"`. Devuelve None si no hay un dominio legible.
    """
    if not isinstance(value, str) or "@" not in value:
        return None
    address = value.rsplit("<", 1)[-1].rstrip(">")
    domain = address.rsplit("@", 1)[-1].strip().lower()
    return domain or None


def owned_domains() -> set[str]:
    """Dominios cuyos eventos nos pertenecen.

    `EMAIL_OWNED_DOMAINS` (lista separada por comas) cubre el caso de enviar
    desde más de un dominio; en blanco, se deduce del remitente configurado.
    """
    raw = settings.email_owned_domains or ""
    declared = {part.strip().lower() for part in raw.split(",") if part.strip()}
    if declared:
        return declared
    fallback = sender_domain(settings.mail_from)
    return {fallback} if fallback else set()


def is_ours(data: dict) -> bool:
    """¿El evento lo produjo un correo nuestro?"""
    ours = owned_domains()
    if not ours:
        # Ni dominio declarado ni remitente configurado: no hay con qué comparar.
        return True

    domain = sender_domain(data.get("from"))
    if domain is None:
        logger.warning("Evento de Resend sin remitente legible; se conserva por prudencia")
        return True

    # El sufijo cubre subdominios de envío (`mail.araguaney.lat`), con el punto
    # para que `notaraguaney.lat` no pase por ser nuestro.
    return any(domain == owned or domain.endswith(f".{owned}") for owned in ours)
