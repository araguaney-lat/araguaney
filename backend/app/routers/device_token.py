"""Registro y baja de los destinos de aviso de la aplicación instalada.

Ambos endpoints exigen sesión: un token es la dirección donde llegarán avisos
de una persona, y aceptarlo sin sesión permitiría que cualquiera se suscribiera
a los avisos de otra.

Son idempotentes a propósito. La aplicación registra su token al iniciar sesión
y cada vez que FCM se lo rota, así que el caso normal es registrar uno que ya
existe; que eso sea un error obligaría al cliente a distinguir dos casos que le
dan igual.
"""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.common import OkOut
from app.schemas.device_token import DeviceTokenRegister, DeviceTokenUnregister
from app.services.device_token_service import DeviceTokenService
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/devices", tags=["devices"])


@router.post("", response_model=OkOut, status_code=status.HTTP_200_OK)
@limiter.limit("30/hour")
def register_device(
    request: Request,
    data: DeviceTokenRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registra dónde entregar los avisos de quien tiene la sesión."""
    DeviceTokenService(db).register(
        user=current_user,
        token=data.token,
        platform=data.platform,
        app_version=data.app_version,
    )
    db.commit()
    return {"ok": True}


@router.post("/unregister", response_model=OkOut, status_code=status.HTTP_200_OK)
@limiter.limit("30/hour")
def unregister_device(
    request: Request,
    data: DeviceTokenUnregister,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Da de baja un destino. La aplicación la llama al cerrar sesión.

    Responde igual exista el token o no. Decir "ese token no era tuyo" le
    contaría a quien pregunta si un token ajeno está registrado, y no le sirve
    de nada a un cliente que solo quiere dejar de recibir avisos.
    """
    DeviceTokenService(db).unregister(user=current_user, token=data.token)
    db.commit()
    return {"ok": True}
