from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.schemas._base import StrictModel, StrictORMModel, StrictUUID, StrictDate, StrictDecimal
from app.schemas.donor import DonorInput, DonorOut


class BoxDraft(StrictModel):
    product_type_id: StrictUUID
    quantity: int
    unit: str
    batch: str | None = None
    expiry_date: StrictDate | None = None
    weight_kg: StrictDecimal | None = None
    # Código de barras leído durante la captura. No se guarda en la caja: sirve
    # para que el catálogo aprenda qué GTIN corresponde a este tipo de producto.
    gtin: str | None = None


class IntakeCreate(StrictModel):
    campaign_id: StrictUUID | None = None
    # Sin `donor` la donacion es anonima, que es la norma del dominio. El check
    # "Registrar donante" del intake es lo que llena este bloque.
    donor: DonorInput | None = None
    # Donación pre-registrada de la que sale este intake (Fase 18). Al crearlo
    # se liga en ambos sentidos: trazabilidad donante → cajas → tarima → envío.
    donation_id: StrictUUID | None = None
    # Fase 20: aceptación de los Términos de Donación por el donante identificado.
    # La persona moral acepta siempre; la física, si se registra.
    donor_terms_accepted: bool = False
    # Fase 20: por qué esta captura de volumen atípico queda sin identificar.
    # Abre una revisión para la coordinación; no la resuelve quien captura.
    anonymous_exception_reason: str | None = Field(default=None, max_length=500)
    # Legado: se conserva para no romper clientes viejos, pero la captura nueva
    # usa `donor`. El texto libre historico sigue visible en el detalle.
    donante_libre: str | None = None
    notes: str | None = None
    boxes: list[BoxDraft]
    # Only honored for national_admin (no home center) — coordinator/volunteer
    # always use their own center_id, this field is ignored for them.
    center_id: StrictUUID | None = None


class BoxOut(StrictORMModel):
    id: UUID
    code: str
    product_type_id: UUID
    quantity: int
    unit: str
    batch: str | None
    expiry_date: date | None
    weight_kg: Decimal | None
    status: str
    reject_reason: str | None
    created_at: datetime


class IntakeOut(StrictORMModel):
    id: UUID
    center_id: UUID
    campaign_id: UUID
    donante_libre: str | None       # legado, solo lectura
    donor: DonorOut | None = None   # identificado, cuando lo hay
    notes: str | None
    created_at: datetime
    boxes: list[BoxOut] = []
