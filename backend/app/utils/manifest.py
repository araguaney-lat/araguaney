"""Manifest / packing-list PDF generation via WeasyPrint + Jinja2.

System dependencies (add to Dockerfile):
    apt-get install -y libpango-1.0-0 libpangocairo-1.0-0 libcairo2 libgif-dev fonts-liberation
"""

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from app.legal import CUSTOMS_LEGEND_EN, CUSTOMS_LEGEND_ES

_TEMPLATE_DIR = Path(__file__).parent.parent / "templates"
_jinja_env = Environment(loader=FileSystemLoader(str(_TEMPLATE_DIR)), autoescape=True)


@dataclass
class ManifestBoxRow:
    code: str
    display_name: str
    category: str
    inn_name: str | None
    strength: str | None
    batch: str | None
    expiry_date: date | None
    quantity: int
    unit: str
    weight_kg: Decimal | None


@dataclass
class ManifestPalletSection:
    code: str
    boxes: list[ManifestBoxRow] = field(default_factory=list)


@dataclass
class ManifestData:
    shipment_id: str
    destination: str
    carrier: str | None
    reference: str | None
    status: str
    closed_at: datetime | None
    pallets: list[ManifestPalletSection] = field(default_factory=list)


def render_manifest_html(data: ManifestData) -> str:
    template = _jinja_env.get_template("manifest.html")

    total_boxes = sum(len(p.boxes) for p in data.pallets)
    total_units = sum(b.quantity for p in data.pallets for b in p.boxes)
    total_weight = sum(
        float(b.weight_kg) for p in data.pallets for b in p.boxes if b.weight_kg
    )

    return template.render(
        shipment=data,
        pallets=data.pallets,
        total_boxes=total_boxes,
        total_units=total_units,
        total_weight_kg=total_weight,
        generated_at=datetime.now(tz=timezone.utc).strftime("%d/%m/%Y %H:%M UTC"),
        legend_es=CUSTOMS_LEGEND_ES,
        legend_en=CUSTOMS_LEGEND_EN,
    )


def generate_manifest_pdf(data: ManifestData) -> bytes:
    from weasyprint import HTML

    html_str = render_manifest_html(data)
    return HTML(string=html_str).write_pdf()


@dataclass
class TransferManifestData:
    transfer_id: str
    from_center: str
    to_center: str
    status: str
    created_at: datetime
    boxes: list[ManifestBoxRow] = field(default_factory=list)


def render_transfer_manifest_html(data: TransferManifestData) -> str:
    template = _jinja_env.get_template("transfer_manifest.html")
    total_units = sum(b.quantity for b in data.boxes)
    total_weight = sum(float(b.weight_kg) for b in data.boxes if b.weight_kg)
    return template.render(
        transfer=data,
        total_units=total_units,
        total_weight_kg=total_weight,
        generated_at=datetime.now(tz=timezone.utc).strftime("%d/%m/%Y %H:%M UTC"),
        legend_es=CUSTOMS_LEGEND_ES,
        legend_en=CUSTOMS_LEGEND_EN,
    )


def generate_transfer_manifest_pdf(data: TransferManifestData) -> bytes:
    from weasyprint import HTML

    return HTML(string=render_transfer_manifest_html(data)).write_pdf()
