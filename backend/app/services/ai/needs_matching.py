"""Emparejamiento de necesidades con stock (Fase 23, task 6).

Una solicitud llega escrita en prosa: "necesitamos medicamento para la fiebre y
algo para abrigar a los niños". El tablón la muestra y ahí muere; saber quién
tiene eso exige que alguien recorra centros a mano.

**La IA solo traduce la prosa a categorías del catálogo. El stock lo cuenta la
base de datos.** Esa división importa: un modelo inventando cantidades sería
inventario imaginario, y alguien planearía un envío sobre él. Lo que se le pide
es lo único que hace bien aquí, que es entender lenguaje.

El resultado se acota por centro como todo lo demás: un coordinador no descubre
el stock de otro centro por esta vía. Solo `national_admin` ve el panorama, que
es quien coordina de dónde sale qué.
"""

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.product_type import PRODUCT_CATEGORIES
from app.repositories.aggregate_repository import AggregateRepository
from app.services.ai import budget
from app.services.ai.budget import AIDisabled
from app.services.ai.provider import AIUnavailable, get_provider

logger = logging.getLogger(__name__)

CAPABILITY = "needs_matching"

_PROMPT = (
    "Recibes el texto de una solicitud de ayuda humanitaria. Devuelve JSON: "
    '{"categories": [...]} con las categorías de catálogo que la solicitud '
    "necesita, de la más relevante a la menos.\n\n"
    "Categorías válidas: " + ", ".join(PRODUCT_CATEGORIES) + ".\n\n"
    "Usa solo esas. Si la solicitud no pide nada material —una duda "
    "administrativa, una queja—, devuelve lista vacía.\n"
    "Responde solo el JSON."
)


def match(
    db: Session,
    text: str,
    user_id: UUID | None,
    center_id: UUID | None = None,
) -> list[dict]:
    """Categorías pedidas y qué stock hay de cada una.

    Devuelve lista vacía si la IA no está disponible: el tablón sigue mostrando
    la solicitud como siempre, sin el atajo.
    """
    texto = (text or "").strip()
    if not texto:
        return []

    try:
        budget.ensure_available(db, CAPABILITY, user_id=user_id)
    except AIDisabled as exc:
        logger.debug("Emparejamiento no disponible: %s", exc)
        return []

    clave = budget.cache_key(CAPABILITY, {"texto": texto.lower()})
    categorias = budget.cached(clave)

    if categorias is None:
        try:
            resultado = get_provider().classify_text(_PROMPT, texto)
        except AIUnavailable as exc:
            logger.info("El proveedor no respondió al emparejar: %s", exc)
            return []

        budget.record_usage(
            db, CAPABILITY, resultado.input_tokens, resultado.output_tokens,
            user_id=user_id, center_id=center_id,
        )
        # Una categoría inventada no existe en el catálogo y no tendría stock:
        # se filtra aquí para no arrastrarla a la consulta.
        categorias = [c for c in resultado.data.get("categories", []) if c in PRODUCT_CATEGORIES]
        budget.store(clave, categorias)

    if not categorias:
        return []

    # El stock sale de la base, nunca del modelo. Y sale acotado: `center_id`
    # None es national_admin, cualquier otro valor ve solo lo suyo.
    repo = AggregateRepository(db)
    disponible = {fila["category"]: fila for fila in repo.stock_by_category(center_id=center_id)}

    return [
        {
            "category": categoria,
            "total_units": disponible.get(categoria, {}).get("total_units", 0),
            "box_count": disponible.get(categoria, {}).get("box_count", 0),
        }
        for categoria in categorias
    ]
