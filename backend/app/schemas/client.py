from app.schemas._base import StrictModel


class ClientVersionOut(StrictModel):
    """Versiones del cliente nativo que el backend soporta.

    `min_supported`: por debajo de esto, la app debe bloquear y pedir
    actualización — el contrato ya no le garantiza compatibilidad.
    `latest`: la última publicada; la app puede sugerir actualizar sin bloquear.
    """

    min_supported: str
    latest: str
