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
        """Se mira el PDF impreso, no el fuente.

        La versión anterior de esta prueba leía `pdf_pallet_label.py` y buscaba
        el dominio ahí. Al mover el pie de página a `label_strings.py` para
        traducirlo, la prueba falló sin que la etiqueta hubiera cambiado en
        nada: vigilaba dónde estaba escrita la cadena y no qué se imprime.
        """
        import io

        from pypdf import PdfReader

        pdf = generate_pallet_label_pdf(PalletLabelData(
            code="TM-DOMINIO", center_name="Centro de Acopio Prueba", status="CLOSED",
        ))
        texto = "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(pdf)).pages)
        assert "acopio.org" not in texto
        assert "araguaney.lat" in texto

    def test_las_plantillas_declaran_tamano_de_pagina(self):
        """Sin @page el ancho útil depende del renderizador y se corta una columna."""
        for plantilla in ("manifest.html", "transfer_manifest.html"):
            texto = (_TEMPLATES / plantilla).read_text()
            assert "@page" in texto, f"{plantilla} no declara @page"
            assert "landscape" in texto, f"{plantilla} debería ser apaisada: son 10 columnas"


class TestPaginacionDelManifiesto:
    """El manifiesto se imprime y viaja con la carga. Una hoja de más por
    documento no es un detalle cosmético cuando se imprimen decenas."""

    def test_una_tarima_no_se_declara_indivisible(self):
        """Regresión: `.pallet-block` llevaba `page-break-inside: avoid`.

        Parecía más prolijo y costaba una hoja casi en blanco en cada
        manifiesto real. Una tarima de sesenta cajas no cabe debajo del
        encabezado del envío, así que el bloque entero se empujaba a la hoja
        siguiente... y se partía igual, porque tampoco cabe en una hoja. Se
        pagaba una hoja por una indivisibilidad imposible de cumplir.
        """
        css = (_TEMPLATES / "manifest.html").read_text(encoding="utf-8")
        inicio = css.index(".pallet-block")
        bloque = css[inicio:css.index("}", inicio)]
        assert "avoid" not in bloque, (
            "la tarima volvió a declararse indivisible; ver el historial de esta prueba"
        )

    def test_el_codigo_de_tarima_no_se_separa_de_su_tabla(self):
        """Lo único que sí tiene que mantenerse junto: una hoja que empieza con
        filas de cajas y sin el código de la tarima no dice de qué tarima habla."""
        css = (_TEMPLATES / "manifest.html").read_text(encoding="utf-8")
        cabecera = css[css.index(".pallet-header"):css.index(".subtotal-keep")]
        assert "break-after: avoid" in cabecera

    def test_la_tabla_repite_su_encabezado_al_partirse(self):
        """Una tabla partida sin encabezado son columnas de números sin nombre,
        que es lo que alguien lee en una aduana."""
        html = (_TEMPLATES / "manifest.html").read_text(encoding="utf-8")
        # `thead` es lo que WeasyPrint repite en cada hoja de continuación.
        assert "<thead>" in html
        assert html.index("<thead>") < html.index("<tbody>")


class TestEtiquetasBilingues:
    """La etiqueta impresa sigue el idioma del panel de quien la imprime.

    Antes estaba fija en español. Eso dejaba a un centro operando en inglés con
    una etiqueta que no podía leer del todo, y abría una discrepancia peor: la
    etiqueta que el cliente dibuja sin conexión sí seguía el idioma elegido, así
    que la misma caja podía salir con dos textos distintos según quién la
    imprimiera.
    """

    def _texto(self, pdf: bytes) -> str:
        import io

        from pypdf import PdfReader

        return "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(pdf)).pages)

    def _etiqueta(self) -> LabelData:
        return LabelData(
            code="BX-I18N01", display_name="Ibuprofeno 500 mg", category="MEDICINE",
            batch="L001", expiry_date=date(2027, 3, 4), quantity=24, unit="caja",
            center_name="Centro Coyoacán", base_url="https://araguaney.lat",
        )

    def test_las_palabras_del_formulario_cambian_de_idioma(self):
        es = self._texto(generate_labels_pdf([self._etiqueta()], "es"))
        en = self._texto(generate_labels_pdf([self._etiqueta()], "en"))

        assert "Lote" in es and "Cad" in es
        assert "Batch" in en and "Exp" in en

    def test_los_datos_capturados_no_se_traducen(self):
        """Traducir el nombre de un producto inventaría uno que nadie dio de alta."""
        en = self._texto(generate_labels_pdf([self._etiqueta()], "en"))

        assert "Ibuprofeno 500 mg" in en
        assert "L001" in en
        assert "Centro Coyoacán" in en

    def test_la_fecha_no_queda_ambigua(self):
        """En una caducidad, 03/04 son dos meses distintos y quien la lee no
        tiene forma de saber cuál se usó."""
        es = self._texto(generate_labels_pdf([self._etiqueta()], "es"))
        en = self._texto(generate_labels_pdf([self._etiqueta()], "en"))

        assert "04/03/2027" in es
        assert "03/04/2027" in en

    def test_un_idioma_desconocido_cae_en_espanol(self):
        """Una etiqueta en el idioma equivocado se lee igual; una excepción en un
        trabajo de fondo deja a alguien sin etiquetas y sin saber por qué."""
        pdf = generate_labels_pdf([self._etiqueta()], "pt-BR")

        assert "Lote" in self._texto(pdf)

    def test_la_etiqueta_de_tarima_tambien(self):
        tarima = PalletLabelData(
            code="TM-I18N01", center_name="Centro Coyoacán", status="CLOSED",
            box_codes=["BX-I18N01"],
            closed_at=datetime(2026, 3, 4, 10, 0, tzinfo=timezone.utc),
        )

        assert "Cerrada" in self._texto(generate_pallet_label_pdf(tarima, "es"))
        assert "Closed" in self._texto(generate_pallet_label_pdf(tarima, "en"))
