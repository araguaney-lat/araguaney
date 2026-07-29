"""Los documentos generados deben salir siempre, y con la identidad correcta.

Son los papeles que acompañan la carga física: se imprimen, se pegan en tarimas
y se presentan en aduana. Un fallo aquí no se nota en la interfaz, solo cuando
alguien va a imprimir.
"""

from datetime import date, datetime, timezone
from pathlib import Path

from app.utils.pdf_labels import LabelData, generate_labels_pdf
from app.utils.pdf_pallet_label import PalletLabelData, generate_pallet_label_pdf

_TEMPLATES = Path(__file__).resolve().parents[1] / "app/templates"


class TestEtiquetaTarima:
    def test_genera_un_pdf_valido(self):
        """Regresión: drawImage recibía un BytesIO crudo y reventaba.

        ReportLab espera una ruta o un ImageReader, así que la etiqueta de
        tarima fallaba siempre con "expected str, bytes or os.PathLike object,
        not BytesIO", mientras que la de caja funcionaba porque sí usa
        ImageReader.
        """
        pdf = generate_pallet_label_pdf(PalletLabelData(
            code="TM-PRUEBA1",
            center_name="Centro de Acopio Prueba",
            status="CLOSED",
            box_codes=["BX-AAA111", "BX-BBB222"],
            closed_at=datetime(2026, 7, 29, 18, 30, tzinfo=timezone.utc),
        ))
        assert pdf.startswith(b"%PDF"), "no es un PDF"
        assert len(pdf) > 1000, "PDF sospechosamente pequeño"

    def test_sin_cajas_tampoco_revienta(self):
        pdf = generate_pallet_label_pdf(PalletLabelData(
            code="TM-VACIA01", center_name="Centro sin cajas", status="OPEN",
        ))
        assert pdf.startswith(b"%PDF")


class TestEtiquetasCaja:
    def test_genera_un_pdf_valido(self):
        etiquetas = [
            LabelData(
                code=f"BX-TEST{i:03d}",
                display_name="Amoxicilina + ácido clavulánico 625mg tableta",
                category="MEDICINE",
                batch="LOTE-2026001",
                expiry_date=date(2028, 3, 20),
                quantity=24,
                unit="unidades",
                center_name="Centro de Acopio Prueba",
                base_url="http://localhost:3000",
            )
            for i in range(3)
        ]
        pdf = generate_labels_pdf(etiquetas)
        assert pdf.startswith(b"%PDF")


class TestIdentidadEnDocumentos:
    """El nombre viejo del proyecto llegó a imprimirse en documentos de aduana."""

    def test_las_plantillas_no_usan_el_nombre_viejo(self):
        for plantilla in ("manifest.html", "transfer_manifest.html"):
            texto = (_TEMPLATES / plantilla).read_text()
            assert "Acopio — Coordinación" not in texto, plantilla
            assert "Acopio · Coordinación" not in texto, plantilla
            assert "Araguaney · Coordinación humanitaria" in texto, plantilla

    def test_la_etiqueta_de_tarima_no_usa_el_dominio_viejo(self):
        fuente = (Path(__file__).resolve().parents[1] / "app/utils/pdf_pallet_label.py").read_text()
        assert "acopio.org" not in fuente
        assert "araguaney.lat" in fuente

    def test_las_plantillas_declaran_tamano_de_pagina(self):
        """Sin @page el ancho útil depende del renderizador y se corta una columna."""
        for plantilla in ("manifest.html", "transfer_manifest.html"):
            texto = (_TEMPLATES / plantilla).read_text()
            assert "@page" in texto, f"{plantilla} no declara @page"
            assert "landscape" in texto, f"{plantilla} debería ser apaisada: son 10 columnas"
