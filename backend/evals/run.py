"""Corre el conjunto de referencia contra el proveedor configurado.

Se ejecuta a mano, nunca en CI: aquí sí sale tráfico de red y sí se gasta
dinero. Su propósito es doble — decidir si una capacidad supera su umbral, y
comparar modelos por costo y calidad antes de encender nada.

    python -m evals.run --capability mapping
    AI_MODEL=deepseek-chat python -m evals.run --capability mapping

El costo de la corrida se imprime al final. Un conjunto de cien casos con un
modelo del tramo económico cuesta menos que un café, pero conviene verlo antes
de correrlo cien veces.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

from app.services.ai import budget
from app.services.ai.evaluation import (
    MappingCase,
    OCRCase,
    evaluate_mapping,
    evaluate_ocr,
)
from app.services.ai.provider import AIUnavailable, get_provider

AQUI = pathlib.Path(__file__).parent

_MAPPING_PROMPT = (
    "Eres un clasificador de donaciones en especie para centros de acopio "
    "humanitarios. Recibes el texto libre de una persona donante y devuelves "
    'JSON con {"slugs": [...]}: hasta tres slugs de catálogo, del más probable '
    "al menos probable. Solo el JSON, sin explicación."
)

_OCR_PROMPT = (
    "Lee la etiqueta de este medicamento y devuelve JSON con inn_name, form, "
    "strength, batch y expiry_date (formato AAAA-MM-DD). Usa null en el campo "
    "que no puedas leer con certeza: inventar un lote o una caducidad es peor "
    "que dejarlos vacíos, porque nadie los va a volver a mirar."
)


def _load(nombre: str) -> list[dict]:
    return json.loads((AQUI / nombre).read_text())["cases"]


def _run_mapping(proveedor) -> tuple:
    casos = [MappingCase(c["text"], c["expected_slug"]) for c in _load("mapping_cases.json")]
    gasto = {"input": 0, "output": 0}

    def sugerir(texto: str) -> list[str]:
        resultado = proveedor.classify_text(_MAPPING_PROMPT, texto)
        gasto["input"] += resultado.input_tokens
        gasto["output"] += resultado.output_tokens
        return list(resultado.data.get("slugs", []))

    return evaluate_mapping(casos, sugerir), gasto


def _run_ocr(proveedor) -> tuple:
    casos = [OCRCase(c["image_ref"], c["expected"]) for c in _load("ocr_cases.json")]
    gasto = {"input": 0, "output": 0}

    def extraer(referencia: str) -> dict:
        resultado = proveedor.extract_from_image(_OCR_PROMPT, referencia)
        gasto["input"] += resultado.input_tokens
        gasto["output"] += resultado.output_tokens
        return resultado.data

    return evaluate_ocr(casos, extraer), gasto


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capability", choices=("mapping", "ocr"), required=True)
    args = parser.parse_args()

    try:
        proveedor = get_provider()
    except AIUnavailable as exc:
        print(f"No hay proveedor configurado: {exc}", file=sys.stderr)
        return 2

    reporte, gasto = (_run_mapping if args.capability == "mapping" else _run_ocr)(proveedor)

    print(reporte.summary())
    costo = budget.estimate_cost_usd(gasto["input"], gasto["output"])
    print(f"\nCosto de la corrida: ${costo:.4f}")

    if reporte.failures:
        print(f"\nFallos ({len(reporte.failures)}):")
        for fallo in reporte.failures[:20]:
            print(f"  · {fallo}")

    # El código de salida es el veredicto: 0 si supera su umbral, 1 si no. Así
    # la decisión de encender no depende de leer bien una tabla.
    print("\n" + ("SUPERA el umbral: puede encenderse" if reporte.passed
                  else "NO supera el umbral: no se enciende"))
    return 0 if reporte.passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
