"""Vigilancia de rebotes de correo en volumen (Fase 24, task 6).

Los rebotes ya se registraban (Fase 15), pero registrar no es avisar. Un rebote
suelto es ruido normal: una dirección mal escrita, un buzón lleno. Lo que importa
es el cambio de régimen, y tiene una consecuencia concreta: **el pre-registro de
donaciones vive de un doble opt-in**, así que un proveedor que empieza a
bloquearnos no rompe "unos correos", rompe el flujo entero sin producir un solo
error visible.

Dos señales, porque describen problemas distintos:

- **Volumen total**: algo se rompió de nuestro lado (dominio mal configurado,
  reputación caída, plantilla marcada como spam).
- **Concentración en un dominio**: un proveedor concreto nos está filtrando,
  aunque el total se vea normal.

El aviso nombra **dominios, nunca direcciones**. La señal se lee igual y ninguna
dirección de correo sale de la base hacia un canal de chat.
"""

import logging
import os
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

_WINDOW_ENV = "BOUNCE_ALERT_WINDOW_HOURS"
_TOTAL_ENV = "BOUNCE_ALERT_TOTAL"
_DOMAIN_ENV = "BOUNCE_ALERT_PER_DOMAIN"

# Valores por defecto deliberadamente conservadores. A diferencia del umbral de
# volumen de donaciones, aquí no hay nada que rodear: publicar estos números no
# le sirve a nadie para evadir un control, y dejar el aviso apagado por defecto
# reproduciría justo el problema que esta fase ataca.
DEFAULT_WINDOW_HOURS = 24
DEFAULT_TOTAL = 25
DEFAULT_PER_DOMAIN = 10


def _setting(name: str, fallback: int) -> int:
    """Lee un entero del entorno. Un valor con basura no apaga la vigilancia."""
    raw = os.environ.get(name)
    if not raw:
        return fallback
    try:
        value = int(raw)
    except ValueError:
        logger.warning("%s no es un entero (%r); se usa %s", name, raw, fallback)
        return fallback
    return value if value > 0 else fallback


def build_bounce_alert(by_domain: dict[str, int], window_hours: int) -> str | None:
    """Devuelve el texto de la alerta, o None si no hay nada que reportar."""
    if not by_domain:
        return None

    total = sum(by_domain.values())
    max_total = _setting(_TOTAL_ENV, DEFAULT_TOTAL)
    max_per_domain = _setting(_DOMAIN_ENV, DEFAULT_PER_DOMAIN)

    concentrated = sorted(
        ((domain, count) for domain, count in by_domain.items() if count >= max_per_domain),
        key=lambda pair: pair[1],
        reverse=True,
    )

    if total < max_total and not concentrated:
        return None

    lines = [
        ":warning: *Rebotes de correo por encima de lo normal*",
        f"{total} sin resolver en las últimas {window_hours} h.",
    ]
    if concentrated:
        lines.append("Concentrados en:")
        lines.extend(f"· `{domain}` — {count}" for domain, count in concentrated[:5])
    lines.append(
        "El pre-registro de donaciones depende de que el correo llegue: "
        "revisa reputación, SPF/DKIM y el panel de Resend."
    )
    return "\n".join(lines)


def bounce_report(db) -> tuple[str | None, int]:
    """Arma el reporte de la ventana vigente. Devuelve (alerta, ventana en horas)."""
    from app.repositories.email_failure_repository import EmailFailureRepository

    window_hours = _setting(_WINDOW_ENV, DEFAULT_WINDOW_HOURS)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=window_hours)
    by_domain = EmailFailureRepository(db).count_unresolved_by_domain_since(cutoff)
    return build_bounce_alert(by_domain, window_hours), window_hours
