"""Fotos de la donación pre-registrada (Fase 18, task 8).

Las sube la persona donante desde su enlace de gestión, sin sesión. De ahí salen
las dos reglas que gobiernan este archivo:

1. **La llave la arma el servidor**, a partir del id de la donación que resuelve
   el token. El nombre de archivo del cliente no la toca: ahí es donde se cuela
   un `../`, o el nombre real de un archivo personal que nadie quería publicar.
2. **Confirmar solo vale dentro de la carpeta de esa donación.** Un token
   legítimo no puede adoptar el archivo subido para otra.

Una foto puede mostrar una casa o una cara, así que nunca sale por la ficha
pública del QR. Se lee con URL firmada de vida corta, y solo la ve quien tiene
el enlace de gestión o el centro que va a recibir.
"""

import uuid
from uuid import UUID

from app.models.donation import DonationPhoto
from app.repositories.donation_repository import DonationRepository
from app.schemas.donation import PhotoUploadUrlOut
from app.services.base import BaseService
from app.services.donation_service import DonationService
from app.utils.errors import api_error
from app.utils.r2 import (
    delete_object,
    generate_download_url,
    generate_upload_url,
    is_configured,
    object_exists,
)

PHOTO_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024
MAX_PHOTOS_PER_DONATION = 5
# Más corto que el de adjuntos de mensajería: estas URLs viajan a una página
# pública, donde una liga de una hora es una hora de acceso sin token.
PHOTO_URL_TTL = 10 * 60

_EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


class DonationPhotoService(BaseService):

    # ── Resolución del token ─────────────────────────────────────────────────

    def _resolver(self, token: str):
        """La donación detrás del enlace de gestión, en el estado que tenga."""
        return DonationService(self.db).get_by_manage_token(token)

    def _editable(self, token: str):
        """Solo se tocan fotos mientras la donación sigue siendo del donante.

        Desde RECEIVED manda el inventario del centro: lo que se despachó es un
        registro inmutable.
        """
        donation = self._resolver(token)
        if donation.status != "REGISTERED":
            raise api_error(
                "NOT_EDITABLE",
                "Esta donación ya no se puede modificar",
                status_code=409,
            )
        return donation

    @staticmethod
    def _require_r2() -> None:
        if not is_configured():
            raise api_error(
                "R2_NOT_CONFIGURED",
                "El almacenamiento de fotos no está disponible",
                status_code=503,
            )

    # ── Subida ───────────────────────────────────────────────────────────────

    def upload_url(self, token: str, content_type: str, size_bytes: int) -> PhotoUploadUrlOut:
        donation = self._editable(token)
        self._require_r2()

        if content_type not in PHOTO_CONTENT_TYPES:
            raise api_error(
                "UNSUPPORTED_MEDIA_TYPE",
                "Solo se aceptan fotos JPEG, PNG o WebP",
                field="content_type",
            )
        if size_bytes <= 0 or size_bytes > MAX_PHOTO_SIZE_BYTES:
            raise api_error(
                "FILE_TOO_LARGE",
                f"Cada foto puede pesar hasta {MAX_PHOTO_SIZE_BYTES // (1024 * 1024)} MB",
                field="size_bytes",
            )
        if len(donation.photos) >= MAX_PHOTOS_PER_DONATION:
            raise api_error(
                "TOO_MANY_PHOTOS",
                f"Máximo {MAX_PHOTOS_PER_DONATION} fotos por donación",
            )

        storage_key = (
            f"donations/{donation.id}/{uuid.uuid4()}.{_EXTENSIONS[content_type]}"
        )
        return PhotoUploadUrlOut(
            upload_url=generate_upload_url(storage_key, content_type, size_bytes),
            storage_key=storage_key,
        )

    def confirm(
        self, token: str, storage_key: str, content_type: str, size_bytes: int
    ) -> DonationPhoto:
        donation = self._editable(token)

        # Antes que el almacenamiento: una llave ajena se rechaza siempre, y que
        # R2 esté o no disponible no cambia que no era de esta donación.
        if not storage_key.startswith(f"donations/{donation.id}/"):
            raise api_error(
                "FORBIDDEN",
                "Esa foto no pertenece a esta donación",
                status_code=403,
            )
        self._require_r2()
        if len(donation.photos) >= MAX_PHOTOS_PER_DONATION:
            raise api_error(
                "TOO_MANY_PHOTOS",
                f"Máximo {MAX_PHOTOS_PER_DONATION} fotos por donación",
            )
        # Sin esto, la base acumularía fotos que nunca llegaron al almacenamiento.
        if not object_exists(storage_key):
            raise api_error(
                "PHOTO_NOT_FOUND",
                "La foto no llegó al almacenamiento. Vuelve a subirla.",
            )

        photo = DonationPhoto(
            donation_id=donation.id,
            storage_key=storage_key,
            content_type=content_type,
            size_bytes=size_bytes,
            uploaded_by="donor",
        )
        self.db.add(photo)
        DonationRepository(self.db).commit()
        return photo

    # ── Lectura ──────────────────────────────────────────────────────────────

    def donor_url(self, token: str, photo_id: UUID) -> str:
        """Enlace firmado para quien tiene el enlace de gestión."""
        donation = self._resolver(token)     # también después de recibida
        return self._url_de(donation, photo_id)

    def center_url(self, code: str, photo_id: UUID) -> str:
        """Enlace firmado para el centro que abre el detalle de la donación."""
        donation = DonationRepository(self.db).find_by_code(code)
        if donation is None or donation.status in ("PENDING_EMAIL", "EXPIRED"):
            raise api_error("NOT_FOUND", "Donación no encontrada", status_code=404)
        return self._url_de(donation, photo_id)

    def _url_de(self, donation, photo_id: UUID) -> str:
        self._require_r2()
        foto = next((p for p in donation.photos if p.id == photo_id), None)
        if foto is None:
            raise api_error("NOT_FOUND", "Foto no encontrada", status_code=404)
        return generate_download_url(foto.storage_key, expires_in=PHOTO_URL_TTL)

    # ── Borrado ──────────────────────────────────────────────────────────────

    def delete(self, token: str, photo_id: UUID) -> None:
        donation = self._editable(token)
        foto = next((p for p in donation.photos if p.id == photo_id), None)
        if foto is None:
            raise api_error("NOT_FOUND", "Foto no encontrada", status_code=404)

        # Primero el objeto: una fila sin archivo es un hueco visible, un archivo
        # sin fila es un dato personal que nadie sabe que sigue ahí.
        delete_object(foto.storage_key)
        self.db.delete(foto)
        DonationRepository(self.db).commit()
