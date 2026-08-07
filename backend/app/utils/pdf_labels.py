"""A4 multi-label PDF generation for boxes.

Layout: 2-column × 5-row grid (10 labels per A4 page).
Each label contains:  QR code | box code | product name | batch | expiry | center name
"""

import io
from dataclasses import dataclass
from datetime import date

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

from app.utils.label_strings import date_format_for, strings_for
from app.utils.qr import box_qr_png


@dataclass(frozen=True)
class LabelData:
    code: str
    display_name: str
    category: str
    batch: str | None
    expiry_date: date | None
    quantity: int
    unit: str
    center_name: str
    base_url: str


_COLS = 2
_ROWS = 5
_MARGIN_H = 10 * mm
_MARGIN_V = 10 * mm
_PAGE_W, _PAGE_H = A4


def _label_dims() -> tuple[float, float]:
    usable_w = _PAGE_W - 2 * _MARGIN_H
    usable_h = _PAGE_H - 2 * _MARGIN_V
    return usable_w / _COLS, usable_h / _ROWS


def _draw_label(c: canvas.Canvas, label: LabelData, x: float, y: float, w: float, h: float,
                t: dict[str, str], date_fmt: str) -> None:
    pad = 3 * mm
    qr_size = h - 2 * pad

    # Border
    c.setStrokeColor(colors.HexColor("#d4d4d8"))
    c.setLineWidth(0.5)
    c.rect(x, y, w, h)

    # QR code
    qr_png = box_qr_png(label.code, label.base_url, size=4)
    img = ImageReader(io.BytesIO(qr_png))
    c.drawImage(img, x + pad, y + pad, qr_size, qr_size)

    # Text block
    tx = x + qr_size + 2 * pad
    ty = y + h - pad
    max_w = w - qr_size - 3 * pad

    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(colors.HexColor("#18181b"))
    c.drawString(tx, ty - 8, label.code)

    c.setFont("Helvetica", 6)
    c.setFillColor(colors.HexColor("#3f3f46"))

    name = label.display_name[:38] + "…" if len(label.display_name) > 38 else label.display_name
    c.drawString(tx, ty - 16, name)
    c.drawString(tx, ty - 24, f"{t['quantity']}: {label.quantity} {label.unit}")

    if label.batch:
        c.drawString(tx, ty - 32, f"{t['batch']}: {label.batch}")
    if label.expiry_date:
        c.drawString(tx, ty - 40, f"{t['expiry']}: {label.expiry_date.strftime(date_fmt)}")

    c.setFont("Helvetica", 5)
    c.setFillColor(colors.HexColor("#71717a"))
    c.drawString(tx, y + pad + 2, label.center_name[:40])


def generate_labels_pdf(labels: list[LabelData], lang: str | None = None) -> bytes:
    """Return PDF bytes with all labels laid out on A4 pages (10 per page).

    `lang` sigue el idioma que eligió quien imprime, igual que el resto del
    panel. Solo traduce las palabras del formulario: el producto, el lote y el
    centro salen como se capturaron.
    """
    t = strings_for(lang)
    date_fmt = date_format_for(lang)
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    label_w, label_h = _label_dims()

    per_page = _COLS * _ROWS
    for i, label in enumerate(labels):
        page_pos = i % per_page
        if page_pos == 0 and i > 0:
            c.showPage()

        col = page_pos % _COLS
        row = page_pos // _COLS

        x = _MARGIN_H + col * label_w
        # ReportLab y=0 is bottom; we draw top-down
        y = _PAGE_H - _MARGIN_V - (row + 1) * label_h

        _draw_label(c, label, x, y, label_w, label_h, t, date_fmt)

    c.save()
    return buf.getvalue()
