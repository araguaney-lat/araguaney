from typing import Literal

from ._base import StrictModel


class DeviceTokenRegister(StrictModel):
    """Alta de un destino de aviso.

    No lleva `user_id`: el dueño sale de la sesión. Aceptarlo del cuerpo dejaría
    que cualquiera con sesión registrara un token a nombre de otra persona y
    recibiera sus avisos.
    """

    token: str
    platform: Literal["android", "ios"]
    app_version: str | None = None


class DeviceTokenUnregister(StrictModel):
    """Baja de un destino.

    La aplicación la llama al cerrar sesión. En un centro el teléfono se
    comparte, así que sin esta llamada quien use el aparato después recibiría
    los avisos de la persona anterior.
    """

    token: str
