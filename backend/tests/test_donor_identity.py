"""Identidad estructurada del donante en el intake (Fase 19).

Las donaciones son anónimas por default; un check en el intake despliega el
formulario. Persona física pide solo nombre y apellido; persona moral exige
razón social, representante, email y teléfono.

La cartera de donantes es la PII más sensible del sistema, así que el
aislamiento entre centros se prueba explícitamente: un centro no puede ver ni
enumerar los donantes de otro.
"""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.repositories.donor_repository import DonorRepository
from app.schemas.donor import DonorInput

CENTER_A = uuid4()
CENTER_B = uuid4()
USER_ID = uuid4()


def _fisica(**kwargs):
    data = {"donor_type": "fisica", "first_name": "Ana", "last_name": "Ríos"}
    data.update(kwargs)
    return data


def _moral(**kwargs):
    data = {
        "donor_type": "moral",
        "legal_name": "Lácteos del Valle SA de CV",
        "first_name": "Luis",
        "last_name": "Pérez",
        "email": "contacto@lacteos.example",
        "phone": "5555551234",
    }
    data.update(kwargs)
    return data


# ── Validación por tipo ───────────────────────────────────────────────────────

def test_fisica_solo_exige_nombre_y_apellido():
    donor = DonorInput(**_fisica())
    assert donor.email is None and donor.phone is None


def test_fisica_acepta_email_y_telefono_opcionales():
    donor = DonorInput(**_fisica(email="ana@example.com", phone="55 5555 1234"))
    assert donor.email == "ana@example.com"


def test_fisica_sin_apellido_falla():
    with pytest.raises(ValidationError):
        DonorInput(**_fisica(last_name=""))


def test_moral_exige_razon_social():
    with pytest.raises(ValidationError):
        DonorInput(**_moral(legal_name=""))


def test_moral_exige_email_y_telefono():
    with pytest.raises(ValidationError):
        DonorInput(**_moral(email=None))
    with pytest.raises(ValidationError):
        DonorInput(**_moral(phone=None))


def test_moral_exige_representante():
    """Quien lleva la donación tiene nombre; una razón social sola no basta."""
    with pytest.raises(ValidationError):
        DonorInput(**_moral(first_name=""))


def test_fisica_no_lleva_razon_social():
    """legal_name es exclusivo de persona moral."""
    with pytest.raises(ValidationError):
        DonorInput(**_fisica(legal_name="Algo SA"))


def test_telefono_se_normaliza():
    donor = DonorInput(**_moral(phone="+52 (55) 5555-1234"))
    assert donor.phone == "+525555551234"


def test_email_se_normaliza_a_minusculas():
    donor = DonorInput(**_fisica(email="  Ana@Example.COM "))
    assert donor.email == "ana@example.com"


# ── find_or_create: dedupe dentro del centro, nunca entre centros ─────────────

def _repo_con(existente):
    db = MagicMock()
    db.execute.return_value.scalar_one_or_none.return_value = existente
    return DonorRepository(db), db


def test_mismo_email_en_el_mismo_centro_reutiliza_el_registro():
    previo = MagicMock()
    previo.id = uuid4()
    repo, db = _repo_con(previo)

    donor = repo.find_or_create(DonorInput(**_fisica(email="ana@example.com")), CENTER_A)

    assert donor is previo
    db.add.assert_not_called()


def test_sin_email_siempre_crea_registro_nuevo():
    """Sin email no hay llave de deduplicación: cada captura es una entrada."""
    repo, db = _repo_con(None)

    repo.find_or_create(DonorInput(**_fisica()), CENTER_A)

    db.add.assert_called_once()
    db.execute.assert_not_called()  # ni siquiera busca


def test_el_registro_creado_queda_atado_al_centro_capturador():
    repo, db = _repo_con(None)

    repo.find_or_create(DonorInput(**_fisica(email="ana@example.com")), CENTER_A)

    creado = db.add.call_args.args[0]
    assert creado.center_id == CENTER_A
    assert creado.source == "center"


def test_la_busqueda_de_dedupe_va_scopeada_al_centro():
    """El WHERE debe llevar el centro: sin eso, un centro descubre donantes de otro."""
    repo, db = _repo_con(None)
    repo.find_or_create(DonorInput(**_fisica(email="ana@example.com")), CENTER_A)

    consulta = str(db.execute.call_args.args[0])
    assert "center_id" in consulta and "email" in consulta


# ── Búsqueda para autocompletado ─────────────────────────────────────────────

def test_la_busqueda_filtra_por_centro():
    db = MagicMock()
    repo = DonorRepository(db)
    db.execute.return_value.scalars.return_value.all.return_value = []

    repo.search("ana", CENTER_B)

    consulta = str(db.execute.call_args.args[0])
    assert "center_id" in consulta


def test_la_busqueda_exige_al_menos_dos_caracteres():
    db = MagicMock()
    repo = DonorRepository(db)
    with pytest.raises(HTTPException) as exc:
        repo.search("a", CENTER_A)
    assert exc.value.status_code == 400
