"""Lectura del gasto de IA para el panel de `/studio` (Fase 23, task 3).

Solo lee. Los guardarraíles viven en `budget.py` y esto no los toca: un panel
que además pudiera apagar cosas sería una segunda forma de cambiar el estado, y
la de verdad son las variables de entorno.

El panel existe porque el riesgo de esta fase no es el precio unitario sino el
volumen. Un bucle mal escrito no se ve en la factura hasta fin de mes, y para
entonces ya corrió treinta días. Tres cosas hacen falta para cacharlo a tiempo:
cuánto va del tope, en qué capacidad, y qué día se disparó.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.ai_usage import AI_CAPABILITIES, AIUsage
from app.models.center import Center
from app.services.ai.budget import budget_exhausted, capability_enabled

# Ventana del gráfico diario. Un mes es lo que dura el tope, y un pico de hace
# más de un mes ya no se puede corregir a tiempo: solo estorba la lectura.
_DAILY_DAYS = 31
# Cuántos centros se listan al buscar el origen de un pico. Con más, la lista
# deja de señalar y pasa a ser otra tabla que hay que leer entera.
_TOP_CENTERS = 5


def month_start() -> datetime:
    return datetime.now(timezone.utc).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )


def _by_capability(db: Session, since: datetime) -> dict[str, dict[str, float | int]]:
    rows = db.execute(
        select(
            AIUsage.capability,
            func.count(AIUsage.id),
            func.coalesce(func.sum(AIUsage.input_tokens), 0),
            func.coalesce(func.sum(AIUsage.output_tokens), 0),
            func.coalesce(func.sum(AIUsage.cost_usd), 0.0),
        )
        .where(AIUsage.created_at >= since)
        .group_by(AIUsage.capability)
    ).all()

    return {
        capability: {
            "calls": int(calls),
            "input_tokens": int(entrada),
            "output_tokens": int(salida),
            "cost_usd": round(float(costo), 6),
        }
        for capability, calls, entrada, salida, costo in rows
    }


def _daily(db: Session, since: datetime) -> list[tuple[date, float, int]]:
    """Gasto por día. Es lo que convierte un total en una explicación: mil
    llamadas repartidas en un mes son uso; mil en una tarde son un bucle."""
    dia = func.date(AIUsage.created_at)
    rows = db.execute(
        select(dia, func.coalesce(func.sum(AIUsage.cost_usd), 0.0), func.count(AIUsage.id))
        .where(AIUsage.created_at >= since)
        .group_by(dia)
        .order_by(dia)
    ).all()

    salida = []
    for valor, costo, llamadas in rows:
        # Postgres devuelve `date`; SQLite, texto. Se normaliza aquí en vez de
        # ramificar por dialecto en la consulta.
        parsed = valor if isinstance(valor, date) else date.fromisoformat(str(valor)[:10])
        salida.append((parsed, round(float(costo), 6), int(llamadas)))
    return salida


def _top_centers(db: Session, since: datetime) -> list[tuple[str, float]]:
    """De dónde salió el gasto. El modelo guarda `center_id` justamente para
    esto: encontrar el origen de un pico, no para cobrarle a nadie."""
    rows = db.execute(
        select(Center.name, func.coalesce(func.sum(AIUsage.cost_usd), 0.0))
        .join(Center, Center.id == AIUsage.center_id)
        .where(AIUsage.created_at >= since)
        .group_by(Center.name)
        .order_by(func.sum(AIUsage.cost_usd).desc())
        .limit(_TOP_CENTERS)
    ).all()
    return [(nombre, round(float(costo), 6)) for nombre, costo in rows]


def build_report(db: Session) -> dict:
    """Todo lo que el panel enseña, en una sola lectura.

    Las capacidades se listan **todas**, incluso las que no tienen ni una
    llamada: una capacidad apagada que no aparece se confunde con una encendida
    que nadie usó, y esas dos situaciones piden acciones opuestas.
    """
    inicio = month_start()
    desde_diario = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ) - timedelta(days=_DAILY_DAYS - 1)

    consumo = _by_capability(db, inicio)
    capacidades = [
        {
            "capability": capability,
            "enabled": capability_enabled(capability),
            "calls": int(consumo.get(capability, {}).get("calls", 0)),
            "input_tokens": int(consumo.get(capability, {}).get("input_tokens", 0)),
            "output_tokens": int(consumo.get(capability, {}).get("output_tokens", 0)),
            "cost_usd": float(consumo.get(capability, {}).get("cost_usd", 0.0)),
        }
        for capability in AI_CAPABILITIES
    ]

    gasto = round(sum(c["cost_usd"] for c in capacidades), 6)

    return {
        "month_start": inicio,
        "monthly_budget_usd": float(settings.ai_monthly_budget_usd),
        "month_spend_usd": gasto,
        "budget_exhausted": budget_exhausted(db),
        # Sin proveedor configurado toda capacidad está apagada aunque su
        # bandera diga que sí. Decirlo evita el rato perdido buscando por qué
        # "está encendida" y no responde.
        "provider_configured": bool(settings.ai_api_key),
        "model": settings.ai_model,
        "capabilities": capacidades,
        "daily": [
            {"day": dia, "cost_usd": costo, "calls": llamadas}
            for dia, costo, llamadas in _daily(db, desde_diario)
        ],
        "top_centers": [
            {"center_name": nombre, "cost_usd": costo}
            for nombre, costo in _top_centers(db, inicio)
        ],
    }
