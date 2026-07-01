from datetime import datetime
from typing import Literal
from uuid import UUID

from app.schemas._base import StrictModel, StrictORMModel


class ProductTypeCreate(StrictModel):
    category: str
    display_name: str
    unspsc_code: str | None = None
    inn_name: str | None = None
    brand: str | None = None
    strength: str | None = None
    form: str | None = None
    gtin: str | None = None
    default_unit: str | None = None
    is_controlled: bool = False
    min_shelf_life_days: int | None = None


class ProductTypeUpdate(StrictModel):
    category: str | None = None
    display_name: str | None = None
    unspsc_code: str | None = None
    inn_name: str | None = None
    brand: str | None = None
    strength: str | None = None
    form: str | None = None
    gtin: str | None = None
    default_unit: str | None = None
    is_controlled: bool | None = None
    min_shelf_life_days: int | None = None


class BarcodePrefill(StrictModel):
    gtin: str
    display_name: str
    brand: str | None
    category: str


class BarcodeResult(StrictModel):
    source: Literal["local", "open_food_facts"]
    product_type: "ProductTypeOut | None" = None
    prefill: BarcodePrefill | None = None


class ProductTypeOut(StrictORMModel):
    id: UUID
    category: str
    display_name: str
    campaign_id: UUID | None
    unspsc_code: str | None
    inn_name: str | None
    brand: str | None
    strength: str | None
    form: str | None
    gtin: str | None
    default_unit: str | None
    is_controlled: bool
    min_shelf_life_days: int | None
    created_at: datetime
