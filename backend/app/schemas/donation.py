"""Esquemas del pre-registro de donaciones."""

from datetime import datetime
from uuid import UUID

from pydantic import field_validator, model_validator

from app.schemas._base import StrictModel, StrictORMModel, StrictUUID
from app.schemas.donor import DonorInput

_MAX_ITEMS = 50          # tope anti-abuso del formulario público
_MAX_QUANTITY = 100_000


class DonationItemInput(StrictModel):
    """Un renglón: del catálogo o texto libre, nunca ambos.

    El texto libre no es una concesión, es el punto: un particular escribe
    "20 latas de atún" y el centro lo mapea al catálogo cuando recibe.
    """

    product_type_id: StrictUUID | None = None
    free_text: str | None = None
    quantity: int
    unit: str

    @field_validator("free_text", "unit", mode="before")
    @classmethod
    def _trim(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None

    @field_validator("quantity")
    @classmethod
    def _cantidad(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("La cantidad debe ser mayor que cero")
        if v > _MAX_QUANTITY:
            raise ValueError("Cantidad fuera de rango")
        return v

    @model_validator(mode="after")
    def _uno_u_otro(self) -> "DonationItemInput":
        if bool(self.product_type_id) == bool(self.free_text):
            raise ValueError(
                "Cada renglón lleva un producto del catálogo o una descripción, no ambos"
            )
        if not self.unit:
            raise ValueError("La unidad es obligatoria")
        return self


class DonationCreate(StrictModel):
    donor: DonorInput
    intended_center_id: StrictUUID | None = None
    intended_campaign_id: StrictUUID | None = None
    items: list[DonationItemInput]
    notes: str | None = None

    @model_validator(mode="after")
    def _con_renglones(self) -> "DonationCreate":
        if not self.items:
            raise ValueError("La donación necesita al menos un renglón")
        if len(self.items) > _MAX_ITEMS:
            raise ValueError(f"Máximo {_MAX_ITEMS} renglones por donación")
        if not self.donor.email:
            raise ValueError("El correo electrónico es obligatorio para registrar en línea")
        return self


class DonationItemOut(StrictORMModel):
    id: UUID
    product_type_id: UUID | None
    free_text: str | None
    quantity: int
    unit: str
    added_by: str
    reception_status: str | None


class DonationOut(StrictORMModel):
    id: UUID
    code: str
    status: str
    intended_center_id: UUID | None
    intended_campaign_id: UUID | None
    received_center_id: UUID | None
    notes: str | None
    created_at: datetime
    registered_at: datetime | None
    items: list[DonationItemOut] = []


class DonationPublicOut(StrictORMModel):
    """Ficha pública del QR: estado y contenido, **sin un solo dato del donante**."""

    code: str
    status: str
    items: list[DonationItemOut] = []


class PublicCenterOut(StrictORMModel):
    """Centro visible para quien va a donar.

    Deliberadamente sin correo ni teléfono de contacto: el formulario solo
    necesita saber a dónde piensa llevar la donación, y publicar datos de
    contacto de cada centro sería una lista de correos servida en bandeja.
    """

    id: UUID
    name: str
    state_name: str | None
    country_code: str | None


class PublicCampaignOut(StrictORMModel):
    id: UUID
    name: str
    slug: str | None
    description: str | None
