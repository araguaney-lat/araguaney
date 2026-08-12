"""Respuestas pequeñas que comparten varias secciones del dominio.

Viven juntas y no repetidas dentro de cada módulo porque son la misma forma: un
endpoint que entrega una URL firmada devuelve lo mismo trate de un adjunto de
mensajería o de la foto de una donación. Repetir el modelo por sección invita a
que uno de ellos gane un campo y el otro no.
"""

from ._base import StrictModel


class SignedUrlOut(StrictModel):
    """URL temporal para descargar un archivo privado.

    Es de un solo uso conceptual: caduca, no se cachea y no se guarda. Por eso
    los endpoints que la entregan responden con `Cache-Control` de no
    almacenamiento.
    """

    url: str


class MessageOut(StrictModel):
    """Confirmación de una acción que no devuelve datos.

    Siete endpoints responden así: verificar correo, reenviar verificación,
    recuperar y restablecer contraseña, desactivar el segundo factor y los dos
    reenvíos de invitación. Ninguno de sus consumidores lee esta clave; miran el
    estado HTTP y siguen.

    Que el cuerpo no aporte nada sugiere que la respuesta honesta sería un `204`
    sin cuerpo. No se hace aquí porque cambiar `200` con cuerpo por `204` es un
    cambio incompatible de contrato, y dentro de `/v1` los cambios son solo
    aditivos: un cliente instalado que espere un cuerpo se rompería. Queda
    anotado para una `/v2`.
    """

    message: str


class OkOut(StrictModel):
    """Acuse de una operación que no devuelve nada que leer.

    Lo usan el alta de una persona en una campaña y las dos escrituras públicas
    de donación. Vale aquí la misma nota que en [MessageOut]: quien las llama
    descarta el cuerpo, así que la respuesta honesta sería un `204`, y cambiarlo
    dentro de `/v1` rompería a un cliente instalado. Material para una `/v2`.
    """

    ok: bool
