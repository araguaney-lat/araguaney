"""Corre el conjunto de referencia contra el pipeline real de producción.

La versión anterior de este script le hablaba al proveedor con un prompt
propio, sin catálogo y sin pasar por `text_mapping.suggest()` /
`label_ocr.extract()`: medía un modelo distinto al que de verdad está
encendido. Esta versión llama exactamente a esas dos funciones, contra una
base SQLite efímera sembrada con el catálogo global real
(`app/seeds/common_food.py`, `who_medicines.py`, `iom_nonfood.py`) — el mismo
que corre en producción, no uno inventado para la prueba.

Se ejecuta a mano, nunca en CI: aquí sí sale tráfico de red real y sí se gasta
dinero (unos centavos de dólar por corrida completa).

    AI_API_KEY=sk-... python -m evals.run --capability mapping
    AI_API_KEY=sk-... AI_MODEL=deepseek-chat python -m evals.run --capability mapping

`--capability ocr` no puede correr todavía: `evals/ocr_cases.json` declara
`image_ref` como una clave en "el almacenamiento de evaluación de cada
quien", y ese almacenamiento no existe — no hay fotos de etiqueta en este
repo (a propósito: pueden llevar datos personales incidentales). Correrlo
exige que alguien suba unas fotos reales de etiqueta y apunte los
`image_ref` a URLs alcanzables por la API de visión.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
import uuid

from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    """The eval catalog is SQLite-only; production's JSONB columns (audit_log,
    product_mapping_choices, ...) need a stand-in or `create_all` fails on the
    very first table. Same shim every `tests/tenant/conftest.py`-style fixture
    already registers — this script just isn't one of those fixtures."""
    return "JSON"


import app.models  # noqa: E402,F401 — registers every model on Base before create_all
from app.config import settings
from app.database import Base
from app.models.product_type import ProductType
from app.seeds._base import build_rows
from app.seeds.common_food import FOOD
from app.seeds.iom_nonfood import NONFOOD
from app.seeds.who_medicines import MEDICINES
from app.services.ai import budget, text_mapping
from app.services.ai.evaluation import MappingCase, evaluate_mapping

AQUI = pathlib.Path(__file__).parent

# Cada caso de `mapping_cases.json` trae un `expected_slug` que nunca existió
# como columna real (`ProductType` no tiene `slug`): es un identificador de
# conveniencia del propio archivo de casos. Este diccionario es lo que lo
# vuelve ejecutable contra el catálogo real — un fragmento de texto que debe
# aparecer en el `display_name` real de exactamente un producto sembrado.
#
# Un slug ausente de aquí no se inventa: el caso se omite y se reporta aparte.
# Cinco quedaron fuera porque el catálogo semilla de hoy sencillamente no
# tiene ese producto (agua embotellada, jabón de lavandería, pilas) o el
# nombre real no coincide con suficiente certeza (guante de látex vs. los de
# nitrilo/carnaza que sí existen) — un hueco real del catálogo, no del modelo.
_SLUG_TO_REAL_PRODUCT = {
    "atun-lata": "Atún en lata",
    "cobija": "Cobija de lana",
    "paracetamol-500": "Paracetamol 500mg tableta",
    "ibuprofeno-400": "Ibuprofeno 400mg tableta",
    "arroz": "Arroz blanco",
    "frijol": "Frijol negro",
    "aceite-comestible": "Aceite vegetal",
    "panal": "Pañal desechable talla M",
    "toalla-femenina": "Toallas sanitarias",
    "jabon-tocador": "Jabón de tocador",
    "pasta-dental": "Pasta dental",
    "cepillo-dental": "Cepillo dental adulto",
    "papel-higienico": "Papel higiénico",
    "gel-antibacterial": "Gel antibacterial",
    "cubrebocas": "Cubrebocas N95",
    "venda": "Venda elástica",
    "gasa": "Gasa estéril",
    "alcohol": "Alcohol etílico",
    "linterna": "Linterna LED de mano",
    "bota-hule": "Botas de hule impermeables",
    "pala": "Pala recta con mango",
}


def _load(nombre: str) -> list[dict]:
    return json.loads((AQUI / nombre).read_text())["cases"]


