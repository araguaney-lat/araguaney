"""Corrección de asociaciones de código de barras.

El aprendizaje del catálogo gana quien captura primero, así que sin una vía para
desligar, un código puesto en el producto equivocado se queda ahí para siempre y
para todos los centros. Desligar es una operación de catálogo global: la hace la
administración nacional y queda en auditoría.
"""

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.repositories.product_type_repository import ProductTypeRepository
from app.services.product_type_service import ProductTypeService
from fastapi import HTTPException

PT_ID = uuid4()
GTIN_ID = uuid4()
USER_ID = uuid4()


def _enlace(product_type_id=PT_ID):
    e = MagicMock()
    e.id = GTIN_ID
    e.product_type_id = product_type_id
    e.gtin = "7501055363513"
    return e


def _service(enlace):
    db = MagicMock()
    svc = ProductTypeService(db)
    return svc, db, enlace


def test_desligar_borra_la_asociacion():
    svc, db, enlace = _service(_enlace())
    with (
        patch("app.services.product_type_service.ProductTypeRepository") as MockRepo,
        patch("app.services.product_type_service.AuditRepository") as MockAudit,
    ):
        MockRepo.return_value.find_gtin.return_value = enlace

        svc.unlink_gtin(PT_ID, GTIN_ID, user_id=USER_ID)

        MockRepo.return_value.delete_gtin.assert_called_once_with(enlace)
        MockAudit.return_value.log.assert_called_once()
        accion = MockAudit.return_value.log.call_args.args[0]
        assert accion == "PRODUCT_GTIN_UNLINKED"


def test_desligar_un_codigo_inexistente_da_404():
    svc, db, _ = _service(None)
    with patch("app.services.product_type_service.ProductTypeRepository") as MockRepo:
        MockRepo.return_value.find_gtin.return_value = None
        with pytest.raises(HTTPException) as exc:
            svc.unlink_gtin(PT_ID, GTIN_ID, user_id=USER_ID)
        assert exc.value.status_code == 404


def test_no_se_desliga_un_codigo_de_otro_producto():
    """La ruta lleva el producto: si el código cuelga de otro, no se toca."""
    svc, db, enlace = _service(_enlace(product_type_id=uuid4()))
    with patch("app.services.product_type_service.ProductTypeRepository") as MockRepo:
        MockRepo.return_value.find_gtin.return_value = enlace
        with pytest.raises(HTTPException) as exc:
            svc.unlink_gtin(PT_ID, GTIN_ID, user_id=USER_ID)
        assert exc.value.status_code == 404
        MockRepo.return_value.delete_gtin.assert_not_called()


def test_listar_codigos_de_un_producto():
    db = MagicMock()
    repo = ProductTypeRepository(db)
    esperados = [_enlace(), _enlace()]
    db.execute.return_value.scalars.return_value.all.return_value = esperados

    assert repo.list_gtins(PT_ID) == esperados


def test_un_codigo_desligado_puede_volver_a_ligarse_a_otro_producto():
    """Desligar libera el GTIN: la siguiente captura lo puede reclamar."""
    db = MagicMock()
    repo = ProductTypeRepository(db)
    db.execute.return_value.scalar_one_or_none.return_value = None

    nuevo = repo.link_gtin(product_type_id=PT_ID, gtin="7501055363513", user_id=USER_ID)

    assert nuevo is not None
    db.add.assert_called_once()
