"""Tests for slugify() — used for Campaign public URLs (/eventos/{slug})."""

from app.utils.slug import slugify


def test_basic_lowercase_and_hyphens():
    assert slugify("Operación Venezuela") == "operacion-venezuela"


def test_strips_accents():
    assert slugify("Sismo en México — Región Norte") == "sismo-en-mexico-region-norte"


def test_collapses_special_chars():
    assert slugify("Terremoto (Junio 2026)!!") == "terremoto-junio-2026"


def test_strips_leading_trailing_hyphens():
    assert slugify("  --Ayuda-- ") == "ayuda"


def test_already_slug_like():
    assert slugify("donaciones-generales") == "donaciones-generales"


def test_empty_string():
    assert slugify("") == ""


def test_only_special_chars_yields_empty():
    assert slugify("¡¡¡???") == ""
