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

`--capability ocr` lee las fotos de una carpeta local, `evals/labels/` por
omisión (`--labels-dir` la cambia). Esas fotos **no se versionan** y la
carpeta está en `.gitignore`: pueden llevar datos personales de refilón —el
nombre de quien recibió el medicamento en la etiqueta de la farmacia— y este
repositorio es público, donde un push no se deshace. Al repositorio sube solo
`ocr_cases.json`, que es donde está el trabajo de verdad: la respuesta
correcta de cada foto, escrita a mano antes de que el modelo la viera.

    AI_API_KEY=sk-... python -m evals.run --capability ocr
    AI_API_KEY=sk-... python -m evals.run --capability ocr --labels-dir ~/etiquetas

No hace falta subir las fotos a ningún lado: viajan incrustadas en la llamada,
por la misma vía que usa el formulario de captura.
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
from app.services.ai import budget, label_ocr, text_mapping
from app.services.ai.evaluation import (
    EvalReport,
    MappingCase,
    OCRCase,
    evaluate_mapping,
    evaluate_ocr,
)

AQUI = pathlib.Path(__file__).parent

# Las fotos de etiqueta no se versionan (ver el docstring): esta carpeta está
# en `.gitignore` y la llena quien corre la evaluación.
LABELS_DIR = AQUI / "labels"

# Los tres formatos que `extract_from_bytes` acepta, por extensión. Un `.gif`
# se rechaza aquí y no tras pagar la llamada.
_CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}

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


def _load_ocr_cases(
    cases_file: pathlib.Path = AQUI / "ocr_cases.json",
    labels_dir: pathlib.Path = LABELS_DIR,
) -> list[OCRCase]:
    """Los casos con `image_ref` ya resuelto a una ruta absoluta del disco.

    El archivo declara solo el nombre del archivo y no una ruta completa: son
    cien renglones escritos a mano y la carpeta puede estar en otro lado en
    cada máquina.
    """
    return [
        OCRCase(image_ref=str(labels_dir / raw["image_path"]), expected=raw["expected"])
        for raw in json.loads(cases_file.read_text())["cases"]
    ]


def _check_photos(cases: list[OCRCase]) -> list[str]:
    """Todo lo que impediría leer una foto, junto y antes de gastar un peso.

    Cada llamada cuesta dinero, así que descubrir en el caso 60 que el 61 tiene
    el nombre mal escrito es pagar 60 llamadas para enterarse. Se revisa el
    conjunto entero primero y se aborta si algo falta: la corrida completa o
    ninguna.
    """
    problemas: list[str] = []

    for caso in cases:
        ruta = pathlib.Path(caso.image_ref)
        if not ruta.is_file():
            problemas.append(f"{ruta.name}: no está en {ruta.parent}")
            continue
        if ruta.suffix.lower() not in _CONTENT_TYPES:
            problemas.append(
                f"{ruta.name}: formato no admitido "
                f"(se admiten {', '.join(sorted(_CONTENT_TYPES))})"
            )
            continue
        peso = ruta.stat().st_size
        if peso > label_ocr.MAX_IMAGE_BYTES:
            problemas.append(
                f"{ruta.name}: pesa {peso / 1024 / 1024:.1f} MB y el máximo es "
                f"{label_ocr.MAX_IMAGE_BYTES // (1024 * 1024)} MB. Guarda la foto "
                "al tamaño que manda la aplicación (lado largo 1600 px)."
            )

    return problemas


def _run_ocr(
    db: Session,
    cases_file: pathlib.Path = AQUI / "ocr_cases.json",
    labels_dir: pathlib.Path = LABELS_DIR,
) -> EvalReport:
    """Mide leyendo los bytes del disco por la misma vía que el mostrador.

    `extract_from_bytes` es exactamente lo que llama el formulario de captura
    —misma puerta de gasto, misma caché, misma limpieza de campos—, así que un
    resultado que pasa aquí dice que ese camino sirve, no un camino paralelo
    construido para la medición.
    """
    cases = _load_ocr_cases(cases_file, labels_dir)
    # Un usuario sintético basta: `ensure_available` solo comprueba que venga
    # uno, nunca que exista la fila.
    user_id = uuid.uuid4()

    def leer(image_ref: str) -> dict[str, str]:
        ruta = pathlib.Path(image_ref)
        return label_ocr.extract_from_bytes(
            db,
            ruta.read_bytes(),
            _CONTENT_TYPES[ruta.suffix.lower()],
            user_id=user_id,
        )

    return evaluate_ocr(cases, leer)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capability", choices=("mapping", "ocr"), required=True)
    parser.add_argument(
        "--labels-dir",
        type=pathlib.Path,
        default=LABELS_DIR,
        help="Carpeta con las fotos de etiqueta (solo con --capability ocr).",
    )
    args = parser.parse_args()

    if not settings.ai_api_key:
        print("Falta AI_API_KEY en el entorno.", file=sys.stderr)
        return 2

    if args.capability == "ocr":
        problemas = _check_photos(_load_ocr_cases(labels_dir=args.labels_dir))
        if problemas:
            print(
                f"No se corrió nada. {len(problemas)} fotos no se pueden leer:",
                file=sys.stderr,
            )
            for problema in problemas:
                print(f"  · {problema}", file=sys.stderr)
            return 2

    # Solo para esta corrida: la bandera de producción no se toca. Un catálogo
    # local efímero no puede agotar el tope real, así que no hay riesgo de
    # apagar la capacidad para nadie más.
    settings.ai_enable_text_mapping = True
    settings.ai_enable_label_ocr = True

    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine, expire_on_commit=False)()

    try:
        if args.capability == "ocr":
            reporte, skipped = _run_ocr(db, labels_dir=args.labels_dir), []
        else:
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
