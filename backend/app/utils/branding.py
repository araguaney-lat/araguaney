"""Atribución al pie de los documentos que genera Araguaney.

**Es atribución, no publicidad.** Lo importante de un manifiesto es lo que dice
de la carga; la marca va al pie, en gris, del tamaño de la letra chica. Quien
lee el documento tiene que poder saber con qué se hizo —para pedir una copia,
para verificar un QR, para reclamar un error— sin que eso le quite espacio ni
atención al contenido.

**Y dice "generado con", no "coordinado por".** El pie anterior decía
"Araguaney · Coordinación humanitaria", que en un documento de aduana se puede
leer como que Araguaney es parte del envío. No lo es: el centro lo es. Araguaney
es el software que imprimió la hoja, y la diferencia importa justo en la mesa
donde alguien revisa quién responde por la carga.

El logo se lee del disco y no de una URL: el documento lo arma un trabajo de
fondo, y un pie de página no puede depender de que el worker tenga salida a
internet en ese instante.
"""

from __future__ import annotations

import base64
from functools import lru_cache
from pathlib import Path

LOGO_PATH = Path(__file__).resolve().parent.parent / "assets" / "logo.png"

ATTRIBUTION = {
    "es": "Documento generado con Araguaney",
    "en": "Document generated with Araguaney",
}

SITE = "araguaney.lat"


def attribution_for(lang: str | None) -> str:
    return ATTRIBUTION.get((lang or "es").lower(), ATTRIBUTION["es"])


@lru_cache(maxsize=1)
def logo_data_uri() -> str:
    """El logo como `data:` para incrustarlo en el HTML de WeasyPrint.

    Se cachea porque un manifiesto de cien tarimas renderiza una sola vez, pero
    el worker genera documentos todo el día y volver a leer y codificar el mismo
    archivo en cada uno no compra nada.

    Devuelve cadena vacía si el archivo falta: un pie sin logo sigue siendo un
    documento válido, y una excepción aquí dejaría a alguien sin manifiesto en
    el andén por un adorno.
    """
    try:
        return "data:image/png;base64," + base64.b64encode(LOGO_PATH.read_bytes()).decode()
    except OSError:
        return ""
