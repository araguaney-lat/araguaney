"""Declaración de mercancías de un envío (Fase 21).

Araguaney es software y opera en varios países. Eso fija la frontera de este
módulo con bastante precisión:

- **De este lado.** Qué hay en las cajas, cuánto pesan, cuántos bultos son, de
  dónde salen y a dónde van. Lo sabemos porque lo registramos caja por caja, y
  es igual de cierto en México que en Colombia o en Chile.
- **Del otro lado.** Cualquier regla tributaria de cualquier país. No las
  conocemos, no las interpretamos y no queremos aprenderlas: cubrir todos los
  escenarios fiscales posibles es una carrera que se pierde sola, y nos pondría
  a opinar sobre algo que no nos toca.

Entre los dos están los datos que el centro captura sobre sí mismo — razón
social, identificación fiscal, domicilio. Esos se imprimen tal cual. Es mezcla
de correspondencia, no interpretación: no se valida el formato de una
identificación fiscal, porque un RFC mexicano, un RIF venezolano y un EIN
estadounidense no se parecen en nada.

El **código de mercancía es HS** (Sistema Armonizado de la OMA), que usan casi
200 países en aduana. Para carga que cruza fronteras, el código de un solo
régimen sería el código equivocado.

Los **perfiles de país** son traducciones de nombres de campo, nada más. No
siembran códigos, no validan formatos y no explican reglas.
"""

from dataclasses import dataclass, field
from decimal import Decimal

_NOTICE = (
    "Declaración de mercancías generada por Araguaney a partir del inventario "
    "registrado. NO es un comprobante fiscal ni una declaración aduanal: es el "
    "insumo con los datos de la carga, para que quien transporta o quien "
    "despacha lo use con su asesor o su proveedor de timbrado. Los datos del "
    "emisor son los que capturó el propio centro."
)


@dataclass
class DeclarationIssuer:
    """Quien despacha. Todo lo captura el centro sobre sí mismo."""

    legal_name: str | None = None
    tax_id: str | None = None
    address: str | None = None
    country_code: str | None = None


@dataclass
class DeclarationLine:
    description: str
    quantity: int
    unit: str
    hs_code: str | None = None
    weight_kg: Decimal | None = None


@dataclass
class DeclarationData:
    reference: str | None
    issuer: DeclarationIssuer
    origin: str | None
    destination: str | None
    gross_weight_kg: Decimal | None
    packages: int
    lines: list[DeclarationLine] = field(default_factory=list)


def missing_fields(data: DeclarationData) -> list[str]:
    """Qué le falta al documento, en español y por renglón.

    Es la parte más útil del módulo: quien lo recibe sabe qué completar antes de
    llevarlo a su despachante, en vez de descubrirlo en la ventanilla.
    """
    missing: list[str] = []

    if data.gross_weight_kg is None:
        missing.append(
            "Peso bruto total: ninguna tarima de este envío tiene peso de báscula."
        )
    if not data.issuer.legal_name:
        missing.append("Razón social del centro que despacha (se captura en el centro).")
    if not data.issuer.tax_id:
        missing.append(
            "Identificación fiscal del centro que despacha (se captura en el centro)."
        )
    if not data.issuer.address:
        missing.append("Domicilio del centro que despacha.")
    if not data.destination:
        missing.append("Destino del envío.")

    for line in data.lines:
        if line.weight_kg is None:
            missing.append(f"«{line.description}»: falta el peso en kg.")
        if not line.hs_code:
            missing.append(
                f"«{line.description}»: falta el código arancelario (HS) del producto."
            )

    return missing


def _universal(data: DeclarationData) -> dict:
    return {
        "_notice": _NOTICE,
        "_missing": missing_fields(data),
        "reference": data.reference,
        "issuer": {
            "legal_name": data.issuer.legal_name,
            "tax_id": data.issuer.tax_id,
            "address": data.issuer.address,
            "country_code": data.issuer.country_code,
        },
        "origin": data.origin,
        "destination": data.destination,
        "gross_weight_kg": _decimal(data.gross_weight_kg),
        "weight_unit": "KGM",       # kilogramo, código de unidad UN/CEFACT
        "packages": data.packages,
        "total_lines": len(data.lines),
        "lines": [
            {
                "description": line.description,
                "hs_code": line.hs_code or None,
                "quantity": line.quantity,
                "unit": line.unit,
                "weight_kg": _decimal(line.weight_kg),
            }
            for line in data.lines
        ],
    }


def _mx_carta_porte(doc: dict) -> dict:
    """Traduce los nombres de campo al complemento Carta Porte de México.

    Solo nombres. `ClaveProdServCP` queda vacía a propósito: es un catálogo
    propio del SAT y derivarla del HS o del UNSPSC sería inventar un dato fiscal
    con apariencia de correcto, que es la peor clase de dato equivocado. La
    llena quien timbra.
    """
    return {
        **doc,
        "PesoBrutoTotal": doc["gross_weight_kg"],
        "UnidadPeso": doc["weight_unit"],
        "NumeroBultos": doc["packages"],
        "NumTotalMercancias": doc["total_lines"],
        "mercancias": [
            {
                "Descripcion": line["description"],
                "ClaveProdServCP": None,
                "FraccionArancelaria": line["hs_code"],
                "Cantidad": line["quantity"],
                "Unidad": line["unit"],
                "PesoEnKg": line["weight_kg"],
            }
            for line in doc["lines"]
        ],
    }


# Perfiles disponibles. Deliberadamente pocos: cada uno que se agregue es un
# compromiso de mantenerlo al día con un régimen que no controlamos.
COUNTRY_PROFILES = {"MX_CARTA_PORTE": _mx_carta_porte}


def build_declaration(data: DeclarationData, profile: str | None = None) -> dict:
    """El documento. Con perfil, además de los campos universales.

    Un perfil desconocido cae al universal en vez de fallar: un nombre mal
    escrito no puede dejar sin documento a quien está por despachar.
    """
    doc = _universal(data)
    translator = COUNTRY_PROFILES.get(profile or "")
    return translator(doc) if translator else doc


def _decimal(valor: Decimal | None) -> str | None:
    return None if valor is None else f"{Decimal(valor):.3f}"
