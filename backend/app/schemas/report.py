from app.schemas._base import StrictModel


class ReportSummary(StrictModel):
    total_boxes: int
    sealed_boxes: int
    shipped_boxes: int
    draft_boxes: int
    rejected_boxes: int
    total_units: int
    total_intakes: int
    total_shipments: int
    active_centers: int
    rejection_rate: float


class ShrinkageSummary(StrictModel):
    """Merma de la campaña. `reconciled_boxes` es la base: sin envíos recibidos
    no hay merma que reportar, y cero cajas no es lo mismo que cero merma."""

    reconciled_boxes: int
    received: int
    missing: int
    damaged: int
    retained: int
    shrinkage_pct: float


class ActivityPoint(StrictModel):
    date: str
    total: int
    sealed: int
    rejected: int
    draft: int
    shipped: int


class CategoryBreakdown(StrictModel):
    category: str
    box_count: int
    unit_count: int


class CenterBreakdown(StrictModel):
    center_id: str
    center_name: str
    country_code: str | None
    box_count: int
    unit_count: int


class CountryPoint(StrictModel):
    country_code: str
    center_count: int
    box_count: int
    unit_count: int
