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
