"""Guardarraíles de gasto de IA (Fase 23, task 2).

El riesgo de esta fase no es el precio unitario —una sugerencia cuesta
centésimas de centavo— sino el volumen sin control: un bucle mal escrito, un
cliente que reintenta, una foto que se procesa mil veces.

Cuatro frenos, en orden de dureza:

1. **Bandera por capacidad.** Encender el mapeo no enciende el OCR.
2. **Tope mensual.** Al alcanzarlo, las capacidades se apagan solas. La
   operación sigue: capturar a mano es más lento, no imposible.
3. **Caché.** La misma pregunta no se cobra dos veces.
4. **Ningún endpoint público invoca IA.** No es configuración, es una regla de
   la fase: lo público es cacheable y anónimo, y ahí un costo por petición se
   convierte en un ataque barato.
"""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.ai_usage import AI_CAPABILITIES, AIUsage
from app.utils import cache

logger = logging.getLogger(__name__)

# Precio por millón de tokens del tramo económico, que es donde vive esta fase.
# No pretende ser exacto: sirve para que el tope corte a tiempo, y errar por
# arriba corta antes, que es el lado seguro.
_USD_PER_MILLION_INPUT = 0.15
_USD_PER_MILLION_OUTPUT = 0.60

_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7


class AIDisabled(RuntimeError):
    """La capacidad está apagada, o el tope del mes ya se alcanzó."""


def estimate_cost_usd(input_tokens: int, output_tokens: int) -> float:
    entrada = input_tokens / 1_000_000 * _USD_PER_MILLION_INPUT
    salida = output_tokens / 1_000_000 * _USD_PER_MILLION_OUTPUT
    return round(entrada + salida, 6)


def capability_enabled(capability: str) -> bool:
    if capability not in AI_CAPABILITIES:
        raise ValueError(f"Capacidad desconocida: {capability}")
    if not settings.ai_api_key:
        return False
    return bool(getattr(settings, f"ai_enable_{capability}", False))


def month_spend_usd(db: Session, capability: str | None = None) -> float:
    """Gasto del mes en curso. Es la base del interruptor y del panel."""
    inicio = datetime.now(timezone.utc).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    stmt = select(func.coalesce(func.sum(AIUsage.cost_usd), 0.0)).where(
        AIUsage.created_at >= inicio
    )
    if capability is not None:
        stmt = stmt.where(AIUsage.capability == capability)
    return float(db.execute(stmt).scalar_one() or 0.0)


def budget_exhausted(db: Session) -> bool:
    tope = settings.ai_monthly_budget_usd
    if tope <= 0:
        # Un tope en cero o negativo se lee como "apagado", no como "sin límite".
        # La lectura contraria convertiría un dedazo en una factura.
        return True
    return month_spend_usd(db) >= tope


def ensure_available(db: Session, capability: str) -> None:
    """Puerta única. Todo camino a la IA pasa por aquí."""
    if not capability_enabled(capability):
        raise AIDisabled(f"La capacidad '{capability}' está apagada")
    if budget_exhausted(db):
        logger.warning("Tope mensual de IA alcanzado; '%s' queda apagada", capability)
        raise AIDisabled("Se alcanzó el tope de gasto mensual de IA")


def record_usage(
    db: Session,
    capability: str,
    input_tokens: int,
    output_tokens: int,
    user_id: UUID | None = None,
    center_id: UUID | None = None,
) -> float:
    """Anota el costo y lo devuelve. Nunca levanta: perder el registro de una
    llamada no puede tumbar la llamada, pero sí deja el tope ciego, así que el
    fallo se registra fuerte en el log."""
    costo = estimate_cost_usd(input_tokens, output_tokens)
    try:
        db.add(AIUsage(
            capability=capability,
            model=settings.ai_model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=costo,
            user_id=user_id,
            center_id=center_id,
        ))
        db.commit()
    except Exception:
        logger.exception("No se pudo registrar el gasto de IA de '%s'", capability)
    return costo


def cache_key(capability: str, payload: object) -> str:
    """Clave estable para la misma pregunta.

    Se hashea el contenido: dos capturas del mismo texto libre, en dos centros
    distintos, son la misma pregunta y no tienen por qué costar dos veces.
    """
    serializado = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str)
    digest = hashlib.sha256(serializado.encode()).hexdigest()[:32]
    return f"ai:{capability}:{digest}"


def cached(key: str):
    crudo = cache.get(key)
    return json.loads(crudo) if crudo else None


def store(key: str, value, ttl: int = _CACHE_TTL_SECONDS) -> None:
    cache.set(key, json.dumps(value, ensure_ascii=False, default=str), ttl=ttl)
