"""El dominio que se imprime sale de un solo ajuste, `SITE_DOMAIN`.

Correos, manifiestos y etiquetas lo mostraban escrito a mano en unas treinta
líneas. Mudar el producto de dominio (Fase 29) dejaba dos salidas: un reemplazo
masivo de texto, que siempre olvida una línea, o un valor que se cambia en un
solo lugar. Estas pruebas fijan la segunda: con otro dominio configurado, ningún
documento conserva el anterior.
"""

import io

import pytest
from pypdf import PdfReader

from app.config import settings
from app.email import _render
from app.utils.branding import contact_email, site_domain
from app.utils.manifest import (
    ManifestData,
    TransferManifestData,
    render_manifest_html,
    render_transfer_manifest_html,
)
from app.utils.pdf_pallet_label import PalletLabelData, generate_pallet_label_pdf

_DOMAIN = "ejemplo.test"


@pytest.fixture
def other_domain(monkeypatch):
    monkeypatch.setattr(settings, "site_domain", _DOMAIN)


def test_contact_email_uses_the_configured_domain(other_domain):
    assert site_domain() == _DOMAIN
    assert contact_email("hola") == f"hola@{_DOMAIN}"


def test_domain_is_normalized(monkeypatch):
    """Un espacio o una mayúscula en la variable no debe llegar a un `mailto:`."""
    monkeypatch.setattr(settings, "site_domain", "  Ejemplo.TEST ")
    assert site_domain() == _DOMAIN


@pytest.mark.parametrize(
    "template",
    [
        "invitation.html",
        "password_reset.html",
        "password_changed.html",
        "donation_confirm.html",
        "donation_registered.html",
        "donation_received.html",
        "donation_shipped.html",
        "center_application_confirm.html",
        "center_application_received.html",
        "center_application_rejected.html",
    ],
)
def test_emails_point_to_the_configured_contact(other_domain, template):
    html = _render(template)
    assert f"hola@{_DOMAIN}" in html
    assert "araguaney.lat" not in html


def test_manifest_footer_uses_the_configured_domain(other_domain):
    from datetime import datetime, timezone

    html = render_manifest_html(ManifestData(
        shipment_id="00000000-0000-0000-0000-000000000000",
        destination="Destino",
        carrier=None,
        reference=None,
        status="CLOSED",
        closed_at=datetime.now(timezone.utc),
    ))
    assert _DOMAIN in html
    assert "araguaney.lat" not in html


def test_transfer_manifest_footer_uses_the_configured_domain(other_domain):
    from datetime import datetime, timezone

    html = render_transfer_manifest_html(TransferManifestData(
        transfer_id="00000000-0000-0000-0000-000000000000",
        from_center="Origen",
        to_center="Destino",
        status="SENT",
        created_at=datetime.now(timezone.utc),
    ))
    assert _DOMAIN in html
    assert "araguaney.lat" not in html


def test_pallet_label_footer_uses_the_configured_domain(other_domain):
    """Se lee el PDF impreso, no el fuente: lo que importa es lo que sale."""
    pdf = generate_pallet_label_pdf(PalletLabelData(
        code="TM-DOMINIO", center_name="Centro de Acopio Prueba", status="CLOSED",
    ))
    text = "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(pdf)).pages)
    assert _DOMAIN in text
    assert "araguaney.lat" not in text
