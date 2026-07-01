import secrets
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_national_admin, get_current_user
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.user_repository import UserRepository
from app.schemas.studio import (
    AuditListOut,
    AuditLogOut,
    StudioUserCreate,
    StudioUserPatch,
)
from app.schemas.user_domain import UserOut, CENTER_ROLES
from app.services.auth_service import AuthService
from app.utils.errors import api_error
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/studio", tags=["studio"])


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[UserOut])
@limiter.limit("60/minute")
def list_users(
    request: Request,
    center_id: UUID | None = Query(None),
    center_role: str | None = Query(None),
    is_active: bool | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_national_admin),
):
    from sqlalchemy import select
    stmt = select(User)
    if center_id is not None:
        stmt = stmt.where(User.center_id == center_id)
    if center_role is not None:
        stmt = stmt.where(User.center_role == center_role)
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    stmt = stmt.order_by(User.created_at.desc()).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())


@router.post("/users", response_model=UserOut, status_code=201)
@limiter.limit("20/hour")
def create_user(
    request: Request,
    data: StudioUserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_national_admin),
):
    if data.center_role not in CENTER_ROLES:
        raise api_error("INVALID_ROLE", "Invalid center role", field="center_role")

    repo = UserRepository(db)
    if repo.email_exists(data.email):
        raise api_error("EMAIL_TAKEN", "Email already registered", field="email")
    if repo.username_exists(data.username):
        raise api_error("USERNAME_TAKEN", "Username already taken", field="username")

    raw_password = data.password or secrets.token_urlsafe(12)
    user = repo.save(User(
        email=data.email,
        username=data.username,
        full_name=data.full_name,
        hashed_password=AuthService.hash_password(raw_password),
        is_verified=True,
        must_change_password=True,
        center_id=data.center_id,
        center_role=data.center_role,
    ))

    AuditRepository(db).log(
        "USER_INVITED",
        "user",
        user_id=admin.id,
        entity_id=str(user.id),
        metadata={"email": user.email, "center_role": user.center_role},
    )
    db.commit()
    return user


@router.post("/users/{user_id}/reinvite", status_code=200)
@limiter.limit("10/hour")
def reinvite_user(
    request: Request,
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_national_admin),
):
    repo = UserRepository(db)
    user = repo.find_by_id(str(user_id))
    if not user:
        raise api_error("NOT_FOUND", "User not found", status_code=404)
    if not user.is_active:
        raise api_error("ACCOUNT_DISABLED", "Cannot reinvite a disabled account", status_code=400)

    raw_password = secrets.token_urlsafe(12)
    user.hashed_password = AuthService.hash_password(raw_password)
    user.must_change_password = True

    AuditRepository(db).log(
        "USER_REINVITED",
        "user",
        user_id=admin.id,
        entity_id=str(user.id),
        metadata={"email": user.email},
    )
    db.commit()
    # TODO: enqueue send_invitation_email_task(user.email, raw_password)
    return {"message": "Invitation sent"}


@router.patch("/users/{user_id}", response_model=UserOut)
@limiter.limit("30/hour")
def patch_user(
    request: Request,
    user_id: UUID,
    data: StudioUserPatch,
    db: Session = Depends(get_db),
    admin: User = Depends(require_national_admin),
):
    repo = UserRepository(db)
    user = repo.find_by_id(str(user_id))
    if not user:
        raise api_error("NOT_FOUND", "User not found", status_code=404)
    if data.center_role is not None and data.center_role not in CENTER_ROLES:
        raise api_error("INVALID_ROLE", "Invalid center role", field="center_role")

    before = {"center_role": user.center_role, "is_active": user.is_active}
    if data.center_id is not None:
        user.center_id = data.center_id
    if data.center_role is not None:
        user.center_role = data.center_role
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.full_name is not None:
        user.full_name = data.full_name

    AuditRepository(db).log(
        "USER_UPDATED",
        "user",
        user_id=admin.id,
        entity_id=str(user.id),
        metadata={"before": before, "after": {"center_role": user.center_role, "is_active": user.is_active}},
    )
    db.commit()
    db.refresh(user)
    return user


# ── Audit ─────────────────────────────────────────────────────────────────────

@router.get("/audit", response_model=AuditListOut)
@limiter.limit("30/minute")
def list_audit(
    request: Request,
    entity_type: str | None = Query(None),
    user_id: UUID | None = Query(None),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_national_admin),
):
    items, total = AuditRepository(db).list(
        entity_type=entity_type,
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
    )
    return AuditListOut(items=items, total=total, limit=limit, offset=offset)
