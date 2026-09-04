import uuid as _uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt

from app.database import get_db
from app.config import settings
from app.models.user import User
from app.repositories.token_denylist_repository import TokenDenylistRepository
from app.repositories.user_repository import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "UNAUTHORIZED", "message": "Could not validate credentials", "field": None, "meta": None},
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        raw_user_id: str | None = payload.get("sub")
        jti: str | None = payload.get("jti")
        if raw_user_id is None or jti is None:
            raise credentials_exception
        # Parse here so a malformed sub is a 401, not a DB error deeper down
        # (Postgres coerces str→uuid implicitly; other dialects don't).
        user_id = _uuid.UUID(raw_user_id)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception

    if TokenDenylistRepository(db).is_denied(jti):
        raise credentials_exception

    user = UserRepository(db).find_by_id(user_id)
    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_DISABLED", "message": "La cuenta está deshabilitada", "field": None, "meta": None},
        )

    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Admin access required", "field": None, "meta": None},
        )
    return current_user


def get_current_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Superadmin access required", "field": None, "meta": None},
        )
    return current_user


# ── Domain role guards ─────────────────────────────────────────────────────────

def require_user_manager(current_user: User = Depends(get_current_user)) -> User:
    """Quien puede administrar cuentas: la plataforma o la operación nacional.

    Las dos entran por aquí y **ven cosas distintas**; el alcance no se decide
    en esta puerta sino en `app.services.user_admin_scope`, que es donde viven
    juntas todas las reglas de quién puede tocar a quién.
    """
    if current_user.role == "superadmin" or current_user.center_role == "national_admin":
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"code": "FORBIDDEN", "message": "User management access required", "field": None, "meta": None},
    )


def require_national_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.center_role != "national_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "National admin access required", "field": None, "meta": None},
        )
    return current_user


def require_coordinator(current_user: User = Depends(get_current_user)) -> User:
    if current_user.center_role not in ("coordinator", "national_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Coordinator access required", "field": None, "meta": None},
        )
    return current_user


def require_center_role(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.center_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Center role required", "field": None, "meta": None},
        )
    return current_user


def require_application_reviewer(current_user: User = Depends(get_current_user)) -> User:
    """Center-application queue: national_admin (their country) or superadmin (all)."""
    if current_user.center_role != "national_admin" and current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Reviewer access required", "field": None, "meta": None},
        )
    return current_user


def reviewer_country_scope(current_user: User) -> str | None:
    """Country filter for a reviewer: superadmin sees all (None); national_admin
    is scoped to their own country_code."""
    return None if current_user.role == "superadmin" else current_user.country_code


def tenant_scope(current_user: User = Depends(get_current_user)) -> _uuid.UUID | None:
    """Returns center_id for scoped queries; None for national_admin (sees all)."""
    if current_user.center_role == "national_admin":
        return None
    return current_user.center_id


def resolve_write_center_id(current_user: User, requested_center_id: _uuid.UUID | None) -> _uuid.UUID:
    """Write-side counterpart to tenant_scope: every create endpoint needs a
    concrete center_id, never None. national_admin has no home center, so
    they must pass one explicitly in the request body; everyone else always
    uses their own (a coordinator/volunteer can never write to a center
    other than their own, regardless of what they send in the body).
    """
    from app.utils.errors import api_error

    if current_user.center_role == "national_admin":
        if requested_center_id is None:
            raise api_error(
                "CENTER_REQUIRED",
                "national_admin must specify a center_id",
                field="center_id",
                status_code=400,
            )
        return requested_center_id
    if not current_user.center_id:
        raise api_error("NO_CENTER", "User has no center assigned", status_code=400)
    return current_user.center_id