def _seed_catalog(db: Session) -> dict[str, uuid.UUID]:
    """Siembra el catálogo global real y devuelve display_name → id.

    Las tres listas son datos puros (`list[dict]`), las mismas que insertan
    las migraciones 025-027 en producción — no una versión resumida para la
    prueba.
    """
    ids_by_name: dict[str, uuid.UUID] = {}
    for rows in (FOOD, MEDICINES, NONFOOD):
        for row in build_rows(rows):
            db.add(ProductType(campaign_id=None, **row))
            ids_by_name[row["display_name"]] = row["id"]
    db.commit()
    return ids_by_name


def _find_real_product_id(
    ids_by_name: dict[str, uuid.UUID], fragment: str
) -> uuid.UUID | None:
    """The one product whose real `display_name` contains `fragment`.

    A dict keyed by the *exact* full name would break every time a seed
    tweaks a unit or a size ("Pasta dental" vs. "Pasta dental 100 ml"); this
    only needs the fragment `_SLUG_TO_REAL_PRODUCT` names to still show up
    somewhere in whatever the real name became.
    """
    matches = [pid for name, pid in ids_by_name.items() if fragment in name]
    return matches[0] if len(matches) == 1 else None


def _resolve_mapping_cases(
    ids_by_name: dict[str, uuid.UUID],
) -> tuple[list[MappingCase], list[str]]:
    """Casos que sí tienen un producto real que jugar, y los slugs que no."""
    resolved: list[MappingCase] = []
    skipped: list[str] = []
    for raw in _load("mapping_cases.json"):
        slug = raw["expected_slug"]
        target_name = _SLUG_TO_REAL_PRODUCT.get(slug)
        product_id = _find_real_product_id(ids_by_name, target_name) if target_name else None
        if product_id is None:
            if slug not in skipped:
                skipped.append(slug)
            continue
        resolved.append(MappingCase(raw["text"], str(product_id)))
    return resolved, skipped


def _run_mapping(db: Session) -> tuple:
    ids_by_name = _seed_catalog(db)
    cases, skipped = _resolve_mapping_cases(ids_by_name)
    # A synthetic user is enough: `ensure_available` only checks that one was
    # passed, never that it resolves to a real row.
    user_id = uuid.uuid4()

    def sugerir(texto: str) -> list[str]:
        productos = text_mapping.suggest(db, texto, user_id=user_id, campaign_ids=None)
        return [str(pt.id) for pt in productos]

    return evaluate_mapping(cases, sugerir), skipped


def _run_ocr() -> int:
    print(
        "No se puede correr todavía: evals/ocr_cases.json apunta a fotos que\n"
        "no existen en este repositorio (a propósito — pueden llevar datos\n"
        "personales incidentales, y ninguna fue capturada aún).\n\n"
        "Para correrlo de verdad: sube unas fotos reales de etiqueta a donde\n"
        "sea que resuelva image_ref en tu entorno (una URL que la API de\n"
        "visión pueda alcanzar) y actualiza evals/ocr_cases.json con esas\n"
        "referencias y los campos correctos leídos a mano de cada una.",
        file=sys.stderr,
    )
    return 2


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capability", choices=("mapping", "ocr"), required=True)
    args = parser.parse_args()

    if args.capability == "ocr":
        return _run_ocr()

    if not settings.ai_api_key:
        print("Falta AI_API_KEY en el entorno.", file=sys.stderr)
        return 2

    # Solo para esta corrida: la bandera de producción no se toca. Un catálogo
    # local efímero no puede agotar el tope real, así que no hay riesgo de
    # apagar la capacidad para nadie más.
    settings.ai_enable_text_mapping = True

    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine, expire_on_commit=False)()

    try:
        reporte, skipped = _run_mapping(db)
        costo = budget.month_spend_usd(db)
    finally:
        db.close()
        engine.dispose()

    print(reporte.summary())
    print(f"\nCosto de la corrida: ${costo:.4f}")
    if skipped:
        print(
            f"\n{len(skipped)} casos omitidos — su producto no existe en el "
            f"catálogo semilla real hoy: {', '.join(skipped)}"
        )
    if reporte.failures:
        print(f"\nFallos ({len(reporte.failures)}):")
        for fallo in reporte.failures[:20]:
            print(f"  · {fallo}")

    # El código de salida es el veredicto: 0 si supera su umbral, 1 si no. Así
    # la decisión de encender no depende de leer bien una tabla.
    print(
        "\n"
        + (
            "SUPERA el umbral: puede encenderse"
            if reporte.passed
            else "NO supera el umbral: no se enciende"
        )
    )
    return 0 if reporte.passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
