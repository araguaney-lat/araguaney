"""Aggregate queries for the national dashboard.

All queries return pure data (lists/dicts), not ORM objects.
national_admin passes center_id=None → sees all centers.
coordinator passes their center_id → sees only their center.
"""

from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.models.box import Box
from app.models.campaign import Campaign
from app.models.center import Center
from app.models.intake import Intake
from app.models.product_type import ProductType
from app.models.shipment import Shipment


class AggregateRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ── Stock by category ──────────────────────────────────────────────────────

    def stock_by_category(
        self,
        center_id: Optional[uuid.UUID] = None,
        campaign_id: Optional[uuid.UUID] = None,
    ) -> list[dict]:
        """Total sealed units grouped by product category."""
        q = (
            self.db.query(
                ProductType.category,
                func.sum(Box.quantity).label("total_units"),
                func.count(Box.id).label("box_count"),
            )
            .join(ProductType, Box.product_type_id == ProductType.id)
            .filter(Box.status == "SEALED")
        )
        if center_id is not None:
            q = q.filter(Box.center_id == center_id)
        if campaign_id is not None:
            q = q.join(Intake, Box.intake_id == Intake.id).filter(Intake.campaign_id == campaign_id)
        rows = q.group_by(ProductType.category).order_by(ProductType.category).all()
        return [
            {"category": r.category, "total_units": int(r.total_units or 0), "box_count": int(r.box_count or 0)}
            for r in rows
        ]

    # ── Stock by center ────────────────────────────────────────────────────────

    def stock_by_center(self, center_id: Optional[uuid.UUID] = None) -> list[dict]:
        """Sealed units and box count per center."""
        q = (
            self.db.query(
                Center.id.label("center_id"),
                Center.name.label("center_name"),
                Center.country_code,
                Center.state_name,
                func.sum(Box.quantity).label("total_units"),
                func.count(Box.id).label("box_count"),
            )
            .join(Box, Box.center_id == Center.id)
            .filter(Box.status == "SEALED")
        )
        if center_id is not None:
            q = q.filter(Center.id == center_id)
        rows = q.group_by(Center.id, Center.name, Center.country_code, Center.state_name).all()
        return [
            {
                "center_id": str(r.center_id),
                "center_name": r.center_name,
                "country_code": r.country_code,
                "state_name": r.state_name,
                "total_units": int(r.total_units or 0),
                "box_count": int(r.box_count or 0),
            }
            for r in rows
        ]

    # ── Stock by INN (medicines) ───────────────────────────────────────────────

    def stock_by_inn(self, center_id: Optional[uuid.UUID] = None, limit: int = 50) -> list[dict]:
        """Top medicines by total sealed units (INN + strength)."""
        q = (
            self.db.query(
                ProductType.inn_name,
                ProductType.strength,
                ProductType.form,
                func.sum(Box.quantity).label("total_units"),
                func.count(Box.id).label("box_count"),
            )
            .join(ProductType, Box.product_type_id == ProductType.id)
            .filter(Box.status == "SEALED", ProductType.category == "MEDICINE", ProductType.inn_name.isnot(None))
        )
        if center_id is not None:
            q = q.filter(Box.center_id == center_id)
        rows = (
            q.group_by(ProductType.inn_name, ProductType.strength, ProductType.form)
            .order_by(func.sum(Box.quantity).desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "inn_name": r.inn_name,
                "strength": r.strength,
                "form": r.form,
                "total_units": int(r.total_units or 0),
                "box_count": int(r.box_count or 0),
            }
            for r in rows
        ]

    # ── Summary totals ─────────────────────────────────────────────────────────

    def summary_totals(self, center_id: Optional[uuid.UUID] = None) -> dict:
        """Global headline numbers for the dashboard."""
        box_q = self.db.query(
            func.count(Box.id).label("total_boxes"),
            func.sum(Box.quantity).label("total_units"),
            func.sum(Box.weight_kg).label("total_weight_kg"),
        ).filter(Box.status == "SEALED")
        if center_id is not None:
            box_q = box_q.filter(Box.center_id == center_id)
        box_row = box_q.one()

        intake_q = self.db.query(func.count(Intake.id).label("total_intakes"))
        if center_id is not None:
            intake_q = intake_q.filter(Intake.center_id == center_id)
        intake_row = intake_q.one()

        shipment_q = self.db.query(func.count(Shipment.id).label("total_shipments")).filter(
            Shipment.status == "SHIPPED"
        )
        if center_id is not None:
            shipment_q = shipment_q.filter(Shipment.center_id == center_id)
        shipment_row = shipment_q.one()

        active_centers = self.db.query(func.count(Center.id)).filter(Center.is_active == True).scalar()  # noqa: E712

        return {
            "total_boxes_sealed": int(box_row.total_boxes or 0),
            "total_units_sealed": int(box_row.total_units or 0),
            "total_weight_kg": float(box_row.total_weight_kg or 0),
            "total_intakes": int(intake_row.total_intakes or 0),
            "total_shipments_sent": int(shipment_row.total_shipments or 0),
            "active_centers": int(active_centers or 0),
        }

    # ── Weight metrics ─────────────────────────────────────────────────────────

    def weight_by_campaign(
        self,
        center_id: Optional[uuid.UUID] = None,
        campaign_id: Optional[uuid.UUID] = None,
    ) -> list[dict]:
        """Sealed box weight grouped by campaign, with optional campaign/center filter."""
        q = (
            self.db.query(
                Campaign.id.label("campaign_id"),
                Campaign.name.label("campaign_name"),
                Campaign.weight_goal_kg,
                func.coalesce(func.sum(Box.weight_kg), 0).label("total_kg"),
            )
            .outerjoin(Intake, Intake.campaign_id == Campaign.id)
            .outerjoin(Box, (Box.intake_id == Intake.id) & (Box.status == "SEALED"))
        )
        if center_id is not None:
            q = q.filter((Box.center_id == center_id) | (Box.id.is_(None)))
        if campaign_id is not None:
            q = q.filter(Campaign.id == campaign_id)
        q = q.group_by(Campaign.id, Campaign.name, Campaign.weight_goal_kg)
        rows = q.all()
        result = []
        for r in rows:
            total = float(r.total_kg or 0)
            goal = float(r.weight_goal_kg) if r.weight_goal_kg is not None else None
            pct = round(total / goal * 100, 1) if goal else None
            result.append({
                "campaign_id": str(r.campaign_id),
                "campaign_name": r.campaign_name,
                "total_kg": total,
                "goal_kg": goal,
                "progress_pct": pct,
            })
        return result

    def weight_by_center(self, center_id: uuid.UUID) -> float:
        """Total sealed kg for a single center."""
        val = (
            self.db.query(func.sum(Box.weight_kg))
            .filter(Box.status == "SEALED", Box.center_id == center_id)
            .scalar()
        )
        return float(val or 0)

    # ── Public "what's needed" view ────────────────────────────────────────────

    def needed_by_category(self, campaign_id: Optional[uuid.UUID] = None) -> list[dict]:
        """For the public page: categories present (sealed stock) sorted by volume.

        This is a read-only, unauthenticated snapshot — no PII, no center names.
        Optional campaign_id scopes it to a single event landing (/eventos/{slug}).
        """
        rows = self.stock_by_category(center_id=None, campaign_id=campaign_id)
        return sorted(rows, key=lambda r: r["total_units"], reverse=True)
