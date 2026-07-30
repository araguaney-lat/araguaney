"""Pallet label PDF — A4, one label per page.

Label shows: pallet QR + code + status + center + box count + box codes list.
"""

import io
from dataclasses import dataclass, field
from datetime import datetime

import qrcode
from app.legal import CUSTOMS_LEGEND_EN, CUSTOMS_LEGEND_ES
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


# Nada del listado de cajas baja de aquí: abajo van la leyenda y el pie.
_LEGEND_TOP = 30 * mm
_ROW_HEIGHT = 5 * mm
_COLUMNS = 3


def fit_box_codes(codes: list[str], y_start: float) -> tuple[list[str], int]:
    """Cuántas cajas caben antes de la leyenda, y cuántas quedan fuera.

    Una tarima con muchas cajas escribía encima de la leyenda de aduana y hasta
    fuera de la hoja. El detalle completo vive en el manifiesto, que es el
    documento que lo sostiene; lo que esta etiqueta no puede perder es la
    declaración.
    """
    filas = max(int((y_start - _LEGEND_TOP) / _ROW_HEIGHT), 0)
    visibles = codes[: filas * _COLUMNS]
    return visibles, len(codes) - len(visibles)


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

        visibles, restantes = fit_box_codes(pallet.box_codes, y)

        for i, code in enumerate(visibles):
            col = i % 3
            row = i // 3
            x = 25 * mm + col * col_w
            c.drawString(x, y - row * 5 * mm, f"• {code}")

        # Nunca se recorta en silencio: quien lee la etiqueta sabe que hay más.
        if restantes:
            c.setFont("Helvetica-Oblique", 8)
            c.drawString(
                25 * mm, y - (len(visibles) // 3 + 1) * 5 * mm,
                f"… y {restantes} caja{'s' if restantes != 1 else ''} más — ver manifiesto",
            )

    # Leyenda de aduana: la tarima viaja sola y su etiqueta tiene que sostener
    # la declaración sin depender de que el manifiesto llegue con ella.
    c.setFont("Helvetica", 6.5)
    c.drawCentredString(w / 2, 24 * mm, CUSTOMS_LEGEND_ES)
    c.setFont("Helvetica-Oblique", 6)
    c.drawCentredString(w / 2, 20.5 * mm, CUSTOMS_LEGEND_EN)

    c.setFont("Helvetica", 7)
    c.drawCentredString(w / 2, 15 * mm, "Araguaney · Coordinación humanitaria · araguaney.lat")

    c.save()
    return buf.getvalue()
