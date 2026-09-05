"""Deja las fotos de etiqueta al tamaño que la aplicación envía de verdad.

El formulario de captura reduce la foto a 1600 px de lado largo antes de
subirla (`frontend/src/lib/downscale-image.ts`), porque una foto de teléfono
pesa entre 8 y 12 MB y el backend corta en 5. Medir el OCR sobre la original
mediría una imagen que en producción nunca se envía — y el runner la
rechazaría igual, en la revisión previa.

Hacerlo a mano con cien archivos es el tipo de paso que se termina saltando,
así que existe este comando:

    python -m evals.resize_labels ~/Downloads/fotos-etiquetas

Lee de la carpeta de origen y **escribe en otra** (`evals/labels/` por
omisión): las originales quedan intactas, que es lo que uno quiere cuando lo
que va a redimensionar son las fotos que acaba de tomar. Un archivo que ya
existe en el destino no se pisa sin `--force`, porque ahí vive un conjunto
curado cuyas respuestas se escribieron a mano.

Pillow entra por `qrcode[pil]` en `requirements.txt`, la misma que genera los
QR de las etiquetas.
"""

from __future__ import annotations

import argparse
import pathlib
import shutil
import sys

from PIL import Image, ImageOps

# Los mismos dos números que el navegador. Si allá cambian, aquí también: un
# corpus medido a otro tamaño mide otra cosa.
TARGET_LONG_SIDE = 1600
QUALITY = 85

# Los tres formatos que el backend acepta. La extensión se conserva porque
# `ocr_cases.json` nombra cada archivo por ella.
SUPPORTED = {".jpg", ".jpeg", ".png", ".webp"}


def resize_photo(src: pathlib.Path, dst: pathlib.Path) -> str:
    """Escribe en `dst` la versión de `src` que la aplicación mandaría.

    Devuelve qué se hizo, para poder contarlo al final.
    """
    with Image.open(src) as original:
        # El teléfono guarda la foto como salió del sensor y anota la rotación
        # en EXIF. El navegador la aplica; una reducción ingenua no, y el
        # corpus terminaría con etiquetas acostadas mientras producción las ve
        # derechas.
        img = ImageOps.exif_transpose(original)

        if max(img.size) <= TARGET_LONG_SIDE:
            # Ya cabe: copiar los bytes en vez de recodificar. Cada pasada de
            # JPEG se come un poco de la letra chica, que es justo el lote.
            shutil.copyfile(src, dst)
            return "copiada"

        factor = TARGET_LONG_SIDE / max(img.size)
        medida = (round(img.width * factor), round(img.height * factor))
        reducida = img.resize(medida, Image.LANCZOS)

        # Sin `exif=`: los metadatos no viajan. La orientación ya se aplicó
        # arriba y volver a escribir el tag la aplicaría dos veces; de paso se
        # va la ubicación donde se tomó la foto, que no le hace falta a nadie.
        if reducida.mode in ("RGBA", "P", "LA") and dst.suffix.lower() in (".jpg", ".jpeg"):
            reducida = reducida.convert("RGB")
        reducida.save(dst, quality=QUALITY)

    return "reducida"


def resize_folder(
    src_dir: pathlib.Path,
    dst_dir: pathlib.Path,
    force: bool = False,
) -> tuple[list[str], list[str]]:
    """Todas las fotos de `src_dir` en `dst_dir`. Devuelve (hechas, omitidas)."""
    if not src_dir.is_dir():
        raise FileNotFoundError(f"No existe la carpeta de origen: {src_dir}")

    dst_dir.mkdir(parents=True, exist_ok=True)
    hechas: list[str] = []
    omitidas: list[str] = []

    for src in sorted(src_dir.iterdir()):
        if not src.is_file() or src.suffix.lower() not in SUPPORTED:
            continue

        dst = dst_dir / src.name
        if dst.exists() and not force:
            omitidas.append(f"{src.name}: ya está en el destino (usa --force para reemplazar)")
            continue

        hechas.append(f"{src.name}: {resize_photo(src, dst)}")

    return hechas, omitidas


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("src", type=pathlib.Path, help="Carpeta con las fotos originales.")
    parser.add_argument(
        "--dst",
        type=pathlib.Path,
        default=pathlib.Path(__file__).parent / "labels",
        help="Dónde dejarlas (por omisión evals/labels/).",
    )
    parser.add_argument(
        "--force", action="store_true", help="Reemplazar las que ya estén en el destino."
    )
    args = parser.parse_args()

    try:
        hechas, omitidas = resize_folder(args.src, args.dst, force=args.force)
    except FileNotFoundError as exc:
        print(exc, file=sys.stderr)
        return 2

    for linea in hechas:
        print(f"  · {linea}")
    for linea in omitidas:
        print(f"  · {linea}", file=sys.stderr)

    print(f"\n{len(hechas)} fotos en {args.dst}", end="")
    print(f", {len(omitidas)} omitidas" if omitidas else "")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
