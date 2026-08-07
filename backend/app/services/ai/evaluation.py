"""Evaluación de las capacidades de IA (Fase 23, task 8).

Una sugerencia mala que nadie mide degrada el catálogo en silencio: cada elección
equivocada que un coordinador acepta con prisa se convierte en inventario que
dice otra cosa de lo que hay en la caja.

Por eso el orden de esta fase pone la medición antes que el encendido, y por eso
**los umbrales viven aquí, fijados antes de ver ningún resultado**. Un umbral que
se elige después de medir no es un umbral, es una justificación.

Las métricas son las que declara la spec:

- **Mapeo de texto libre**: acierto en top-1 y en top-3. El top-3 pesa más porque
  la interfaz muestra tres sugerencias y quien captura elige; acertar en la
  primera es comodidad, tener la correcta entre las tres es utilidad.
- **OCR de etiqueta**: exactitud por campo. Se mide campo por campo y no por
  ficha completa porque los campos no valen lo mismo: una concentración mal leída
  cambia el medicamento, una forma farmacéutica mal leída se corrige de un
  vistazo.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Sequence

# ── Umbrales de encendido ────────────────────────────────────────────────────
#
# Fijados al construir el conjunto, no después de medir. Si una capacidad no los
# supera, no se enciende en producción: se cambia de modelo, se mejora el prompt
# o se deja apagada.

MAPPING_THRESHOLDS = {
    # Con la correcta entre las tres, quien captura hace un clic en vez de
    # buscar. Por debajo de esto la herramienta estorba más de lo que ayuda.
    "top3": 0.85,
    # El top-1 es comodidad, no utilidad: se mide para comparar modelos, y su
    # umbral es deliberadamente más bajo.
    "top1": 0.60,
}

OCR_THRESHOLDS = {
    # La caducidad decide si la caja se acepta o se rechaza (regla de los 365
    # días), así que un error aquí tiene consecuencia regulatoria, no cosmética.
    "expiry_date": 0.95,
    # La concentración distingue un medicamento de otro: ibuprofeno 500 no es
    # ibuprofeno 900, y el catálogo los trata como SKU distintos.
    "strength": 0.90,
    "inn_name": 0.90,
    # El lote y la forma se corrigen de un vistazo contra la caja física.
    "batch": 0.85,
    "form": 0.85,
}


@dataclass
class MappingCase:
    """Un renglón de texto libre con el `product_type` que le corresponde."""

    text: str
    expected_slug: str


@dataclass
class OCRCase:
    """Una etiqueta con los campos que deberían leerse de ella."""

    image_ref: str
    expected: dict[str, str]


@dataclass
class EvalReport:
    total: int
    metrics: dict[str, float]
    thresholds: dict[str, float]
    failures: list[str] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        """Todas las métricas por encima de su umbral. Un conjunto vacío nunca pasa.

        Cero casos daría 100% en todas las métricas por división trivial, y eso
        encendería una capacidad sin haberla medido: exactamente lo que esta
        pieza existe para impedir.
        """
        if self.total == 0:
            return False
        return all(self.metrics.get(k, 0.0) >= v for k, v in self.thresholds.items())

    def summary(self) -> str:
        lineas = [f"{self.total} casos"]
        for nombre, valor in sorted(self.metrics.items()):
            umbral = self.thresholds.get(nombre)
            marca = "✓" if umbral is None or valor >= umbral else "✗"
            objetivo = f" (umbral {umbral:.0%})" if umbral is not None else ""
            lineas.append(f"  {marca} {nombre}: {valor:.0%}{objetivo}")
        return "\n".join(lineas)


def evaluate_mapping(
    cases: Sequence[MappingCase],
    suggest: Callable[[str], list[str]],
) -> EvalReport:
    """`suggest` devuelve los slugs sugeridos, del más probable al menos."""
    top1 = top3 = 0
    fallos: list[str] = []

    for caso in cases:
        sugerencias = suggest(caso.text)
        if sugerencias[:1] == [caso.expected_slug]:
            top1 += 1
        if caso.expected_slug in sugerencias[:3]:
            top3 += 1
        else:
            fallos.append(f"{caso.text!r} → esperaba {caso.expected_slug}, obtuvo {sugerencias[:3]}")

    total = len(cases)
    return EvalReport(
        total=total,
        metrics={
            "top1": top1 / total if total else 0.0,
            "top3": top3 / total if total else 0.0,
        },
        thresholds=MAPPING_THRESHOLDS,
        failures=fallos,
    )


def evaluate_ocr(
    cases: Sequence[OCRCase],
    extract: Callable[[str], dict[str, str]],
) -> EvalReport:
    """Exactitud por campo. Un campo que el caso no declara no se mide."""
    aciertos: dict[str, int] = {}
    totales: dict[str, int] = {}
    fallos: list[str] = []

    for caso in cases:
        leido = extract(caso.image_ref)
        for campo, esperado in caso.expected.items():
            totales[campo] = totales.get(campo, 0) + 1
            if _normalize(leido.get(campo)) == _normalize(esperado):
                aciertos[campo] = aciertos.get(campo, 0) + 1
            else:
                fallos.append(
                    f"{caso.image_ref} · {campo}: esperaba {esperado!r}, leyó {leido.get(campo)!r}"
                )

    return EvalReport(
        total=len(cases),
        metrics={campo: aciertos.get(campo, 0) / n for campo, n in totales.items()},
        thresholds={k: v for k, v in OCR_THRESHOLDS.items() if k in totales},
        failures=fallos,
    )


def _normalize(valor: str | None) -> str:
    """Compara sin castigar mayúsculas ni espacios sobrantes.

    Leer "IBUPROFENO " en vez de "Ibuprofeno" no es un error del modelo, es
    ruido de formato, y contarlo como fallo escondería los errores de verdad.
    """
    return (valor or "").strip().lower()
