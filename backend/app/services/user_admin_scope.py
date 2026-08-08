"""Quién puede gestionar a quién, y con qué alcance.

Dos personas administran usuarios y no ven lo mismo:

- **`superadmin`** administra la plataforma. Ve a todos, incluidos otros
  superadmins y la administración nacional, y puede dejar a alguien sin centro.
- **`national_admin`** administra la operación. Ve y toca **solo usuarios de
  dominio** —voluntariado y coordinación— y siempre a nombre de un centro
  concreto: no tiene centro propio, así que elige a cuál va cada cuenta que crea.

Las reglas viven juntas en un módulo y no repartidas por los endpoints. Cuatro
rutas tocan usuarios; con la regla copiada cuatro veces, la quinta ruta que
alguien agregue el año que viene se escribe sin ella y nadie lo nota hasta que
una cuenta aparece donde no debía.

**Lo que estas reglas impiden, dicho sin rodeos:** que quien administra la
operación se ascienda a sí mismo o ascienda a otro. Un `national_admin` no
puede crear ni convertir a nadie en `national_admin`, no puede tocar una cuenta
de plataforma, y no puede verla siquiera — si pudiera listarla, sabría a quién
atacar.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User
from app.utils.errors import api_error

# Lo que la administración nacional puede repartir. `national_admin` no está y
# esa ausencia es el control: sin ella, quien administra la operación podría
# fabricarse un par.
ROLES_QUE_ASIGNA_LA_OPERACION = ("volunteer", "coordinator")


def is_platform_admin(actor: User) -> bool:
    return actor.role == "superadmin"


def scope_user_query(stmt, actor: User):
    """Acota el listado a lo que el actor puede ver.

    Un `national_admin` no ve cuentas de plataforma ni a sus pares. No es
    pudor: una lista de a quién atacar es el primer paso de un escalamiento.
    """
    if is_platform_admin(actor):
        return stmt
    return stmt.where(
        User.role == "user",
        or_(User.center_role.is_(None), User.center_role != "national_admin"),
    )


def ensure_can_manage(actor: User, target: User) -> None:
    """Levanta si el actor no puede tocar esta cuenta."""
    if is_platform_admin(actor):
        return
    if target.role != "user" or target.center_role == "national_admin":
        # Mismo 404 que una cuenta inexistente: distinguirlos confirmaría que
        # existe y quién es.
        raise api_error("NOT_FOUND", "User not found", status_code=404)


def ensure_can_assign_role(actor: User, center_role: str | None) -> None:
    if center_role is None or is_platform_admin(actor):
        return
    if center_role not in ROLES_QUE_ASIGNA_LA_OPERACION:
        raise api_error(
            "ROLE_NOT_ALLOWED",
            "La administración nacional crea voluntariado y coordinación",
            field="center_role",
        )


def resolve_center_id(actor: User, center_id: UUID | None) -> UUID | None:
    """El centro al que va la cuenta.

    La administración nacional no tiene centro propio: ve todos, así que tiene
    que decir a cuál va cada cuenta. Dejarlo en blanco crearía un usuario sin
    centro, que es lo que define a la administración nacional — el mismo
    ascenso que el resto de las reglas impide, por la puerta de atrás.
    """
    if is_platform_admin(actor):
        return center_id
    if center_id is None:
        raise api_error(
            "CENTER_REQUIRED",
            "Indica a qué centro pertenece la cuenta",
            field="center_id",
        )
    return center_id


def scope_audit_query(db: Session, stmt, actor: User):
    """Acota la bitácora a lo que el actor puede ver.

    De los treinta y dos tipos de acción que se registran, veintiséis son
    operativos —cajas selladas, tarimas cerradas, envíos despachados,
    transferencias, incidencias— y no hay motivo para escondérselos a quien
    coordina la operación nacional. Esos pasan enteros.

    Los seis restantes son sobre cuentas (`entity_type == "user"`), y ahí sí
    hace falta el mismo corte que en el listado de usuarios: **si no puede ver
    la cuenta, no ve su renglón**. Sin esto, cerrar el listado no habría servido
    de nada — los mismos nombres aparecerían en otra pantalla, que es donde este
    tipo de fuga suele quedarse durante años.

    El corte se hace por el sujeto de la entrada (`entity_id`, la cuenta
    afectada) y no por quién la ejecutó: lo que revela una cuenta de plataforma
    es aparecer como objeto de la acción.

    **Los identificadores se resuelven en Python y no con un `CAST` en SQL.**
    La primera versión comparaba `cast(users.id, String)` contra `entity_id`.
    En Postgres —que es la base de este proyecto— eso funciona: el cast de un
    `uuid` devuelve la forma con guiones, igual que `str(uuid)`. En la SQLite
    en memoria de las pruebas, no: ahí el UUID se guarda en hexadecimal sin
    guiones y el filtro no excluía nada.

    Es decir, no había un fallo en producción; había un control de acceso que
    **las pruebas no podían verificar**. Y eso es casi igual de malo: dieciocho
    de los archivos de prueba corren sobre SQLite, así que un filtro con SQL
    dependiente del dialecto queda sin vigilancia justo donde más hace falta.
    Se paga una consulta pequeña —las cuentas protegidas son un puñado— a cambio
    de que la comparación sea la misma en los dos motores y la prueba muerda de
    verdad.
    """
    if is_platform_admin(actor):
        return stmt

    protegidas = [
        str(fila)
        for fila in db.execute(
            select(User.id).where(
                or_(User.role != "user", User.center_role == "national_admin")
            )
        ).scalars().all()
    ]
    if not protegidas:
        return stmt

    return stmt.where(
        or_(
            AuditLog.entity_type != "user",
            AuditLog.entity_id.is_(None),
            AuditLog.entity_id.notin_(protegidas),
        )
    )
