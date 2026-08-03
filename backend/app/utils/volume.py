"""Umbral de volumen atípico en donaciones (Fase 20, task 10).

El escrutinio por tipo de donante tiene una evasión obvia: registrarse como
persona física. El umbral la cierra — a partir de cierto volumen el anonimato se
acaba, sea quien sea.

Es un **umbral de escalamiento, no un tope duro**. Un tope invita a partir la
donación en pedazos por debajo del límite, que es la técnica clásica, y además
rechazaría al donante grande de buena fe justo después de una emergencia. Lo que
hace este control es quitar el anonimato, no impedir la donación.

Se mide con lo que el sistema ya tiene: número de cajas y peso cuando exista. No
hay valor comercial que medir, y eso es deliberado: la plataforma no tasa bienes.

**El valor operativo vive solo en el entorno.** Este repositorio es público y un
umbral publicado es un umbral que se puede rodear por diseño. Sin configurar, el
control queda apagado: encenderlo es decisión de quien opera, que es quien sabe
qué volumen es normal en su contexto.
"""

import os

_BOXES_ENV = "DONATION_VOLUME_THRESHOLD_BOXES"
_KG_ENV = "DONATION_VOLUME_THRESHOLD_KG"


def _threshold(name: str) -> float | None:
    """Lee el umbral del entorno. Sin valor o con basura, no hay umbral.

    Una variable mal escrita no puede impedir que un centro capture donaciones:
    el costo de fallar cerrado aquí lo paga la operación en plena emergencia.
    """
    raw = os.environ.get(name)
    if not raw:
        return None
    try:
        value = float(raw)
    except ValueError:
        return None
    return value if value > 0 else None


def exceeds_volume_threshold(boxes: int, kg: float | None) -> bool:
    """¿Esta donación entra en volumen atípico? Cualquiera de los dos basta."""
    max_boxes = _threshold(_BOXES_ENV)
    if max_boxes is not None and boxes > max_boxes:
        return True

    max_kg = _threshold(_KG_ENV)
    if max_kg is not None and kg is not None and kg > max_kg:
        return True

    return False
