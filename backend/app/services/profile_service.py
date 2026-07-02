import io
import logging

import cloudinary
import cloudinary.uploader
from fastapi import HTTPException

from app.config import settings
from app.models.user import User
from app.repositories.center_repository import CenterRepository
from app.repositories.user_campaign_repository import UserCampaignRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user_domain import UserUpdate
from app.services.base import BaseService

logger = logging.getLogger(__name__)

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5 MB


class ProfileService(BaseService):

    def get_profile(self, user: User) -> dict:
        center = CenterRepository(self.db).find_by_id(user.center_id) if user.center_id else None
        campaigns = UserCampaignRepository(self.db).list_campaigns_for_user(user.id)
        return {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "center_role": user.center_role,
            "center_id": user.center_id,
            "center_name": center.name if center else None,
            "campaigns": [{"id": c.id, "name": c.name} for c in campaigns],
        }

    def update_profile(self, user: User, data: UserUpdate) -> User:
        full_name = data.full_name.strip()
        if not full_name:
            raise HTTPException(status_code=400, detail="El nombre no puede estar vacío")
        user.full_name = full_name
        UserRepository(self.db).save(user)
        return user

    def upload_avatar(self, user: User, content_type: str | None, contents: bytes) -> User:
        if content_type not in _ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail="Solo se permiten imágenes JPEG, PNG, WebP o GIF.")
        if len(contents) > _MAX_AVATAR_SIZE:
            raise HTTPException(status_code=400, detail="La imagen debe ser menor a 5 MB.")

        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
            secure=True,
        )
        try:
            result = cloudinary.uploader.upload(
                io.BytesIO(contents),
                public_id=str(user.id),
                folder="araguaney/avatars",
                overwrite=True,
                invalidate=True,
                format="webp",
            )
        except Exception as e:
            logger.error("Cloudinary avatar upload failed for user %s: %s", user.id, e)
            raise HTTPException(status_code=502, detail="No se pudo subir la imagen. Intenta de nuevo.")

        user.avatar_url = result["secure_url"]
        UserRepository(self.db).save(user)
        return user
