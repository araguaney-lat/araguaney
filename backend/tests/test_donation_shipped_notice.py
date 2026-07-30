"""A quién avisa el correo de "salió en envío" (Fase 18, task 21).

La consulta recorre donación → intake → cajas → tarima → envío. Contra mocks eso
no prueba nada: un join mal escrito solo falla cuando SQL lo compila. Por eso
este archivo corre contra SQLite en memoria.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base


@compiles(JSONB, "sqlite")
def _jsonb_as_json(element, compiler, **kw):  # noqa: ANN001, ANN003
    return "JSON"


for _m in ("user", "center", "campaign", "intake", "box", "product_type",
           "shipment", "pallet", "events", "audit_log", "donor", "donation"):
    __import__(f"app.models.{_m}")

from app.models.box import Box  # noqa: E402
from app.models.campaign import Campaign  # noqa: E402
from app.models.center import Center  # noqa: E402
from app.models.donation import Donation  # noqa: E402
from app.models.donor import Donor  # noqa: E402
from app.models.intake import Intake  # noqa: E402
from app.models.pallet import Pallet  # noqa: E402
from app.models.product_type import ProductType  # noqa: E402
from app.models.shipment import Shipment  # noqa: E402
from app.repositories.donation_repository import DonationRepository  # noqa: E402


class _Mundo:
    """Un envío con una tarima, una caja y su intake."""

    def __init__(self, db):
        self.db = db
        centro = Center(name="Centro A")
        campana = Campaign(name="Donaciones Generales", is_general=True)
        producto = ProductType(display_name="Agua 1L", category="WATER")
        db.add_all([centro, campana, producto])
        db.flush()

        self.intake = Intake(center_id=centro.id, campaign_id=campana.id)
        db.add(self.intake)
        db.flush()

        self.envio = Shipment(reference="EN-0001", center_id=centro.id,
                              campaign_id=campana.id, status="CLOSED")
        db.add(self.envio)
        db.flush()

        tarima = Pallet(code="TM-1", center_id=centro.id, status="CLOSED",
                        shipment_id=self.envio.id)
        db.add(tarima)
        db.flush()
        db.add(Box(code="BX-1", center_id=centro.id, intake_id=self.intake.id,
                   pallet_id=tarima.id, product_type_id=producto.id,
                   status="SEALED", quantity=1, unit="cajas"))
        db.commit()

    def donacion(self, code, email, ligada=True) -> Donation:
        donor = Donor(donor_type="fisica", source="self", first_name="Quien",
                      last_name="Dona", email=email)
        self.db.add(donor)
        self.db.flush()
        donation = Donation(code=code, donor_id=donor.id, status="RECEIVED",
                            intake_id=self.intake.id if ligada else None)
        self.db.add(donation)
        self.db.commit()
        return donation


@pytest.fixture()
def mundo():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine, expire_on_commit=False)()
    try:
        yield _Mundo(db)
    finally:
        db.close()
        engine.dispose()


def _avisadas(mundo) -> list[str]:
    return sorted(
        d.code for d in DonationRepository(mundo.db).find_donations_for_shipment(mundo.envio.id)
    )


def test_se_avisa_a_quien_dono_lo_que_va_en_el_envio(mundo):
    mundo.donacion("DN-VIAJA0001", "ana@ejemplo.test")
    assert _avisadas(mundo) == ["DN-VIAJA0001"]


def test_no_se_avisa_a_quien_no_dejo_correo(mundo):
    """Un donante capturado en ventanilla puede no haberlo dado."""
    mundo.donacion("DN-SINCORREO", None)
    assert _avisadas(mundo) == []


def test_no_se_avisa_por_una_donacion_que_no_llego_a_cajas(mundo):
    """Sin intake ligado no hay forma de saber si su carga iba en este envío."""
    mundo.donacion("DN-SINLIGAR1", "ana@ejemplo.test", ligada=False)
    assert _avisadas(mundo) == []


def test_cada_donante_recibe_un_solo_aviso_por_envio(mundo):
    """Varias cajas del mismo intake no pueden convertirse en varios correos."""
    mundo.donacion("DN-VIAJA0001", "ana@ejemplo.test")
    otra = Box(code="BX-2", center_id=mundo.envio.center_id, intake_id=mundo.intake.id,
               pallet_id=mundo.db.query(Pallet).one().id,
               product_type_id=mundo.db.query(ProductType).one().id,
               status="SEALED", quantity=1, unit="cajas")
    mundo.db.add(otra)
    mundo.db.commit()

    assert _avisadas(mundo) == ["DN-VIAJA0001"]
