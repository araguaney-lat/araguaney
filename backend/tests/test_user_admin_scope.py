"""Quién puede administrar a quién (alcance de gestión de usuarios).

La administración nacional pasa a gestionar cuentas, y eso abre una puerta que
antes no existía. Lo que estas pruebas fijan **no es la funcionalidad, es lo que
la funcionalidad no puede hacer**: que quien administra la operación no se
ascienda a sí mismo ni ascienda a nadie.

Tres caminos de ascenso, y los tres cerrados:

1. Crear directamente un `national_admin`.
2. Convertir a alguien existente en `national_admin`.
3. Crear una cuenta **sin centro**, que es lo que define a la administración
   nacional — el mismo ascenso por la puerta de atrás.

Y uno de reconocimiento: no puede siquiera **listar** las cuentas de
plataforma. Una lista de a quién atacar es el primer paso.
"""

from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.services.user_admin_scope import (
    ROLES_QUE_ASIGNA_LA_OPERACION,
    ensure_can_assign_role,
    ensure_can_manage,
    is_platform_admin,
    resolve_center_id,
)

CENTRO = "11111111-1111-4111-8111-111111111111"
OTRO_CENTRO = "22222222-2222-4222-8222-222222222222"

PLATAFORMA = SimpleNamespace(role="superadmin", center_role=None, center_id=None)
OPERACION = SimpleNamespace(role="user", center_role="national_admin", center_id=None)

VOLUNTARIA = SimpleNamespace(role="user", center_role="volunteer", center_id=CENTRO)
COORDINACION = SimpleNamespace(role="user", center_role="coordinator", center_id=CENTRO)
OTRA_NACIONAL = SimpleNamespace(role="user", center_role="national_admin", center_id=None)
OTRO_SUPERADMIN = SimpleNamespace(role="superadmin", center_role=None, center_id=None)


def test_the_two_managers_are_told_apart():
    assert is_platform_admin(PLATAFORMA) is True
    assert is_platform_admin(OPERACION) is False


# ── Los tres caminos de ascenso ──────────────────────────────────────────────

def test_the_operation_cannot_mint_a_peer():
    """Camino 1: crear directamente otra administración nacional."""
    with pytest.raises(HTTPException) as exc:
        ensure_can_assign_role(OPERACION, "national_admin")

    assert exc.value.detail["code"] == "ROLE_NOT_ALLOWED"
    assert "national_admin" not in ROLES_QUE_ASIGNA_LA_OPERACION


def test_the_operation_cannot_promote_someone_into_a_peer():
    """Camino 2: convertir una cuenta existente. Es la misma regla, y por eso
    la comprobación tiene que estar también en la edición y no solo al crear."""
    with pytest.raises(HTTPException):
        ensure_can_assign_role(OPERACION, "national_admin")


def test_the_operation_cannot_create_an_account_without_a_centre():
    """Camino 3: una cuenta sin centro **es** una administración nacional.

    Dejar el centro en blanco fabricaría por descuido lo que las otras dos
    reglas impiden a propósito.
    """
    with pytest.raises(HTTPException) as exc:
        resolve_center_id(OPERACION, None)

    assert exc.value.detail["code"] == "CENTER_REQUIRED"


def test_the_operation_creates_into_the_centre_it_picks():
    """No tiene centro propio: ve todos, así que elige a cuál va cada cuenta."""
    assert resolve_center_id(OPERACION, OTRO_CENTRO) == OTRO_CENTRO


# ── Sobre quién se puede actuar ──────────────────────────────────────────────

def test_the_operation_manages_domain_accounts():
    ensure_can_manage(OPERACION, VOLUNTARIA)
    ensure_can_manage(OPERACION, COORDINACION)


@pytest.mark.parametrize("objetivo", [OTRA_NACIONAL, OTRO_SUPERADMIN], ids=["par", "plataforma"])
def test_the_operation_cannot_touch_accounts_above_it(objetivo):
    """Y el error es 404, no 403.

    Un 403 confirmaría que la cuenta existe y quién es. Para quien no puede
    tocarla, no existe.
    """
    with pytest.raises(HTTPException) as exc:
        ensure_can_manage(OPERACION, objetivo)

    assert exc.value.status_code == 404


# ── La plataforma no queda acotada ───────────────────────────────────────────

