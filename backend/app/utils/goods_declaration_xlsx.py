"""La declaración de mercancías como hoja de cálculo.

La versión JSON es para quien integra con un sistema; esta es para quien la
abre, la revisa y la manda por correo. Por eso lo que falta va arriba y
resaltado: es lo primero que tiene que ver quien la recibe, no una nota al pie.

Funciona igual con o sin perfil de país — los campos universales siempre están,
y el perfil solo agrega los nombres traducidos.
"""

import io

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill

_COLS = (
    ("Descripción", 42),
    ("Código HS", 16),
    ("Cantidad", 12),
    ("Unidad", 16),
    ("Peso kg", 14),
)
_CAMPOS = ("description", "hs_code", "quantity", "unit", "weight_kg")

_HEADER_FILL = PatternFill("solid", fgColor="E5E7EB")
_ALERT_FILL = PatternFill("solid", fgColor="FDE8E8")


def build_declaration_xlsx(doc: dict) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "Declaración de mercancías"

    ws.merge_cells("A1:E1")
    ws["A1"] = f"DECLARACIÓN DE MERCANCÍAS · {doc.get('reference') or '—'}"
    ws["A1"].font = Font(bold=True, size=13)

    ws.merge_cells("A2:E2")
    ws["A2"] = doc["_notice"]
    ws["A2"].font = Font(size=8, italic=True)
    ws["A2"].alignment = Alignment(wrap_text=True, vertical="top")
    ws.row_dimensions[2].height = 32

    fila = 4

    # Lo que falta va antes que los datos: quien abre esto necesita saber qué
    # completar antes de leer nada más.
    if doc["_missing"]:
        ws.merge_cells(f"A{fila}:E{fila}")
        celda = ws.cell(row=fila, column=1, value="DATOS QUE FALTAN")
        celda.font = Font(bold=True, size=10)
        celda.fill = _ALERT_FILL
        fila += 1
        for texto in doc["_missing"]:
            ws.merge_cells(f"A{fila}:E{fila}")
            c = ws.cell(row=fila, column=1, value=f"· {texto}")
            c.font = Font(size=9)
            c.fill = _ALERT_FILL
            c.alignment = Alignment(wrap_text=True)
            fila += 1
        fila += 1

    emisor = doc.get("issuer") or {}
    for etiqueta, valor in (
        ("Emisor (razón social)", emisor.get("legal_name")),
        ("Identificación fiscal", emisor.get("tax_id")),
        ("Domicilio", emisor.get("address")),
        ("Origen", doc.get("origin")),
        ("Destino", doc.get("destination")),
        ("Peso bruto total", doc.get("gross_weight_kg")),
        ("Unidad de peso", doc.get("weight_unit")),
        ("Número de bultos", doc.get("packages")),
        ("Total de renglones", doc.get("total_lines")),
    ):
        ws.cell(row=fila, column=1, value=etiqueta).font = Font(bold=True, size=9)
        c = ws.cell(row=fila, column=2, value=valor if valor is not None else "—")
        if valor is None:
            c.fill = _ALERT_FILL
        fila += 1

    fila += 1
    for i, (nombre, ancho) in enumerate(_COLS, start=1):
        c = ws.cell(row=fila, column=i, value=nombre)
        c.font = Font(bold=True, size=9)
        c.fill = _HEADER_FILL
        ws.column_dimensions[c.column_letter].width = ancho
    fila += 1

    for linea in doc["lines"]:
        for i, clave in enumerate(_CAMPOS, start=1):
            valor = linea.get(clave)
            c = ws.cell(row=fila, column=i, value=valor if valor is not None else "—")
            c.font = Font(size=9)
            # La celda vacía se ve: es la que alguien tiene que llenar.
            if valor is None:
                c.fill = _ALERT_FILL
        fila += 1

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
