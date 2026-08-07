"""Resumen del agregado nacional (Fase 23, task 7).

Un párrafo redactado sobre las cifras que el panel ya calcula, para prensa y
donantes institucionales, que piden un texto y no una tabla.

**El modelo no calcula: redacta.** Las cifras entran ya sumadas por la base y lo
único que se le pide es ponerlas en prosa. Un modelo haciendo aritmética sobre
inventario humanitario produciría un número creíble y falso, y un número falso en
un boletín de prensa no se corrige.

**Sin datos personales en el prompt.** Viajan categorías, unidades y conteos de
centros. Ni nombres de donantes, ni de centros, ni nada que identifique a nadie:
el resumen habla de qué hay, no de quién lo dio.
"""

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.repositories.aggregate_repository import AggregateRepository
from app.services.ai import budget
from app.services.ai.budget import AIDisabled
from app.services.ai.provider import AIUnavailable, get_provider

logger = logging.getLogger(__name__)

CAPABILITY = "national_summary"

_PROMPT = (
    "Recibes las cifras agregadas de una red de centros de acopio humanitario. "
    'Devuelve JSON: {"summary": "..."} con un párrafo de 3 a 5 oraciones en '
    "español, para prensa y donantes institucionales.\n\n"
    "Reglas:\n"
    "- Usa SOLO las cifras que recibes. No calcules, no proyectes, no "
    "compares con periodos anteriores: si el dato no está, no existe.\n"
    "- Tono informativo y sobrio. Sin adjetivos épicos ni llamados a donar.\n"
    "- No inventes nombres de centros, ciudades ni organizaciones.\n"
    "Responde solo el JSON."
)


def summarize(db: Session, user_id: UUID | None) -> str | None:
    """Párrafo del agregado nacional, o `None` si la IA no está disponible.

    `None` y un párrafo vacío significan lo mismo para quien llama: se muestran
    las cifras sin texto, que es como se ven hoy.
    """
    try:
        budget.ensure_available(db, CAPABILITY, user_id=user_id)
    except AIDisabled as exc:
        logger.debug("Resumen no disponible: %s", exc)
        return None

    repo = AggregateRepository(db)
    cifras = {
        "por_categoria": repo.stock_by_category(center_id=None),
        "centros_con_stock": len(repo.stock_by_center()),
    }

    if not cifras["por_categoria"]:
        # Sin inventario no hay nada que resumir, y pedir un párrafo sobre la
        # nada produciría una frase de relleno que parece un dato.
        return None

    clave = budget.cache_key(CAPABILITY, cifras)
    texto = budget.cached(clave)

    if texto is None:
        try:
            resultado = get_provider().summarize(_PROMPT, cifras)
        except AIUnavailable as exc:
            logger.info("El proveedor no respondió al resumir: %s", exc)
            return None

        budget.record_usage(
            db, CAPABILITY, resultado.input_tokens, resultado.output_tokens,
            user_id=user_id,
        )
        texto = (resultado.data.get("summary") or "").strip()
        budget.store(clave, texto)

    return texto or None
