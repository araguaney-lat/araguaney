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
