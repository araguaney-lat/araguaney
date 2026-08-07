from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import cast, Date, func, select
from sqlalchemy.orm import Session

from app.models.box import Box
from app.models.campaign import Campaign
from app.models.center import Center
from app.models.intake import Intake
from app.models.product_type import ProductType
from app.models.reception import ReceptionLine, ShipmentReception
from app.models.shipment import Shipment
from app.models.user_campaign import UserCampaign


def _start_dt(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=timezone.utc)


def _end_dt(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, 23, 59, 59, 999999, tzinfo=timezone.utc)


class ReportRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _box_base(self, campaign_id: UUID, center_id: UUID | None, start: date, end: date):
        """Base statement joining Box → Intake filtered by campaign + date range + optional center."""
        stmt = (
            select(Box)
            .join(Intake, Box.intake_id == Intake.id)
            .where(
                Intake.campaign_id == campaign_id,
                Box.created_at >= _start_dt(start),
                Box.created_at <= _end_dt(end),
            )
        )
        if center_id is not None:
            stmt = stmt.where(Box.center_id == center_id)
        return stmt

    def is_campaign_member(self, user_id: UUID, campaign_id: UUID) -> bool:
        row = self.db.execute(
            select(UserCampaign.user_id).where(
                UserCampaign.user_id == user_id,
                UserCampaign.campaign_id == campaign_id,
            )
        ).scalar_one_or_none()
        return row is not None

    def shrinkage(self, campaign_id: UUID, center_id: UUID | None) -> dict:
        """Merma de la campaña: cuántas cajas recibidas no llegaron bien.

        Es el espejo del % de rechazo en intake. Una mide lo que no se aceptó al
        entrar; esta, lo que no llegó al salir.

        **Sin filtro de fechas, a diferencia del resto del reporte.** Un envío
        se recibe semanas después de despacharse, y acotar la merma a la misma
        ventana que las capturas dejaría fuera justo los envíos que ya
        completaron su viaje.

        Solo cuentan los envíos con recepción registrada: uno que nadie
        reconcilió todavía no tiene merma de cero, tiene merma desconocida, y
        promediarlo como cero mentiría hacia abajo.
        """
        stmt = (
            select(ReceptionLine.outcome, func.count(ReceptionLine.id).label("cnt"))
            .join(ShipmentReception, ReceptionLine.reception_id == ShipmentReception.id)
            .join(Shipment, ShipmentReception.shipment_id == Shipment.id)
            .where(Shipment.campaign_id == campaign_id)
        )
        if center_id is not None:
            stmt = stmt.where(Shipment.center_id == center_id)

        rows = self.db.execute(stmt.group_by(ReceptionLine.outcome)).all()
        counts = {r.outcome: r.cnt for r in rows}
        total = sum(counts.values())
        recibidas = counts.get("RECEIVED", 0)
        faltantes = total - recibidas

        return {
            "reconciled_boxes": total,
            "received": recibidas,
            "missing": counts.get("MISSING", 0),
            "damaged": counts.get("DAMAGED", 0),
            "retained": counts.get("RETAINED_CUSTOMS", 0),
            "shrinkage_pct": round(faltantes / total * 100, 2) if total else 0.0,
        }

    def summary(self, campaign_id: UUID, center_id: UUID | None, start: date, end: date) -> dict:
        # Box counts by status
        status_rows = self.db.execute(
            select(Box.status, func.count(Box.id).label("cnt"))
            .join(Intake, Box.intake_id == Intake.id)
            .where(
                Intake.campaign_id == campaign_id,
                Box.created_at >= _start_dt(start),
                Box.created_at <= _end_dt(end),
                *([Box.center_id == center_id] if center_id else []),
            )
            .group_by(Box.status)
        ).all()

        counts = {r.status: r.cnt for r in status_rows}
        total_boxes = sum(counts.values())

        # Total units
        unit_sum = self.db.execute(
            select(func.sum(Box.quantity))
            .join(Intake, Box.intake_id == Intake.id)
            .where(
                Intake.campaign_id == campaign_id,
                Box.created_at >= _start_dt(start),
                Box.created_at <= _end_dt(end),
                *([Box.center_id == center_id] if center_id else []),
            )
        ).scalar_one() or 0

        # Intakes count
        intake_q = select(func.count(Intake.id)).where(
            Intake.campaign_id == campaign_id,
            Intake.created_at >= _start_dt(start),
            Intake.created_at <= _end_dt(end),
        )
        if center_id:
            intake_q = intake_q.where(Intake.center_id == center_id)
        total_intakes = self.db.execute(intake_q).scalar_one() or 0

        # Shipments count
        ship_q = select(func.count(Shipment.id)).where(
            Shipment.campaign_id == campaign_id,
            Shipment.created_at >= _start_dt(start),
            Shipment.created_at <= _end_dt(end),
        )
        if center_id:
            ship_q = ship_q.where(Shipment.center_id == center_id)
        total_shipments = self.db.execute(ship_q).scalar_one() or 0

        # Active centers in period
        centers_q = (
            select(func.count(func.distinct(Box.center_id)))
            .join(Intake, Box.intake_id == Intake.id)
            .where(
                Intake.campaign_id == campaign_id,
                Box.created_at >= _start_dt(start),
                Box.created_at <= _end_dt(end),
            )
        )
        active_centers = self.db.execute(centers_q).scalar_one() or 0

        sealed = counts.get("SEALED", 0)
        rejected = counts.get("REJECTED", 0)
        draft = counts.get("DRAFT", 0)
        shipped = counts.get("SHIPPED", 0)

        return {
            "total_boxes": total_boxes,
            "sealed_boxes": sealed,
            "shipped_boxes": shipped,
            "draft_boxes": draft,
            "rejected_boxes": rejected,
            "total_units": int(unit_sum),
            "total_intakes": total_intakes,
            "total_shipments": total_shipments,
            "active_centers": active_centers,
            "rejection_rate": round(rejected / total_boxes * 100, 1) if total_boxes > 0 else 0.0,
        }

    def activity(self, campaign_id: UUID, center_id: UUID | None, start: date, end: date) -> list[dict]:
        """Daily box creation counts grouped by status."""
        day_col = cast(Box.created_at, Date).label("day")
        stmt = (
            select(day_col, Box.status, func.count(Box.id).label("cnt"))
            .join(Intake, Box.intake_id == Intake.id)
            .where(
                Intake.campaign_id == campaign_id,
                Box.created_at >= _start_dt(start),
                Box.created_at <= _end_dt(end),
                *([Box.center_id == center_id] if center_id else []),
            )
            .group_by(day_col, Box.status)
            .order_by(day_col)
        )
        rows = self.db.execute(stmt).all()

        # Pivot by day
        by_day: dict[str, dict] = {}
        for r in rows:
            key = str(r.day)
            if key not in by_day:
                by_day[key] = {"date": key, "sealed": 0, "rejected": 0, "draft": 0, "shipped": 0, "total": 0}
            status_key = r.status.lower()
            if status_key in by_day[key]:
                by_day[key][status_key] += r.cnt
            by_day[key]["total"] += r.cnt

        return list(by_day.values())

    def by_category(self, campaign_id: UUID, center_id: UUID | None, start: date, end: date) -> list[dict]:
        stmt = (
            select(
                ProductType.category,
                func.count(Box.id).label("box_count"),
                func.sum(Box.quantity).label("unit_count"),
            )
            .join(Intake, Box.intake_id == Intake.id)
            .join(ProductType, Box.product_type_id == ProductType.id)
            .where(
                Intake.campaign_id == campaign_id,
                Box.created_at >= _start_dt(start),
                Box.created_at <= _end_dt(end),
                *([Box.center_id == center_id] if center_id else []),
            )
            .group_by(ProductType.category)
            .order_by(func.count(Box.id).desc())
        )
        rows = self.db.execute(stmt).all()
        return [
            {"category": r.category, "box_count": r.box_count, "unit_count": int(r.unit_count or 0)}
            for r in rows
        ]

    def by_center(self, campaign_id: UUID, center_id: UUID | None, start: date, end: date) -> list[dict]:
        stmt = (
            select(
                Center.id.label("center_id"),
                Center.name.label("center_name"),
                Center.country_code,
                func.count(Box.id).label("box_count"),
                func.sum(Box.quantity).label("unit_count"),
            )
            .join(Intake, Box.intake_id == Intake.id)
            .join(Center, Box.center_id == Center.id)
            .where(
                Intake.campaign_id == campaign_id,
                Box.created_at >= _start_dt(start),
                Box.created_at <= _end_dt(end),
                *([Box.center_id == center_id] if center_id else []),
            )
            .group_by(Center.id, Center.name, Center.country_code)
            .order_by(func.count(Box.id).desc())
        )
        rows = self.db.execute(stmt).all()
        return [
            {
                "center_id": str(r.center_id),
                "center_name": r.center_name,
                "country_code": r.country_code,
                "box_count": r.box_count,
                "unit_count": int(r.unit_count or 0),
            }
            for r in rows
        ]

    def countries(self, campaign_id: UUID, center_id: UUID | None, start: date, end: date) -> list[dict]:
        stmt = (
            select(
                Center.country_code,
                func.count(func.distinct(Center.id)).label("center_count"),
                func.count(Box.id).label("box_count"),
                func.sum(Box.quantity).label("unit_count"),
            )
            .join(Intake, Box.intake_id == Intake.id)
            .join(Center, Box.center_id == Center.id)
            .where(
                Intake.campaign_id == campaign_id,
                Box.created_at >= _start_dt(start),
                Box.created_at <= _end_dt(end),
                Center.country_code.isnot(None),
                *([Box.center_id == center_id] if center_id else []),
            )
            .group_by(Center.country_code)
            .order_by(func.count(Box.id).desc())
        )
        rows = self.db.execute(stmt).all()
        return [
            {
                "country_code": r.country_code,
                "center_count": r.center_count,
                "box_count": r.box_count,
                "unit_count": int(r.unit_count or 0),
            }
            for r in rows
        ]

    def export_rows(self, campaign_id: UUID, center_id: UUID | None, start: date, end: date) -> list[dict]:
        stmt = (
            select(
                Box.id,
                Box.code,
                Box.status,
                Box.quantity,
                Box.unit,
                Box.batch,
                Box.expiry_date,
                Box.weight_kg,
                Box.created_at,
                Box.sealed_at,
                ProductType.category,
                ProductType.display_name.label("product_name"),
                ProductType.inn_name,
                Center.name.label("center_name"),
                Center.country_code,
                Campaign.name.label("campaign_name"),
            )
            .join(Intake, Box.intake_id == Intake.id)
            .join(ProductType, Box.product_type_id == ProductType.id)
            .join(Center, Box.center_id == Center.id)
            .join(Campaign, Intake.campaign_id == Campaign.id)
            .where(
                Intake.campaign_id == campaign_id,
                Box.created_at >= _start_dt(start),
                Box.created_at <= _end_dt(end),
                *([Box.center_id == center_id] if center_id else []),
            )
            .order_by(Box.created_at)
        )
        rows = self.db.execute(stmt).all()
        return [
            {
                "id": str(r.id),
                "code": r.code,
                "status": r.status,
                "quantity": r.quantity,
                "unit": r.unit,
                "batch": r.batch or "",
                "expiry_date": str(r.expiry_date) if r.expiry_date else "",
                "weight_kg": float(r.weight_kg) if r.weight_kg else "",
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "",
                "sealed_at": r.sealed_at.strftime("%Y-%m-%d %H:%M") if r.sealed_at else "",
                "category": r.category,
                "product_name": r.product_name,
                "inn_name": r.inn_name or "",
                "center_name": r.center_name,
                "country_code": r.country_code or "",
                "campaign_name": r.campaign_name,
            }
            for r in rows
        ]
