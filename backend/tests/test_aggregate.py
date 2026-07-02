"""Tests for AggregateRepository and dashboard schemas."""

from decimal import Decimal
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.repositories.aggregate_repository import AggregateRepository
from app.schemas.aggregate import (
    CategoryStockOut,
    CenterStockOut,
    InnStockOut,
    NationalDashboardOut,
    PublicCampaignListItemOut,
    PublicCampaignOut,
    PublicNeedsOut,
    SummaryTotalsOut,
)


# ── Schema tests ───────────────────────────────────────────────────────────────

class TestCategoryStockOut:
    def test_valid(self):
        s = CategoryStockOut(category="MEDICINE", total_units=100, box_count=10)
        assert s.category == "MEDICINE"
        assert s.total_units == 100

    def test_zero_units_allowed(self):
        s = CategoryStockOut(category="FOOD", total_units=0, box_count=0)
        assert s.total_units == 0


class TestCenterStockOut:
    def test_nullable_geo_fields(self):
        s = CenterStockOut(
            center_id=str(uuid4()),
            center_name="Centro CDMX",
            country_code=None,
            state_name=None,
            total_units=50,
            box_count=5,
        )
        assert s.country_code is None
        assert s.state_name is None

    def test_with_geo(self):
        s = CenterStockOut(
            center_id=str(uuid4()),
            center_name="Centro GDL",
            country_code="MX",
            state_name="Jalisco",
            total_units=200,
            box_count=20,
        )
        assert s.country_code == "MX"


class TestSummaryTotalsOut:
    def test_all_fields(self):
        s = SummaryTotalsOut(
            total_boxes_sealed=50,
            total_units_sealed=500,
            total_weight_kg=250.5,
            total_intakes=30,
            total_shipments_sent=3,
            active_centers=5,
        )
        assert s.total_weight_kg == 250.5
        assert s.active_centers == 5


class TestNationalDashboardOut:
    def test_compose(self):
        totals = SummaryTotalsOut(
            total_boxes_sealed=10,
            total_units_sealed=100,
            total_weight_kg=50.0,
            total_intakes=5,
            total_shipments_sent=1,
            active_centers=2,
        )
        out = NationalDashboardOut(
            totals=totals,
            by_category=[CategoryStockOut(category="FOOD", total_units=100, box_count=10)],
            by_center=[],
            by_inn=[],
        )
        assert out.totals.active_centers == 2
        assert len(out.by_category) == 1


class TestPublicNeedsOut:
    def test_empty(self):
        out = PublicNeedsOut(by_category=[])
        assert out.by_category == []

    def test_with_data(self):
        out = PublicNeedsOut(
            by_category=[
                CategoryStockOut(category="MEDICINE", total_units=300, box_count=30),
                CategoryStockOut(category="FOOD", total_units=150, box_count=15),
            ]
        )
        assert len(out.by_category) == 2


class TestPublicCampaignListItemOut:
    def test_valid(self):
        out = PublicCampaignListItemOut(
            slug="operacion-venezuela", name="Operación Venezuela", destination_country="VE"
        )
        assert out.slug == "operacion-venezuela"

    def test_nullable_destination(self):
        out = PublicCampaignListItemOut(slug="ayuda", name="Ayuda", destination_country=None)
        assert out.destination_country is None


class TestPublicCampaignOut:
    def test_full(self):
        out = PublicCampaignOut(
            slug="operacion-venezuela",
            name="Operación Venezuela",
            description="Terremoto norte de Venezuela",
            destination_country="VE",
            start_date=None,
            end_date=None,
            by_category=[CategoryStockOut(category="MEDICINE", total_units=50, box_count=5)],
        )
        assert out.slug == "operacion-venezuela"
        assert len(out.by_category) == 1

    def test_empty_needs(self):
        out = PublicCampaignOut(
            slug="ayuda",
            name="Ayuda",
            description=None,
            destination_country=None,
            start_date=None,
            end_date=None,
            by_category=[],
        )
        assert out.by_category == []


# ── Repository unit tests (mock DB) ───────────────────────────────────────────

def _make_repo():
    return AggregateRepository(db=MagicMock())


class TestAggregateRepository:
    def test_stock_by_category_maps_rows(self):
        repo = _make_repo()
        mock_row = MagicMock()
        mock_row.category = "MEDICINE"
        mock_row.total_units = 100
        mock_row.box_count = 10

        repo.db.query.return_value.join.return_value.filter.return_value.group_by.return_value.order_by.return_value.all.return_value = [mock_row]

        result = repo.stock_by_category()
        assert result[0]["category"] == "MEDICINE"
        assert result[0]["total_units"] == 100

    def test_stock_by_category_handles_none_sum(self):
        repo = _make_repo()
        mock_row = MagicMock()
        mock_row.category = "WATER"
        mock_row.total_units = None
        mock_row.box_count = None

        repo.db.query.return_value.join.return_value.filter.return_value.group_by.return_value.order_by.return_value.all.return_value = [mock_row]

        result = repo.stock_by_category()
        assert result[0]["total_units"] == 0
        assert result[0]["box_count"] == 0

    def test_needed_by_category_sorts_desc(self):
        repo = _make_repo()
        mock_rows = [
            {"category": "FOOD", "total_units": 50, "box_count": 5},
            {"category": "MEDICINE", "total_units": 200, "box_count": 20},
            {"category": "WATER", "total_units": 10, "box_count": 1},
        ]
        with patch.object(repo, "stock_by_category", return_value=mock_rows):
            result = repo.needed_by_category()
        assert result[0]["category"] == "MEDICINE"
        assert result[1]["category"] == "FOOD"
        assert result[2]["category"] == "WATER"

    def test_needed_by_category_passes_campaign_id_through(self):
        repo = _make_repo()
        campaign_id = uuid4()
        with patch.object(repo, "stock_by_category", return_value=[]) as mock_stock:
            repo.needed_by_category(campaign_id=campaign_id)
        mock_stock.assert_called_once_with(center_id=None, campaign_id=campaign_id)

    def test_stock_by_category_with_campaign_id_joins_intake(self):
        repo = _make_repo()
        campaign_id = uuid4()
        mock_row = MagicMock()
        mock_row.category = "MEDICINE"
        mock_row.total_units = 40
        mock_row.box_count = 4

        # Base chain: query().join(ProductType).filter(status). With campaign_id set,
        # an extra join(Intake).filter(campaign_id) is inserted before group_by.
        chain = repo.db.query.return_value.join.return_value.filter.return_value
        chain.join.return_value.filter.return_value.group_by.return_value.order_by.return_value.all.return_value = [
            mock_row
        ]

        result = repo.stock_by_category(campaign_id=campaign_id)
        assert result == [{"category": "MEDICINE", "total_units": 40, "box_count": 4}]
