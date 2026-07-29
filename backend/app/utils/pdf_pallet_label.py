"""Pallet label PDF — A4, one label per page.

Label shows: pallet QR + code + status + center + box count + box codes list.
"""

import io
from dataclasses import dataclass, field
from datetime import datetime

import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


@dataclass
class PalletLabelData:
    code: str
    center_name: str
    status: str
    box_codes: list[str] = field(default_factory=list)
    closed_at: datetime | None = None
    base_url: str = "http://localhost:3000"


def generate_pallet_label_pdf(pallet: PalletLabelData) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4

    # QR apunta a la ficha pública de la tarima
    qr = qrcode.QRCode(box_size=4, border=2)
    qr.add_data(f"{pallet.base_url}/p/{pallet.code}")
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    qr_buf = io.BytesIO()
    img.save(qr_buf, format="PNG")
    qr_buf.seek(0)
    # drawImage espera una ruta o un ImageReader: pasarle el BytesIO crudo
    # revienta con "expected str, bytes or os.PathLike object, not BytesIO".
    qr_image = ImageReader(qr_buf)

    qr_size = 55 * mm
    qr_x = (w - qr_size) / 2
    qr_y = h - 30 * mm - qr_size

    c.drawImage(qr_image, qr_x, qr_y, width=qr_size, height=qr_size)

    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(w / 2, qr_y - 12 * mm, pallet.code)

    c.setFont("Helvetica", 11)
    c.drawCentredString(w / 2, qr_y - 19 * mm, pallet.center_name)

    status_label = {"OPEN": "Abierta", "CLOSED": "Cerrada", "SHIPPED": "Enviada"}.get(pallet.status, pallet.status)
    c.drawCentredString(w / 2, qr_y - 25 * mm, f"Estado: {status_label}")

    box_count = len(pallet.box_codes)
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(w / 2, qr_y - 33 * mm, f"{box_count} caja{'s' if box_count != 1 else ''}")

    if pallet.closed_at:
        c.setFont("Helvetica", 9)
        date_str = pallet.closed_at.strftime("%d/%m/%Y %H:%M")
        c.drawCentredString(w / 2, qr_y - 39 * mm, f"Cerrada: {date_str}")

    # Box codes list
    if pallet.box_codes:
        y_start = qr_y - 50 * mm
        c.setFont("Helvetica-Bold", 9)
        c.drawString(25 * mm, y_start, "Cajas en esta tarima:")
        c.setFont("Helvetica", 8)
        y = y_start - 5 * mm
        col_w = (w - 50 * mm) / 3
        for i, code in enumerate(pallet.box_codes):
            col = i % 3
            row = i // 3
            x = 25 * mm + col * col_w
            c.drawString(x, y - row * 5 * mm, f"• {code}")

    c.setFont("Helvetica", 7)
    c.drawCentredString(w / 2, 15 * mm, "Araguaney · Coordinación humanitaria · araguaney.lat")

    c.save()
    return buf.getvalue()
