"""Regenera `app/assets/logo.png` desde el logo canónico de Cloudinary.

**Por qué existe este script en vez de leer la URL al generar el documento.**

La marca vive en Cloudinary y de ahí la toma todo el frontend: esa es la fuente
de verdad, y tener dos copias que se separan sin que nadie lo note sería peor
que tener una. Este script resuelve esa copia **al desplegar**, no al imprimir.

Traer la imagen en el momento de renderizar tendría tres problemas, en orden de
gravedad:

1. **Un documento reimpreso tiene que verse como el que viajó con la carga.**
   Si el logo se lee en vivo, cambiar la imagen en Cloudinary reescribe en
   silencio el aspecto de todos los documentos pasados, incluido el manifiesto
   que alguien vuelve a imprimir para un envío de hace seis meses.
2. **El documento lo arma un trabajo de fondo.** Un adorno no puede meter una
   dependencia de red en la ruta que produce el manifiesto: si Cloudinary tarda
   o no responde, lo que se cae es la impresión, no el logo.
3. **Peso.** El original son 1024x1024 y ~1.7 MB. Para 4 mm de pie de página
   sobran 128 px y 17 KB, y bajarlo entero en cada documento sería tráfico
   pagado por nada.

**Por qué vive en `tools/` y no en `scripts/`.** `backend/scripts/` está en el
`.gitignore` a propósito: ahí viven los scripts que escriben en producción, y la
política del proyecto es que no se versionen. Este escribe un archivo del
repositorio, así que tiene que estar versionado — si no, la "única fuente de
verdad" de la marca sería un archivo que solo existe en la máquina de quien lo
corrió, y nadie más podría regenerar el logo.

Uso:

    python tools/refresh_logo_asset.py

Requiere red, y por eso se corre a mano cuando cambia la marca — no en el
arranque de la aplicación.
"""

from __future__ import annotations

import sys
import urllib.request
from io import BytesIO
from pathlib import Path

from PIL import Image

# El mismo archivo que usa el frontend. Si cambia allá, cambia aquí y se vuelve
# a correr este script.
SOURCE_URL = (
    "https://res.cloudinary.com/dtvdqlxtd/image/upload/v1782794310/image_degkq9.png"
)

# 128 px cubre 4 mm de pie a más de 800 dpi. Más resolución solo engorda cada
# PDF sin que nadie lo vea.
SIZE = 128

DEST = Path(__file__).resolve().parent.parent / "app" / "assets" / "logo.png"


def main() -> int:
    with urllib.request.urlopen(SOURCE_URL, timeout=30) as response:  # noqa: S310
        original = Image.open(BytesIO(response.read()))

    # Se conserva la transparencia: el pie se dibuja sobre blanco hoy, pero un
    # fondo blanco horneado se vería como un recuadro el día que no lo sea.
    resized = original.convert("RGBA").resize((SIZE, SIZE), Image.LANCZOS)
    DEST.parent.mkdir(parents=True, exist_ok=True)
    resized.save(DEST, "PNG", optimize=True)

    print(f"{DEST.relative_to(DEST.parents[2])}: {SIZE}x{SIZE}, {DEST.stat().st_size:,} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
