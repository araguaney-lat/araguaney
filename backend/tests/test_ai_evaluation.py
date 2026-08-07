"""Arnés de evaluación y umbrales (Fase 23, task 8).

Una sugerencia mala que nadie mide degrada el catálogo en silencio: cada
elección equivocada que alguien acepta con prisa se vuelve inventario que dice
otra cosa de lo que hay en la caja.

Estos tests no miden al modelo —eso lo hace `evals/run.py` contra el proveedor
real y cuesta dinero—. Miden **el instrumento**: que cuente bien, que no se
deje encender por un conjunto vacío y que los umbrales estén escritos antes de
ver ningún resultado.

Un instrumento de medición mal calibrado es peor que no medir, porque produce
confianza.
"""

import json
import pathlib

import pytest

from app.services.ai.evaluation import (
    MAPPING_THRESHOLDS,
    OCR_THRESHOLDS,
    MappingCase,
    OCRCase,
    evaluate_mapping,
    evaluate_ocr,
)

EVALS = pathlib.Path(__file__).parent.parent / "evals"


# ── El instrumento cuenta bien ───────────────────────────────────────────────

def test_top1_and_top3_are_different_measurements():
    """El top-3 es utilidad (la correcta está entre las tres que se muestran);
    el top-1 es comodidad. Confundirlos encendería capacidades a ciegas."""
    casos = [
        MappingCase("20 latas de atún", "atun-lata"),
        MappingCase("3 cobijas", "cobija"),
    ]

    # Acierta ambas, pero la segunda en tercer lugar.
    def sugerir(texto):
        return ["atun-lata", "x", "y"] if "atún" in texto else ["x", "y", "cobija"]

    reporte = evaluate_mapping(casos, sugerir)

    assert reporte.metrics["top1"] == 0.5
    assert reporte.metrics["top3"] == 1.0


def test_a_miss_is_reported_with_what_was_expected():
    """Un fallo sin contexto no se puede accionar: hay que ver qué propuso."""
    casos = [MappingCase("3 cobijas", "cobija")]

    reporte = evaluate_mapping(casos, lambda _: ["almohada", "sabana", "toalla"])

    assert reporte.metrics["top3"] == 0.0
    assert "cobija" in reporte.failures[0]
    assert "almohada" in reporte.failures[0]


def test_ocr_accuracy_is_measured_per_field():
    """Los campos no valen lo mismo: una concentración mal leída cambia el
    medicamento; una forma farmacéutica se corrige de un vistazo."""
    casos = [OCRCase("a.jpg", {"inn_name": "Paracetamol", "strength": "500 mg"})]

    reporte = evaluate_ocr(casos, lambda _: {"inn_name": "Paracetamol", "strength": "5 mg"})

    assert reporte.metrics["inn_name"] == 1.0
    assert reporte.metrics["strength"] == 0.0


def test_format_noise_is_not_counted_as_an_error():
    """Leer 'IBUPROFENO ' en vez de 'Ibuprofeno' es ruido de formato. Contarlo
    como fallo escondería los errores de verdad entre falsos positivos."""
    casos = [OCRCase("a.jpg", {"inn_name": "Ibuprofeno"})]

    reporte = evaluate_ocr(casos, lambda _: {"inn_name": "  IBUPROFENO "})

    assert reporte.metrics["inn_name"] == 1.0


def test_a_field_the_case_does_not_declare_is_not_measured():
    """Medir un campo sin verdad conocida inventaría exactitud."""
    casos = [OCRCase("a.jpg", {"inn_name": "Paracetamol"})]

    reporte = evaluate_ocr(casos, lambda _: {"inn_name": "Paracetamol", "batch": "L1"})

    assert set(reporte.metrics) == {"inn_name"}


# ── El veredicto ─────────────────────────────────────────────────────────────

def test_a_capability_below_its_threshold_does_not_pass():
    casos = [MappingCase(f"caso {i}", "esperado") for i in range(10)]
    # Acierta 5 de 10: top-3 al 50%, muy por debajo del 85% declarado.
    reporte = evaluate_mapping(
        casos, lambda t: ["esperado"] if int(t.split()[1]) < 5 else ["otro"]
    )

    assert reporte.metrics["top3"] == 0.5
    assert reporte.passed is False


def test_a_capability_above_every_threshold_passes():
    casos = [MappingCase(f"caso {i}", "esperado") for i in range(10)]

    reporte = evaluate_mapping(casos, lambda _: ["esperado", "otro", "tercero"])

    assert reporte.passed is True


def test_an_empty_set_never_passes():
    """Cero casos daría 100% por división trivial, y encendería una capacidad
    sin haberla medido: exactamente lo que este arnés existe para impedir."""
    reporte = evaluate_mapping([], lambda _: [])

    assert reporte.total == 0
    assert reporte.passed is False


def test_the_summary_marks_which_metric_failed():
    casos = [MappingCase("uno", "esperado"), MappingCase("dos", "esperado")]
    reporte = evaluate_mapping(casos, lambda t: ["esperado"] if t == "uno" else ["otro"])

    resumen = reporte.summary()

    assert "✗" in resumen
    assert "umbral" in resumen


# ── Los umbrales, y el conjunto ──────────────────────────────────────────────

def test_thresholds_are_declared_in_code_not_derived_from_results():
    """Un umbral elegido después de medir no es un umbral, es una
    justificación. Por eso viven en el módulo y no se calculan."""
    assert MAPPING_THRESHOLDS["top3"] == 0.85
    assert MAPPING_THRESHOLDS["top1"] == 0.60
    # La caducidad decide si una caja se acepta: su exactitud exige más que las
    # demás porque su error tiene consecuencia regulatoria, no cosmética.
    assert OCR_THRESHOLDS["expiry_date"] > OCR_THRESHOLDS["form"]


def test_the_reference_set_is_loadable_and_consistent():
    casos = json.loads((EVALS / "mapping_cases.json").read_text())["cases"]

    assert len(casos) >= 30
    assert all(c["text"] and c["expected_slug"] for c in casos)
    # Varias formas de nombrar lo mismo: el conjunto mide reconocimiento, no
    # memorización de una frase.
    slugs = [c["expected_slug"] for c in casos]
    assert len(slugs) > len(set(slugs))


def test_the_ocr_set_declares_the_fields_that_matter():
    casos = json.loads((EVALS / "ocr_cases.json").read_text())["cases"]

    assert casos, "sin casos no hay medición"
    for caso in casos:
        assert set(caso["expected"]) >= {"inn_name", "strength", "expiry_date"}


def test_no_images_are_committed_with_the_ocr_set():
    """Las fotos de etiqueta pueden llevar datos personales incidentales, y el
    repositorio es público. El conjunto guarda referencias, no imágenes."""
    imagenes = [p for p in EVALS.rglob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png"}]

    assert imagenes == []
