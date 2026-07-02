"""URL-safe slug generation for public-facing entities (e.g. Campaign)."""

import re
import unicodedata


def slugify(text: str) -> str:
    """Lowercase, accent-stripped, hyphen-separated slug.

    "Operación Venezuela — Terremoto Junio 2026" -> "operacion-venezuela-terremoto-junio-2026"
    """
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    lowered = ascii_text.lower()
    hyphenated = re.sub(r"[^a-z0-9]+", "-", lowered)
    return hyphenated.strip("-")
