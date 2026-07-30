"""Pesaje y perfiles de paletizado (Fase 21).

El peso vive en dos niveles y no son intercambiables:

- **Estimado por caja.** Sale del catálogo (`unit_weight_kg × cantidad`) y sirve
  para los documentos de contenido. Nadie pesa caja por caja en un centro de
  acopio con voluntarios y una sola báscula.
- **Bruto por tarima.** Es el que la cadena aérea valida, y el que viaja a los
  documentos de transporte. Cuando existe, manda sobre la suma de estimados: la
  báscula tiene razón por definición.

Todo lo de aquí son funciones puras. La discrepancia entre ambos niveles se
muestra y nunca bloquea; el perfil de altura advierte y tampoco bloquea, porque
quien está en el andén ve la tarima y el sistema no.
"""

from decimal import Decimal

# Catálogo corto, en código y no en tabla: son restricciones físicas de la
# aviación, no datos que cada centro configure. Los centímetros incluyen la base
# de la tarima, que es justo lo que la gente olvida contar.
HEIGHT_PROFILES: dict[str, int | None] = {
    "LOWER_DECK_160": 160,      # bodega inferior de fuselaje angosto
    "XRAY_170": 170,            # arco de rayos X de carga
    "MAIN_DECK_180": 180,       # cubierta principal de carguero
    "SIN_RESTRICCION": None,
}

_MAX_HEIGHT_CM = 400            # más alto que cualquier bodega: es un dedazo


def estimated_box_weight(unit_weight_kg: Decimal | None, quantity: int) -> Decimal | None:
    """Peso estimado de una caja según el catálogo.

    Sin peso unitario no se inventa un número: este dato viaja a documentos, y
    un estimado falso es peor que un campo vacío.
    """
    if unit_weight_kg is None or quantity is None or quantity <= 0:
        return None
    return (Decimal(unit_weight_kg) * quantity).quantize(Decimal("0.001"))


def net_weight(gross: Decimal | None, tare: Decimal | None) -> Decimal | None:
    """Neto = bruto − tara. Sin bruto no hay neto que calcular."""
    if gross is None:
        return None
    neto = Decimal(gross) - Decimal(tare or 0)
    # Un neto negativo significa que alguien capturó mal la tara o el bruto.
    # Devolver el número sería propagar el error a un manifiesto.
    return neto if neto >= 0 else None


def weight_discrepancy(net: Decimal | None, estimated: Decimal | None) -> Decimal | None:
    """Diferencia entre lo pesado y lo estimado. Informativa, nunca bloqueante.

    Una diferencia grande suele significar que el catálogo tiene pesos unitarios
    flojos, no que la tarima esté mal armada.
    """
    if net is None or estimated is None:
        return None
    return Decimal(net) - Decimal(estimated)


def height_warning(height_cm: int | None, profile: str | None) -> str | None:
    """Aviso si la tarima no cabe en el perfil declarado por el envío.

    Un perfil desconocido no levanta error: un dato viejo o mal escrito no puede
    impedir que se cierre una tarima.
    """
    if height_cm is None or not profile:
        return None

    limite = HEIGHT_PROFILES.get(profile)
    if limite is None or height_cm <= limite:
        return None

    return (
        f"Esta tarima mide {height_cm} cm y el envío declara un perfil de "
        f"{limite} cm. Habrá que bajarla o cambiar el perfil del envío."
    )


def validate_weighing(gross_weight_kg: Decimal | None, height_cm: int | None) -> None:
    """Rechaza lo que no puede ser un pesaje real. Levanta `api_error`."""
    from app.utils.errors import api_error

    if gross_weight_kg is not None and Decimal(gross_weight_kg) <= 0:
        raise api_error(
            "INVALID_WEIGHT",
            "El peso bruto debe ser mayor que cero",
            field="gross_weight_kg",
        )
    if height_cm is not None and not (0 < height_cm <= _MAX_HEIGHT_CM):
        raise api_error(
            "INVALID_HEIGHT",
            f"La altura debe estar entre 1 y {_MAX_HEIGHT_CM} cm",
            field="height_cm",
        )
