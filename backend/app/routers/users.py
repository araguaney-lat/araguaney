import secrets
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from app.arq_pool import enqueue
from app.database import get_db
from app.dependencies import require_center_role, require_coordinator
from app.models.user import User
from app.repositories.audit_repository import AuditRepository
from app.repositories.campaign_repository import CampaignRepository
from app.repositories.user_campaign_repository import UserCampaignRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user_domain import CENTER_ROLES, UserInvite, UserOut
from app.services.auth_service import AuthService
from app.utils.cloudflare import get_client_ip
from app.utils.errors import api_error
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/centers", tags=["users"])


@router.post("/{center_id}/users", response_model=UserOut, status_code=201)
@limiter.limit("20/hour")
def invite_user(
    request: Request,
    center_id: UUID,
    data: UserInvite,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
):
    # coordinator can only invite to their own center
    if current_user.center_role == "coordinator" and current_user.center_id != center_id:
        raise api_error("FORBIDDEN", "You can only invite users to your own center", status_code=403)

    if data.center_role not in CENTER_ROLES or data.center_role == "national_admin":
        raise api_error("INVALID_ROLE", "Role must be coordinator or volunteer", field="center_role")

    repo = UserRepository(db)
    if repo.email_exists(data.email):
        raise api_error("EMAIL_TAKEN", "Email already registered", field="email")
    if repo.username_exists(data.username):
        raise api_error("USERNAME_TAKEN", "Username already taken", field="username")

    raw_password = secrets.token_urlsafe(16)
    user = repo.save(User(
        email=data.email,
        username=data.username,
        full_name=data.full_name,
        hashed_password=AuthService.hash_password(raw_password),
        is_verified=True,
        must_change_password=True,
        center_id=center_id,
        center_role=data.center_role,
    ))

    # Auto-assign to Donaciones Generales
    general = CampaignRepository(db).find_general()
    if general:
        UserCampaignRepository(db).assign(user.id, general.id, assigned_by_id=current_user.id)

    AuditRepository(db).log(
        "USER_INVITED",
        "user",
        user_id=current_user.id,
        entity_id=str(user.id),
        extra={"email": user.email, "center_role": user.center_role, "center_id": str(center_id)},
        ip=get_client_ip(request),
    )
    db.commit()
    enqueue(background_tasks, "send_invitation_email_task", user.email, user.username, raw_password)
    return user


@router.post("/{center_id}/users/{user_id}/reinvite", status_code=200)
@limiter.limit("10/hour")
def reinvite_center_user(
    request: Request,
    center_id: UUID,
    user_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator),
):
    if current_user.center_role == "coordinator" and current_user.center_id != center_id:
        raise api_error("FORBIDDEN", "You can only reinvite users from your own center", status_code=403)

    repo = UserRepository(db)
    user = repo.find_by_id(str(user_id))
    if not user or str(user.center_id) != str(center_id):
        raise api_error("NOT_FOUND", "User not found", status_code=404)
    if not user.is_active:
        raise api_error("ACCOUNT_DISABLED", "Cannot reinvite a disabled account", status_code=400)

    raw_password = secrets.token_urlsafe(12)
    user.hashed_password = AuthService.hash_password(raw_password)
    user.must_change_password = True

    AuditRepository(db).log(
        "USER_REINVITED",
        "user",
        user_id=current_user.id,
        entity_id=str(user.id),
        extra={"email": user.email, "center_id": str(center_id)},
        ip=get_client_ip(request),
    )
    db.commit()
    enqueue(background_tasks, "send_invitation_email_task", user.email, user.username, raw_password)
    return {"message": "Invitation sent"}


@router.get("/{center_id}/users", response_model=list[UserOut])
@limiter.limit("60/minute")
def list_center_users(
    request: Request,
    center_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_center_role),
):
    # Volunteers can now browse their own center's team directory too (Team
    # page) — national_admin can view any center, everyone else only theirs.
    if current_user.center_role != "national_admin" and current_user.center_id != center_id:
        raise api_error("FORBIDDEN", "You can only view users from your own center", status_code=403)

    from sqlalchemy import select
    stmt = select(User).where(User.center_id == center_id)
    return list(db.execute(stmt).scalars().all())
