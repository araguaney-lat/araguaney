"""QR code generation utilities.

Generates QR codes pointing to public ficha URLs.
The QR is returned as raw PNG bytes — callers decide how to embed it.
"""

import io

import qrcode
from qrcode.image.pil import PilImage


def _make_qr_png(url: str, size: int = 10) -> bytes:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=size,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img: PilImage = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def box_qr_png(code: str, base_url: str, size: int = 10) -> bytes:
    """Return PNG bytes for a QR code pointing to /b/{code}."""
    return _make_qr_png(f"{base_url.rstrip('/')}/b/{code}", size)


def pallet_qr_png(code: str, base_url: str, size: int = 10) -> bytes:
    """Return PNG bytes for a QR code pointing to /p/{code}."""
    return _make_qr_png(f"{base_url.rstrip('/')}/p/{code}", size)


def donation_qr_png(code: str, base_url: str, size: int = 10) -> bytes:
    """Return PNG bytes for a QR code pointing to /d/{code}."""
    return _make_qr_png(f"{base_url.rstrip('/')}/d/{code}", size)
