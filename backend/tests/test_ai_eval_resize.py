"""`evals/resize_labels.py` leaves the photos at the size production sends.

The capture form downscales to a 1600 px long side before uploading, so a
corpus of untouched 12 MB originals would measure an image the backend never
receives — and would be refused outright by its 5 MB limit. Doing that by hand
across a hundred files is the kind of step that gets skipped.
"""

import pathlib

import pytest
from PIL import Image

from evals.resize_labels import TARGET_LONG_SIDE, resize_folder, resize_photo


def _photo(path: pathlib.Path, width: int, height: int, **save_kwargs) -> pathlib.Path:
    Image.new("RGB", (width, height), (200, 30, 30)).save(path, "JPEG", **save_kwargs)
    return path


def test_a_big_photo_is_reduced_keeping_its_shape(tmp_path):
    """A squashed label is a harder label to read, so the aspect ratio holds."""
    src = _photo(tmp_path / "grande.jpg", 4032, 3024)
    dst = tmp_path / "out.jpg"

    resize_photo(src, dst)

    with Image.open(dst) as img:
        assert max(img.size) == TARGET_LONG_SIDE
        assert img.size == (TARGET_LONG_SIDE, 1200)  # 4:3 preserved


def test_a_portrait_photo_reduces_its_long_side_too(tmp_path):
    """Phones are held upright as often as sideways."""
    src = _photo(tmp_path / "vertical.jpg", 3024, 4032)
    dst = tmp_path / "out.jpg"

    resize_photo(src, dst)

    with Image.open(dst) as img:
        assert img.size == (1200, TARGET_LONG_SIDE)


def test_a_photo_that_already_fits_is_copied_without_re_encoding(tmp_path):
    """Re-encoding a JPEG loses detail every time, and the small print of a
    batch number is exactly the detail worth keeping."""
    src = _photo(tmp_path / "chica.jpg", 1200, 900)
    dst = tmp_path / "out.jpg"

    resize_photo(src, dst)

    assert dst.read_bytes() == src.read_bytes()


def test_the_rotation_a_phone_records_is_applied_not_dropped(tmp_path):
    """A phone stores the photo sideways and notes the rotation in EXIF. The
    browser honours that tag; a naive resize does not, so the corpus would end
    up with labels lying on their side while production sees them upright."""
    exif = Image.Exif()
    exif[0x0112] = 6  # rotate 90° clockwise on display
    src = _photo(tmp_path / "rotada.jpg", 2000, 1000, exif=exif)
    dst = tmp_path / "out.jpg"

    resize_photo(src, dst)

    with Image.open(dst) as img:
        # Applied, so the long side is now vertical...
        assert img.size == (800, TARGET_LONG_SIDE)
        # ...and the tag is gone, so nothing applies it a second time.
        assert 0x0112 not in img.getexif()


def test_metadata_does_not_travel_with_the_photo(tmp_path):
    """A phone photo carries where it was taken. These never leave the machine
    that made them, but stripping what isn't needed costs nothing."""
    exif = Image.Exif()
    exif[0x010F] = "TestPhone"  # Make
    src = _photo(tmp_path / "meta.jpg", 3000, 2000, exif=exif)
    dst = tmp_path / "out.jpg"

    resize_photo(src, dst)

    with Image.open(dst) as img:
        assert 0x010F not in img.getexif()


def test_an_existing_photo_is_never_overwritten_by_accident(tmp_path):
    """The destination holds a curated corpus whose expected answers were
    written by hand. Replacing one silently would leave `ocr_cases.json`
    describing a photo that is no longer there."""
    origen, destino = tmp_path / "src", tmp_path / "dst"
    origen.mkdir()
    destino.mkdir()
    _photo(origen / "etiqueta.jpg", 3000, 2000)
    previa = _photo(destino / "etiqueta.jpg", 800, 600).read_bytes()

    hechas, omitidas = resize_folder(origen, destino)

    assert hechas == []
    assert len(omitidas) == 1 and "etiqueta.jpg" in omitidas[0]
    assert (destino / "etiqueta.jpg").read_bytes() == previa


def test_force_replaces_it_when_that_is_what_was_asked(tmp_path):
    origen, destino = tmp_path / "src", tmp_path / "dst"
    origen.mkdir()
    destino.mkdir()
    _photo(origen / "etiqueta.jpg", 3000, 2000)
    previa = _photo(destino / "etiqueta.jpg", 800, 600).read_bytes()

    hechas, omitidas = resize_folder(origen, destino, force=True)

    assert len(hechas) == 1 and omitidas == []
    assert (destino / "etiqueta.jpg").read_bytes() != previa


def test_whatever_is_not_a_photo_is_left_alone(tmp_path):
    """An export folder comes with company: .DS_Store, a stray note, a video."""
    origen, destino = tmp_path / "src", tmp_path / "dst"
    origen.mkdir()
    destino.mkdir()
    _photo(origen / "etiqueta.jpg", 3000, 2000)
    (origen / ".DS_Store").write_bytes(b"junk")
    (origen / "notas.txt").write_text("lote L2291")

    hechas, omitidas = resize_folder(origen, destino)

    assert len(hechas) == 1
    assert list(destino.iterdir()) == [destino / "etiqueta.jpg"]


def test_a_png_stays_a_png(tmp_path):
    """The backend takes JPEG, PNG and WebP, and `ocr_cases.json` names the
    file by its extension: changing it would break the case that points to it.
    """
    src = tmp_path / "captura.png"
    Image.new("RGBA", (3000, 2000), (10, 200, 10, 255)).save(src, "PNG")
    dst = tmp_path / "out.png"

    resize_photo(src, dst)

    with Image.open(dst) as img:
        assert img.format == "PNG"
        assert max(img.size) == TARGET_LONG_SIDE


def test_a_folder_that_is_not_there_says_so(tmp_path):
    with pytest.raises(FileNotFoundError):
        resize_folder(tmp_path / "no-existe", tmp_path)