def test_the_platform_admin_keeps_every_power():
    ensure_can_manage(PLATAFORMA, OTRA_NACIONAL)
    ensure_can_manage(PLATAFORMA, OTRO_SUPERADMIN)
    ensure_can_assign_role(PLATAFORMA, "national_admin")
    # Puede dejar a alguien sin centro: es como se crea una administración
    # nacional.
    assert resolve_center_id(PLATAFORMA, None) is None


def test_no_role_check_when_the_role_is_not_being_changed():
    """Editar solo el nombre no puede fallar por un rol que nadie tocó."""
    ensure_can_assign_role(OPERACION, None)


# ── La bitácora ──────────────────────────────────────────────────────────────

class TestAlcanceDeLaBitacora:
    """Lo operativo entero; de las cuentas, solo las que puede gestionar.

    Sin este corte, cerrar el listado de usuarios no habría servido de nada: los
    mismos nombres aparecerían en la auditoría, que es donde este tipo de fuga
    se queda durante años porque nadie la mira.
    """

    def _db(self):
        from sqlalchemy import create_engine
        from sqlalchemy.dialects.postgresql import JSONB
        from sqlalchemy.ext.compiler import compiles
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.pool import StaticPool

        from app.database import Base

        @compiles(JSONB, "sqlite")
        def _jsonb(element, compiler, **kw):  # noqa: ANN001, ANN003
            return "JSON"

        import app.models  # noqa: F401

        engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                               poolclass=StaticPool)
        Base.metadata.create_all(engine)
        return sessionmaker(bind=engine, expire_on_commit=False)()

    def _sembrar(self, db):
        """Dos cuentas y dos renglones de bitácora sobre cada una, más uno
        operativo."""
        import uuid

        from app.models.audit_log import AuditLog
        from app.models.user import User as U

        voluntaria = U(id=uuid.uuid4(), email="v@x.mx", username="v",
                       hashed_password="x", role="user", center_role="volunteer")
        plataforma = U(id=uuid.uuid4(), email="s@x.mx", username="s",
                       hashed_password="x", role="superadmin")
        par = U(id=uuid.uuid4(), email="n@x.mx", username="n",
                hashed_password="x", role="user", center_role="national_admin")
        db.add_all([voluntaria, plataforma, par])
        db.add_all([
            AuditLog(action="USER_INVITED", entity_type="user", entity_id=str(voluntaria.id)),
            AuditLog(action="USER_INVITED", entity_type="user", entity_id=str(plataforma.id)),
            AuditLog(action="USER_UPDATED", entity_type="user", entity_id=str(par.id)),
            AuditLog(action="BOX_SEALED", entity_type="box", entity_id="BX-0001"),
        ])
        db.commit()
        return voluntaria, plataforma, par

    def _leer(self, db, actor):
        from app.repositories.audit_repository import AuditRepository
        from app.services.user_admin_scope import scope_audit_query

        filas, _ = AuditRepository(db).list(
            limit=50, scope=lambda stmt: scope_audit_query(db, stmt, actor)
        )
        return filas

    def test_the_platform_admin_sees_everything(self):
        db = self._db()
        self._sembrar(db)

        assert len(self._leer(db, PLATAFORMA)) == 4

    def test_the_operation_keeps_the_whole_operational_log(self):
        """Es para lo que la usa: quién selló qué, quién despachó cuándo."""
        db = self._db()
        self._sembrar(db)

        acciones = [f.action for f in self._leer(db, OPERACION)]
        assert "BOX_SEALED" in acciones

    def test_the_operation_does_not_see_entries_about_accounts_it_cannot_manage(self):
        db = self._db()
        voluntaria, plataforma, par = self._sembrar(db)

        vistos = {f.entity_id for f in self._leer(db, OPERACION)}

        assert str(voluntaria.id) in vistos, "sí gestiona esa cuenta"
        assert str(plataforma.id) not in vistos, "cuenta de plataforma"
        assert str(par.id) not in vistos, "cuenta de un par"

    def test_an_entry_without_a_subject_is_not_hidden(self):
        """`entity_id` nulo no puede colarse en el filtro de `NOT IN` y
        desaparecer: no nombra a nadie, así que no revela nada."""
        import uuid

        from app.models.audit_log import AuditLog

        db = self._db()
        self._sembrar(db)
        db.add(AuditLog(action="USER_TERMS_ACCEPTED", entity_type="user", entity_id=None))
        db.commit()

        acciones = [f.action for f in self._leer(db, OPERACION)]
        assert "USER_TERMS_ACCEPTED" in acciones
