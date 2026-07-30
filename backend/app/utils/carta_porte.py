"""Anexo de datos Carta Porte 3.1 (Fase 21, task 6).

**Araguaney no timbra.** Este anexo es el insumo que el transportista (CFDI de
ingreso) o el centro con medios propios (CFDI de traslado) le entrega a su PAC.
Aquí no hay CSD, ni RFC, ni sello, y no debe parecer un CFDI a medio hacer: es
la parte de mercancías que solo nosotros podemos llenar, porque nosotros somos
quienes registraron caja por caja qué va dentro.

De ahí la regla que gobierna todo el archivo: **un dato que no tenemos se
declara faltante, nunca se inventa.** Una clave del SAT equivocada en un
documento fiscal es peor que una celda vacía — la vacía la llena quien timbra y
la equivocada la descubre la autoridad.

Eso incluye no derivar la clave del SAT del código UNSPSC que ya guardamos.
Ambos catálogos son de ocho dígitos y el del SAT nació de UNSPSC, pero
`ClaveProdServCP` es un subconjunto propio con sus propias reglas: copiar uno
sobre otro sería inventar un dato fiscal con apariencia de correcto, que es la
peor clase de dato equivocado.
"""

from dataclasses import dataclass, field
from decimal import Decimal

# Kilogramo en el catálogo c_ClaveUnidad del SAT. Es el único que este anexo
# necesita fijar, porque todo el peso del sistema está en kilos.
_UNIDAD_PESO = "KGM"

# Unidad genérica ("pieza") cuando la del centro no mapea a una clave conocida.
# Cae aquí a propósito y lo declara: un exporte que no sale por una unidad rara
# le sirve menos a quien timbra que uno que sale marcando qué revisar.
_CLAVE_UNIDAD_DEFAULT = "H87"

_AVISO = (
    "Anexo de datos para el complemento Carta Porte 3.1. NO es un comprobante "
    "fiscal ni un CFDI: no lleva RFC, certificado ni sello. Lo emite quien "
    "transporta o quien traslada con medios propios, a través de su PAC. Las "
    "claves del SAT deben validarse antes de timbrar."
)


@dataclass
class CartaPorteMercancia:
    descripcion: str
    cantidad: int
    unidad: str
    sat_product_key: str | None = None
    unspsc_code: str | None = None
    clave_unidad: str | None = None
    peso_kg: Decimal | None = None


@dataclass
class CartaPorteData:
    shipment_reference: str | None
    origen: str | None
    destino: str | None
    peso_bruto_total: Decimal | None
    numero_bultos: int
    mercancias: list[CartaPorteMercancia] = field(default_factory=list)


def missing_fields(data: CartaPorteData) -> list[str]:
    """Qué le falta al anexo para poder timbrarse, en español y por renglón.

    Es la parte más útil del archivo: quien lo recibe sabe exactamente qué
    completar, en vez de descubrirlo cuando el PAC rechaza el timbrado.
    """
    faltantes: list[str] = []

    if data.peso_bruto_total is None:
        faltantes.append(
            "Peso bruto total: ninguna tarima de este envío tiene peso de báscula."
        )
    if not data.origen:
        faltantes.append("Origen: falta el domicilio del centro que despacha.")
    if not data.destino:
        faltantes.append("Destino: falta el domicilio de entrega.")

    for m in data.mercancias:
        if not m.sat_product_key:
            faltantes.append(
                f"«{m.descripcion}»: falta la clave de producto/servicio del SAT "
                f"(ClaveProdServCP)."
            )
        if m.peso_kg is None:
            faltantes.append(f"«{m.descripcion}»: falta el peso en kg.")
        if not m.clave_unidad:
            faltantes.append(
                f"«{m.descripcion}»: la unidad «{m.unidad}» no tiene clave del SAT; "
                f"se declara como {_CLAVE_UNIDAD_DEFAULT} (pieza) y hay que revisarla."
            )

    return faltantes


def build_annex(data: CartaPorteData) -> dict:
    """El anexo, listo para serializar a JSON o volcarse a una hoja."""
    return {
        "_aviso": _AVISO,
        "_faltantes": missing_fields(data),
        "Referencia": data.shipment_reference,
        "Origen": data.origen,
        "Destino": data.destino,
        "PesoBrutoTotal": _decimal(data.peso_bruto_total),
        "UnidadPeso": _UNIDAD_PESO,
        "NumeroBultos": data.numero_bultos,
        "NumTotalMercancias": len(data.mercancias),
        "mercancias": [
            {
                "Descripcion": m.descripcion,
                # Nunca se rellena desde UNSPSC: ver el encabezado del módulo.
                "ClaveProdServCP": m.sat_product_key or None,
                "Cantidad": m.cantidad,
                "ClaveUnidad": m.clave_unidad or _CLAVE_UNIDAD_DEFAULT,
                "Unidad": m.unidad,
                "PesoEnKg": _decimal(m.peso_kg),
            }
            for m in data.mercancias
        ],
    }


def _decimal(valor: Decimal | None) -> str | None:
    """Tres decimales, como el resto del sistema. `None` se queda `None`."""
    return None if valor is None else f"{Decimal(valor):.3f}"
