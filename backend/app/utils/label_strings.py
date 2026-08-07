"""Textos de las etiquetas impresas, en los dos idiomas del panel.

La etiqueta se imprime desde el panel, así que sigue el idioma que esa persona
eligió, igual que el resto de lo que ve. Antes estaba fija en español, lo que
dejaba a un centro operando en inglés con una etiqueta que no podía leer del
todo — y con una discrepancia peor: la etiqueta que el cliente dibuja sin
conexión sí se traducía, así que la misma caja podía salir con dos textos
distintos según quién la imprimiera.

**Solo se traducen las palabras del formulario.** El nombre del producto, el
lote y el nombre del centro salen como se capturaron: son datos, no interfaz, y
traducirlos inventaría un producto que nadie dio de alta.

Idiomas: los mismos que el panel (`es`, `en`). Un idioma desconocido cae en
español en vez de reventar: una etiqueta en el idioma equivocado se lee igual,
una excepción en un trabajo de fondo deja a alguien sin etiquetas y sin saber
por qué.
"""

from __future__ import annotations

LABEL_STRINGS: dict[str, dict[str, str]] = {
    "es": {
        "quantity": "Cant",
        "batch": "Lote",
        "expiry": "Cad",
        "status": "Estado",
        "closed": "Cerrada",
        "boxes_one": "caja",
        "boxes_many": "cajas",
        "boxes_in_pallet": "Cajas en esta tarima:",
        "status_OPEN": "Abierta",
        "status_CLOSED": "Cerrada",
        "status_SHIPPED": "Enviada",
        "footer": "Documento generado con Araguaney · araguaney.lat",
    },
    "en": {
        "quantity": "Qty",
        "batch": "Batch",
        "expiry": "Exp",
        "status": "Status",
        "closed": "Closed",
        "boxes_one": "box",
        "boxes_many": "boxes",
        "boxes_in_pallet": "Boxes on this pallet:",
        "status_OPEN": "Open",
        "status_CLOSED": "Closed",
        "status_SHIPPED": "Shipped",
        "footer": "Document generated with Araguaney · araguaney.lat",
    },
}

DEFAULT_LANG = "es"


def strings_for(lang: str | None) -> dict[str, str]:
    return LABEL_STRINGS.get((lang or DEFAULT_LANG).lower(), LABEL_STRINGS[DEFAULT_LANG])


def date_format_for(lang: str | None) -> str:
    """`dd/mm/aaaa` o `mm/dd/yyyy`.

    En una etiqueta de caducidad la ambigüedad no es cosmética: 03/04 son dos
    meses distintos, y quien la lee no tiene forma de saber cuál se usó.
    """
    return "%m/%d/%Y" if (lang or DEFAULT_LANG).lower() == "en" else "%d/%m/%Y"
