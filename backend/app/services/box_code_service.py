"""Códigos de caja pre-asignados (Fase 25, tasks 4 y 5).

Un centro reserva un bloque con conexión y lo consume sin ella. Sin código no
hay etiqueta imprimible, y en un centro con prisa nadie vuelve a tocar una caja
ya cerrada para etiquetarla después: o sale con su etiqueta, o sale sin ella
para siempre.

Dos propiedades sostienen el resto:

1. **Un código reservado no es inventario.** Mientras `used_at` sea `NULL` es un
   número apartado, y no cuenta en ningún reporte ni en ningún conteo. Un bloque
   que nadie usó no ensucia nada.
2. **Se consume una vez y solo en su centro.** Consumirlo dos veces crearía dos
   cajas con la misma etiqueta, que es peor que no tener etiqueta: dos bultos
   distintos que el manifiesto dice que son el mismo.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.box_code_reservation import BoxCodeReservation
from app.utils.errors import api_error

# Un bloque cubre una jornada de captura sin conexión con margen. Pedir de más
# no cuesta —son filas apartadas, no cajas— pero un tope evita que un cliente
# en bucle reserve un millón de códigos.
MAX_BLOCK = 200


def _new_code() -> str:
    """Mismo formato que genera el intake en línea.

    La etiqueta impresa no distingue si la caja se capturó con señal o sin ella,
    y quien la lee en un andén tampoco debería tener que distinguirlo.
    """
    return f"BX-{secrets.token_urlsafe(6).upper()}"


def reserve(db: Session, center_id: UUID, user_id: UUID, count: int) -> list[str]:
    """Aparta `count` códigos para el centro y los devuelve."""
    if count < 1 or count > MAX_BLOCK:
        raise api_error(
            "INVALID_COUNT",
            f"Se puede reservar entre 1 y {MAX_BLOCK} códigos",
            field="count",
        )

    codigos = [_new_code() for _ in range(count)]
    db.add_all([
        BoxCodeReservation(code=codigo, center_id=center_id, reserved_by_user_id=user_id)
        for codigo in codigos
    ])
    db.commit()
    return codigos


def available(db: Session, center_id: UUID) -> int:
    """Cuántos códigos sin usar le quedan al centro.

    El cliente lo consulta para reponer antes de bajar al sótano, que es el
    único momento en que puede.
    """
    return int(db.execute(
        select(func.count(BoxCodeReservation.id))
        .where(BoxCodeReservation.center_id == center_id,
               BoxCodeReservation.used_at.is_(None))
    ).scalar_one() or 0)


def claim(db: Session, code: str, center_id: UUID) -> BoxCodeReservation:
    """Reclama un código y lo marca usado, **antes** de crear la caja.

    El orden importa. Si la caja se creara primero, el `unique` de `boxes.code`
    saltaría antes que esta comprobación y el cliente recibiría un error opaco
    en vez de "ya se usó". Un cliente offline necesita esa distinción: con ella
    cierra la captura encolada, sin ella la reintenta para siempre.

    Levanta si el código no existe, es de otro centro o ya se consumió. Ese
    último caso importa: dos cajas con la misma etiqueta son dos bultos que el
    manifiesto declara como uno.
    """
    reserva = db.execute(
        select(BoxCodeReservation).where(BoxCodeReservation.code == code)
    ).scalars().first()

    if reserva is None:
        raise api_error("CODE_NOT_RESERVED", f"El código {code} no está reservado", field="code")
    if reserva.center_id != center_id:
        # Mismo mensaje que "no existe": un centro no debe poder averiguar qué
        # códigos apartó otro probando cuál da un error distinto.
        raise api_error("CODE_NOT_RESERVED", f"El código {code} no está reservado", field="code")
    if reserva.used_at is not None:
        raise api_error("CODE_ALREADY_USED", f"El código {code} ya fue usado", field="code")

    reserva.used_at = datetime.now(tz=timezone.utc)
    return reserva
