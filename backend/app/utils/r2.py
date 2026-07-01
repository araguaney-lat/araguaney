"""Cloudflare R2 client — S3-compatible via boto3.

Degrades gracefully when R2 env vars are not configured (returns None / raises
api_error so callers can surface a clear 503 to the user).
"""

import logging
from typing import Any

import boto3
from botocore.config import Config

from app.config import settings

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_FILES_PER_MESSAGE = 5

UPLOAD_URL_TTL = 15 * 60   # 15 minutes
DOWNLOAD_URL_TTL = 60 * 60  # 1 hour


def _client() -> Any:
    if not settings.r2_account_id:
        raise RuntimeError("R2 not configured")
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def is_configured() -> bool:
    return bool(settings.r2_account_id and settings.r2_bucket_name)


def generate_upload_url(r2_key: str, content_type: str, size_bytes: int) -> str:
    """Generate a presigned PUT URL for direct-to-R2 upload."""
    client = _client()
    return client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.r2_bucket_name,
            "Key": r2_key,
            "ContentType": content_type,
            "ContentLength": size_bytes,
        },
        ExpiresIn=UPLOAD_URL_TTL,
    )


def generate_download_url(r2_key: str) -> str:
    """Generate a presigned GET URL."""
    client = _client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.r2_bucket_name, "Key": r2_key},
        ExpiresIn=DOWNLOAD_URL_TTL,
    )


def object_exists(r2_key: str) -> bool:
    """True if the object exists in R2 (used to confirm upload before registering)."""
    try:
        _client().head_object(Bucket=settings.r2_bucket_name, Key=r2_key)
        return True
    except Exception:
        return False


def delete_object(r2_key: str) -> None:
    """Delete an object from R2. Swallows errors — used by purge cron."""
    try:
        _client().delete_object(Bucket=settings.r2_bucket_name, Key=r2_key)
    except Exception as exc:
        logger.warning("R2 delete failed for key %s: %s", r2_key, exc)
