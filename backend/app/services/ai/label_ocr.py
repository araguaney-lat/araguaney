"""OCR de etiqueta de medicamento (Fase 23, task 5).

Teclear INN, forma farmacéutica, concentración, lote y caducidad de una cajita
es el trámite más lento del intake, y el que más se equivoca a las tres de la
tarde con fila esperando.

La foto pre-llena esos cinco campos. **Quedan marcados como sugeridos hasta que
una persona los confirma**, y esa marca no es decorativa: nada llega a `SEALED`
con un dato que nadie miró. La caducidad además sigue pasando por la validación
de vida útil de siempre, así que una lectura optimista no puede colar una caja
que debía rechazarse.

Qué se lee y qué no:

- **Se lee** lo que está impreso en la etiqueta.
- **No se estima** cantidad, peso ni volumen. Sin referencia de escala no hay
  estimación posible, y los modelos cuentan mal: un número inventado en un campo
  que nadie vuelve a mirar es peor que un campo vacío.
"""

from __future__ import annotations

import logging
import re
from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session

from app.services.ai import budget
from app.services.ai.budget import AIDisabled
from app.services.ai.provider import AIUnavailable, get_provider

logger = logging.getLogger(__name__)

CAPABILITY = "label_ocr"

# Los cinco campos que exige sellar un medicamento. Leer otros sería trabajo
# extra sin destino: no hay dónde guardarlos.
FIELDS = ("inn_name", "form", "strength", "batch", "expiry_date")

_PROMPT = (
    "Lee la etiqueta de este medicamento y devuelve JSON con exactamente estas "
    "claves: inn_name, form, strength, batch, expiry_date.\n\n"
    "- inn_name: el nombre genérico (denominación común internacional), no la "
    "marca comercial. Si la caja dice 'Advil', el genérico es 'Ibuprofeno'.\n"
    "- form: forma farmacéutica (Tableta, Cápsula, Jarabe, Suspensión oral...).\n"
    "- strength: concentración tal como aparece, con unidad ('500 mg', "
    "'250 mg/5 mL').\n"
    "- batch: número de lote.\n"
    "- expiry_date: caducidad en formato AAAA-MM-DD. Si solo hay mes y año, usa "
    "el último día de ese mes.\n\n"
    "Usa null en el campo que no puedas leer con certeza. Inventar un lote o "
    "una caducidad es peor que dejarlos vacíos, porque nadie los va a volver a "
    "mirar. No estimes cantidad ni peso: eso no se lee de una foto.\n"
    "Responde solo el JSON."
)

_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def extract(
    db: Session,
    image_url: str,
    user_id: UUID | None,
    center_id: UUID | None = None,
) -> dict[str, str | None]:
    """Campos leídos de la etiqueta. Diccionario vacío si la IA no está.

    Vacío y "no se pudo leer nada" son lo mismo para quien captura: teclea como
    siempre. Que la IA no esté nunca puede impedir registrar una donación.
    """
    if not image_url:
        return {}

    try:
        budget.ensure_available(db, CAPABILITY, user_id=user_id)
    except AIDisabled as exc:
        logger.debug("OCR no disponible: %s", exc)
        return {}

    # La URL firmada cambia en cada petición aunque la foto sea la misma, así
    # que la clave se arma con el objeto y no con la URL: si no, la caché nunca
    # acertaría y cada vista de la misma foto se cobraría de nuevo.
    clave = budget.cache_key(CAPABILITY, {"objeto": _storage_key(image_url)})

    campos = budget.cached(clave)
    if campos is None:
        try:
            resultado = get_provider().extract_from_image(_PROMPT, image_url)
        except AIUnavailable as exc:
            logger.info("El proveedor de IA no respondió al leer la etiqueta: %s", exc)
            return {}

        budget.record_usage(
            db, CAPABILITY, resultado.input_tokens, resultado.output_tokens,
            user_id=user_id, center_id=center_id,
        )
        campos = _clean(resultado.data)
        budget.store(clave, campos)

    return campos


def _storage_key(image_url: str) -> str:
    """La ruta del objeto, sin la firma ni sus parámetros."""
    return image_url.split("?", 1)[0]


def _clean(data: dict) -> dict[str, str | None]:
    """Se queda con los cinco campos y descarta lo que no sirva.

    Un modelo puede devolver campos de más, cadenas vacías o una fecha con otro
    formato. Nada de eso debe llegar a un formulario: un campo pre-llenado con
    basura cuesta más de corregir que uno vacío.
    """
    limpio: dict[str, str | None] = {}

    for campo in FIELDS:
        valor = data.get(campo)
        if valor is None or not str(valor).strip():
            continue
        texto = str(valor).strip()

        if campo == "expiry_date":
            if not _DATE.match(texto):
                continue
            try:
                date.fromisoformat(texto)
            except ValueError:
                # Una fecha imposible (un 31 de febrero) se descarta: entra al
                # campo que decide si la caja se acepta.
                continue

        limpio[campo] = texto

    return limpio
