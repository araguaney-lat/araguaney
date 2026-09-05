"""Mapeo de texto libre a catálogo (Fase 23, task 4).

Quien dona escribe como habla: "20 latas de atún", "3 cobijas", "advil 400".
Traducir eso a un producto del catálogo lo hace hoy una persona, renglón por
renglón, y es el cuello de botella real de la captura.

Esta capacidad propone **hasta tres candidatos ordenados por confianza**. No
elige: quien captura confirma, busca otra cosa o crea el producto. Ese es el
principio de la fase y no una cortesía — un mapeo equivocado que nadie mira se
convierte en inventario que dice algo distinto de lo que hay en la caja, y eso
sale a la luz en la aduana o en el destino, no aquí.

**Dónde corre.** En el panel, con sesión. El texto del donante se guarda tal cual
al pre-registrarse; la traducción ocurre después. `ensure_available` exige un
`user_id`, así que ninguna ruta anónima puede llegar hasta aquí.
"""

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.product_type import ProductType
from app.repositories.product_type_repository import ProductTypeRepository
from app.services.ai import budget
from app.services.ai.budget import AIDisabled
from app.services.ai.provider import AIUnavailable, get_provider
from app.utils.text_matching import shares_stem, words

logger = logging.getLogger(__name__)

CAPABILITY = "text_mapping"
MAX_SUGGESTIONS = 3

# El catálogo entero no cabe en un prompt ni conviene: mandar mil productos por
# cada renglón multiplica el costo y empeora el resultado. Se preselecciona con
# la búsqueda que ya existe y el modelo desempata entre candidatos reales.
_SHORTLIST_SIZE = 25

_PROMPT = (
    "Eres un clasificador de donaciones en especie para centros de acopio "
    "humanitarios. Recibes el texto libre de una persona donante y una lista de "
    "productos del catálogo, cada uno con su id.\n\n"
    "Devuelve JSON: {\"ids\": [...]} con hasta tres ids del catálogo, del más "
    "probable al menos probable.\n\n"
    "Reglas:\n"
    "- Usa SOLO ids de la lista. No inventes ninguno.\n"
    "- Si ninguno corresponde, devuelve una lista vacía. Una lista vacía es una "
    "respuesta correcta y útil: obliga a que una persona busque o cree el "
    "producto, que es mejor que aceptar un parecido.\n"
    "- La concentración distingue productos: ibuprofeno 400 mg no es "
    "ibuprofeno 800 mg.\n"
    "Responde solo el JSON."
)


def _catalog_words(pt: ProductType, aliases: list[str]) -> set[str]:
    """Palabras del producto donde puede aparecer lo que el donante escribió.

    Incluye la marca y los alias, que es lo que alcanza los casos que ninguna
    mejora de búsqueda podía: "advil" no comparte una letra con "Ibuprofeno", y
    "frazada" ninguna con "Cobija de lana". Sin esto, el modelo nunca llega a
    ver el producto correcto y su respuesta vacía es la correcta.
    """
    partes = [pt.display_name, pt.inn_name, pt.brand, *aliases]
    return set(words(" ".join(w for w in partes if w)))


def _shortlist(db: Session, text: str, campaign_ids: list[UUID] | None) -> list[ProductType]:
    """Candidatos plausibles comparando palabra por palabra, no la frase
    completa: "20 latas de atún" no encuentra nada como frase, "atún" sí.

    Se compara en Python y no con `ILIKE` porque acentos y plurales solo se
    normalizan de un lado si el otro también pasa por la misma normalización;
    el catálogo global no es tan grande (unos cientos de filas) para que esto
    cueste más que la propia llamada a la IA que sigue después.
    """
    terminos = words(text)
    if not terminos:
        return []

    repo = ProductTypeRepository(db)
    catalogo = repo.find_all(campaign_ids=campaign_ids)
    alias_por_producto = repo.aliases_by_product(campaign_ids=campaign_ids)
    palabras_por_producto = {
        pt.id: (_catalog_words(pt, alias_por_producto.get(pt.id, [])), pt)
        for pt in catalogo
    }

    vistos: dict[UUID, ProductType] = {}
    # Palabra más larga primero, porque es la más específica ("paracetamol"
    # dice más que "caja"), y a igual largo en orden alfabético: cuando el
    # tope corta la lista, el mismo texto tiene que dejar los mismos
    # candidatos. Dos capturas idénticas que proponen cosas distintas es
    # justo lo que hace dudar de la herramienta a quien la usa.
    for termino in sorted(set(terminos), key=lambda w: (-len(w), w)):
        for pt_id, (palabras, pt) in palabras_por_producto.items():
            if pt_id in vistos:
                continue
            if shares_stem(termino, palabras):
                vistos[pt_id] = pt
        if len(vistos) >= _SHORTLIST_SIZE:
            break

    return list(vistos.values())[:_SHORTLIST_SIZE]


def suggest(
    db: Session,
    text: str,
    user_id: UUID | None,
    center_id: UUID | None = None,
    campaign_ids: list[UUID] | None = None,
) -> list[ProductType]:
    """Hasta tres productos sugeridos para un renglón de texto libre.

    Devuelve lista vacía cuando la IA está apagada, sin presupuesto o caída: la
    captura manual sigue funcionando y quien captura ni se entera. Que la IA no
    esté nunca puede impedir registrar una donación.
    """
    texto = (text or "").strip()
    if not texto:
        return []

    try:
        budget.ensure_available(db, CAPABILITY, user_id=user_id)
    except AIDisabled as exc:
        logger.debug("Mapeo no disponible: %s", exc)
        return []

    candidatos = _shortlist(db, texto, campaign_ids)
    if not candidatos:
        # Sin candidatos no hay nada que desempatar, y preguntarle al modelo
        # sería pagar por una respuesta que solo puede ser vacía.
        return []

    por_id = {str(pt.id): pt for pt in candidatos}
    # La clave incluye los candidatos: el mismo texto con un catálogo distinto
    # es otra pregunta, y servir la respuesta vieja propondría productos que
    # quizá ya no existen.
    clave = budget.cache_key(CAPABILITY, {"texto": texto.lower(), "ids": sorted(por_id)})

    ids = budget.cached(clave)
    if ids is None:
        try:
            proveedor = get_provider()
            resultado = proveedor.classify_text(
                _PROMPT,
                _format_question(texto, candidatos),
            )
        except AIUnavailable as exc:
            logger.info("El proveedor de IA no respondió al mapear: %s", exc)
            return []

        budget.record_usage(
            db, CAPABILITY, resultado.input_tokens, resultado.output_tokens,
            user_id=user_id, center_id=center_id,
        )
        ids = [str(i) for i in resultado.data.get("ids", [])][:MAX_SUGGESTIONS]
        budget.store(clave, ids)

    # Se filtra contra los candidatos reales: un modelo que inventa un id no
    # puede meter un producto inexistente en la pantalla de captura.
    return [por_id[i] for i in ids if i in por_id][:MAX_SUGGESTIONS]


def _format_question(text: str, candidatos: list[ProductType]) -> str:
    lineas = [
        f"- {pt.id} · {pt.display_name}"
        + (f" ({pt.strength})" if pt.strength else "")
        + f" [{pt.category}]"
        for pt in candidatos
    ]
    return f"Texto de la persona donante: {text}\n\nCatálogo:\n" + "\n".join(lineas)
