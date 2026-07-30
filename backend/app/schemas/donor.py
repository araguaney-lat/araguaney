"""Esquemas de donante identificado.

La validación cambia según el tipo, así que vive en un validador de modelo y no
en los campos: persona física solo exige nombre y apellido (quien dona en
ventanilla no siempre tiene o quiere dar email), mientras que persona moral
exige razón social, representante, email y teléfono.
"""

import re
from datetime import datetime
from uuid import UUID

from pydantic import field_validator, model_validator

from app.schemas._base import StrictModel, StrictORMModel

DONOR_TYPES = ("fisica", "moral")

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class DonorInput(StrictModel):
    donor_type: str = "fisica"
    first_name: str
    last_name: str
    legal_name: str | None = None      # solo persona moral
    email: str | None = None
    phone: str | None = None

    @field_validator("first_name", "last_name", "legal_name", "email", "phone", mode="before")
    @classmethod
    def _trim(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None

    @field_validator("donor_type")
    @classmethod
    def _valid_type(cls, v: str) -> str:
        if v not in DONOR_TYPES:
            raise ValueError(f"donor_type debe ser uno de: {', '.join(DONOR_TYPES)}")
        return v

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Correo electrónico inválido")
        return v

    @field_validator("phone")
    @classmethod
    def _normalize_phone(cls, v: str | None) -> str | None:
        """Normalización laxa: se conservan dígitos y el '+' inicial.

        Sin validación E.164 estricta a propósito — un formato rígido rechazaría
        capturas legítimas en ventanilla y el teléfono aquí es un dato de
        contacto, no una llave.
        """
        if v is None:
            return None
        plus = v.lstrip().startswith("+")
        digits = re.sub(r"\D", "", v)
        if not digits:
            return None
        return ("+" if plus else "") + digits

    @model_validator(mode="after")
    def _por_tipo(self) -> "DonorInput":
        if not self.first_name or not self.last_name:
            raise ValueError("Nombre y apellido son obligatorios")

        if self.donor_type == "moral":
            faltan = [
                etiqueta
                for etiqueta, valor in (
                    ("razón social", self.legal_name),
                    ("correo electrónico", self.email),
                    ("teléfono", self.phone),
                )
                if not valor
            ]
            if faltan:
                raise ValueError(
                    "Para persona moral son obligatorios: " + ", ".join(faltan)
                )
        elif self.legal_name:
            raise ValueError("La razón social solo aplica a persona moral")

        return self


class DonorOut(StrictORMModel):
    id: UUID
    donor_type: str
    first_name: str
    last_name: str
    legal_name: str | None
    email: str | None
    phone: str | None
    created_at: datetime
