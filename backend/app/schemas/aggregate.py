from datetime import date

from uuid import UUID

from app.schemas._base import StrictModel


class CategoryStockOut(StrictModel):
    category: str
    total_units: int
    box_count: int


class CenterStockOut(StrictModel):
    center_id: str
    center_name: str
    country_code: str | None
    state_name: str | None
    total_units: int
    box_count: int


class InnStockOut(StrictModel):
    inn_name: str | None
    strength: str | None
    form: str | None
    total_units: int
    box_count: int


class SummaryTotalsOut(StrictModel):
    total_boxes_sealed: int
    total_units_sealed: int
    total_weight_kg: float
    total_intakes: int
    total_shipments_sent: int
    active_centers: int


class NationalDashboardOut(StrictModel):
    totals: SummaryTotalsOut
    by_category: list[CategoryStockOut]
    by_center: list[CenterStockOut]
    by_inn: list[InnStockOut]


class CampaignWeightOut(StrictModel):
    campaign_id: str
    campaign_name: str
    total_kg: float
    goal_kg: float | None
    progress_pct: float | None


class WeightDashboardOut(StrictModel):
    campaigns: list[CampaignWeightOut]
    center_kg: float | None


class PublicNeedsOut(StrictModel):
    by_category: list[CategoryStockOut]


class PublicCampaignListItemOut(StrictModel):
    """Safe for public listing: no PII, just what's needed to build a link/card.

    Incluye `id` porque el formulario de donación manda la campaña elegida como
    intención; el UUID no es secreto y la ficha ya es pública por slug.
    """
    id: UUID
    slug: str
    name: str
    destination_country: str | None


class PublicCampaignOut(StrictModel):
    """Public event-landing payload — campaign context + what's needed for it."""
    slug: str
    name: str
    description: str | None
    destination_country: str | None
    start_date: date | None
    end_date: date | None
    by_category: list[CategoryStockOut]
