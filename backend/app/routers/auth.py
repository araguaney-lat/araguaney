from fastapi import APIRouter, BackgroundTasks, Depends, Request, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    OAuthLogin,
    ResendRequest,
    ResetPasswordRequest,
    TOTPChallengeIn,
    TOTPConfirmIn,
    TOTPConfirmOut,
    TOTPSetupOut,
    Token,
    UserCreate,
)
from app.schemas.user_domain import UserOut
from app.services.auth_service import AuthService
from app.utils.cloudflare import get_client_ip
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/login")


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def register(
    request: Request,
    data: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    return AuthService(db).register(data, background_tasks)


@router.post("/login")
@limiter.limit("10/5minutes")
def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    result = AuthService(db).login(form.username.strip(), form.password)
    if result.get("requires_totp"):
        return JSONResponse(status_code=202, content=result)
    return result


@router.post("/oauth", response_model=Token)
@limiter.limit("10/5minutes")
def oauth_login(
    request: Request,
    data: OAuthLogin,
    db: Session = Depends(get_db),
):
    return AuthService(db).oauth_login(data)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
def logout(
    request: Request,
    token: str = Depends(_oauth2_scheme),
    db: Session = Depends(get_db),
) -> None:
    AuthService(db).logout(token)


@router.get("/verify-email")
@limiter.limit("10/hour")
def verify_email(request: Request, token: str, db: Session = Depends(get_db)):
    return AuthService(db).verify_email(token)


@router.post("/resend-verification")
@limiter.limit("3/hour")
async def resend_verification(
    request: Request,
    data: ResendRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    return AuthService(db).resend_verification(data.email, background_tasks)


@router.post("/forgot-password")
@limiter.limit("3/hour")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    return AuthService(db).forgot_password(data.email, background_tasks)


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me/password", response_model=Token)
@limiter.limit("10/hour")
def change_password(
    request: Request,
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.repositories.audit_repository import AuditRepository
    result = AuthService(db).change_password(current_user, data.current_password, data.new_password)
    AuditRepository(db).log(
        "USER_PASSWORD_CHANGED",
        "user",
        user_id=current_user.id,
        entity_id=str(current_user.id),
        ip=get_client_ip(request),
    )
    db.commit()
    return result


@router.post("/reset-password")
@limiter.limit("5/hour")
def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    return AuthService(db).reset_password(data.token, data.new_password, background_tasks)


# ── TOTP / 2FA ────────────────────────────────────────────────────────────────

@router.post("/totp/setup", response_model=TOTPSetupOut)
@limiter.limit("5/hour")
def totp_setup(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a new TOTP secret for the current user. Call /totp/confirm to activate."""
    return AuthService(db).totp_setup(current_user)


@router.post("/totp/confirm", response_model=TOTPConfirmOut)
@limiter.limit("10/hour")
def totp_confirm(
    request: Request,
    data: TOTPConfirmIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verify TOTP code and enable 2FA. Returns one-time backup codes."""
    return AuthService(db).totp_confirm(current_user, data.code)


@router.post("/totp/disable")
@limiter.limit("5/hour")
def totp_disable(
    request: Request,
    data: TOTPConfirmIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disable 2FA using a valid TOTP code or backup code."""
    return AuthService(db).totp_disable(current_user, data.code)


@router.post("/totp/challenge", response_model=Token)
@limiter.limit("10/5minutes")
def totp_challenge(
    request: Request,
    data: TOTPChallengeIn,
    db: Session = Depends(get_db),
):
    """Second step of login when 2FA is enabled. Exchanges partial token + code for full token."""
    return AuthService(db).totp_challenge(data.partial_token, data.code)
