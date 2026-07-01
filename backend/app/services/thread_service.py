import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.models.messaging import Thread, ThreadAttachment, ThreadReply
from app.models.user import User
from app.repositories.thread_repository import ThreadRepository
from app.schemas.messaging import (
    AttachmentOut,
    ConfirmAttachmentRequest,
    ReplyCreate,
    ThreadCreate,
    ThreadDetailOut,
    ThreadOut,
    ThreadReplyOut,
    UploadUrlRequest,
    UploadUrlOut,
)
from app.utils.errors import api_error
from app.utils.r2 import (
    ALLOWED_CONTENT_TYPES,
    MAX_FILE_SIZE_BYTES,
    MAX_FILES_PER_MESSAGE,
    delete_object,
    generate_download_url,
    generate_upload_url,
    is_configured,
    object_exists,
)


_RETENTION_DAYS = int(os.environ.get("ATTACHMENT_RETENTION_DAYS", "90"))


class ThreadService:

    def __init__(self, db: Session) -> None:
        self.repo = ThreadRepository(db)

    def _require_r2(self) -> None:
        if not is_configured():
            raise api_error("R2_NOT_CONFIGURED", "El almacenamiento de adjuntos no está configurado")

    def _access_guard(self, thread: Thread, user: User) -> None:
        """Raise 403 if user cannot access this thread."""
        if thread.thread_type == "PRIVATE":
            if not self.repo.is_participant(thread.id, user.id):
                raise api_error("FORBIDDEN", "No tienes acceso a este hilo", status_code=403)
        else:
            if not self.repo.is_campaign_member(thread.campaign_id, user.id):
                raise api_error("FORBIDDEN", "No eres miembro de esta campaña", status_code=403)

    # ── Upload presigned URL ───────────────────────────────────────────────────

    def get_upload_url(self, req: UploadUrlRequest, user: User) -> UploadUrlOut:
        self._require_r2()
        r2_key = f"attachments/{user.id}/{uuid.uuid4()}/{req.filename}"
        url = generate_upload_url(r2_key, req.content_type, req.size_bytes)
        return UploadUrlOut(upload_url=url, r2_key=r2_key)

    # ── Confirm attachment ─────────────────────────────────────────────────────

    def confirm_attachment(self, req: ConfirmAttachmentRequest, user: User) -> AttachmentOut:
        self._require_r2()
        if not object_exists(req.r2_key):
            raise api_error("ATTACHMENT_NOT_FOUND", "El archivo no existe en el storage. Sube primero.")
        expires_at = datetime.now(timezone.utc) + timedelta(days=_RETENTION_DAYS)
        attachment = ThreadAttachment(
            thread_id=req.thread_id,
            reply_id=req.reply_id,
            r2_key=req.r2_key,
            filename=req.filename,
            content_type=req.content_type,
            size_bytes=req.size_bytes,
            expires_at=expires_at,
            uploaded_by=user.id,
        )
        saved = self.repo.save_attachment(attachment)
        self.repo.commit()
        return AttachmentOut.model_validate(saved)

    # ── Download URL ───────────────────────────────────────────────────────────

    def get_download_url(self, attachment_id: uuid.UUID, user: User) -> str:
        self._require_r2()
        att = self.repo.find_attachment(attachment_id)
        if not att:
            raise api_error("NOT_FOUND", "Adjunto no encontrado", status_code=404)
        # Resolve parent thread for access check
        if att.thread_id:
            thread = self.repo.find_by_id(att.thread_id)
        elif att.reply_id and att.reply and att.reply.thread_id:
            thread = self.repo.find_by_id(att.reply.thread_id)
        else:
            thread = None
        if thread:
            self._access_guard(thread, user)
        return generate_download_url(att.r2_key)

    # ── Create thread ──────────────────────────────────────────────────────────

    def create(
        self,
        data: ThreadCreate,
        user: User,
        background_tasks: BackgroundTasks,
    ) -> ThreadOut:
        # Sender must be a campaign member
        if not self.repo.is_campaign_member(data.campaign_id, user.id):
            raise api_error("FORBIDDEN", "No eres miembro de esta campaña", status_code=403)

        if data.thread_type == "PRIVATE":
            if not data.recipient_ids:
                raise api_error("VALIDATION", "Un mensaje privado requiere al menos un destinatario")
            for rid in data.recipient_ids:
                if rid == user.id:
                    continue
                if not self.repo.is_campaign_member(data.campaign_id, rid):
                    raise api_error(
                        "VALIDATION",
                        f"El destinatario {rid} no pertenece a esta campaña",
                    )

        thread = Thread(
            title=data.title,
            body=data.body,
            sender_id=user.id,
            campaign_id=data.campaign_id,
            thread_type=data.thread_type,
        )
        saved = self.repo.save_thread(thread)

        if data.thread_type == "PRIVATE":
            participants = set(data.recipient_ids) | {user.id}
            for uid in participants:
                self.repo.add_participant(saved.id, uid)

        self.repo.commit()

        # Email notifications
        from app.arq_pool import enqueue
        if data.thread_type == "PRIVATE":
            for rid in data.recipient_ids:
                if rid == user.id:
                    continue
                # Fetch recipient email lazily to avoid cross-import at module level
                from app.models.user import User as UserModel
                from sqlalchemy import select
                recipient_email = self.repo.db.execute(
                    select(UserModel.email).where(UserModel.id == rid)
                ).scalar_one_or_none()
                if recipient_email:
                    enqueue(
                        background_tasks,
                        "send_message_private_email_task",
                        recipient_email,
                        user.full_name or user.username or user.email,
                        data.title,
                    )
        else:
            emails = self.repo.get_campaign_member_emails(data.campaign_id, user.id)
            for email in emails:
                enqueue(
                    background_tasks,
                    "send_message_public_email_task",
                    email,
                    data.title,
                    str(data.campaign_id),
                )

        return ThreadOut.model_validate(saved)

    # ── List threads ───────────────────────────────────────────────────────────

    def list(
        self,
        user: User,
        thread_type: str | None = None,
        campaign_id: uuid.UUID | None = None,
    ) -> list[ThreadOut]:
        threads = self.repo.list_for_user(user.id, thread_type, campaign_id)
        return [ThreadOut.model_validate(t) for t in threads]

    # ── Get thread detail ──────────────────────────────────────────────────────

    def get_detail(self, thread_id: uuid.UUID, user: User) -> ThreadDetailOut:
        thread = self.repo.find_by_id(thread_id)
        if not thread:
            raise api_error("NOT_FOUND", "Hilo no encontrado", status_code=404)
        self._access_guard(thread, user)

        replies_out = [
            ThreadReplyOut(
                id=r.id,
                thread_id=r.thread_id,
                sender_id=r.sender_id,
                body=r.body,
                created_at=r.created_at,
                attachments=[AttachmentOut.model_validate(a) for a in r.attachments],
            )
            for r in thread.replies
        ]
        attachments_out = [AttachmentOut.model_validate(a) for a in thread.attachments]
        participant_ids = [p.user_id for p in thread.participants]

        return ThreadDetailOut(
            id=thread.id,
            title=thread.title,
            body=thread.body,
            sender_id=thread.sender_id,
            campaign_id=thread.campaign_id,
            thread_type=thread.thread_type,
            created_at=thread.created_at,
            updated_at=thread.updated_at,
            replies=replies_out,
            attachments=attachments_out,
            participant_ids=participant_ids,
        )

    # ── Reply ─────────────────────────────────────────────────────────────────

    def add_reply(
        self,
        thread_id: uuid.UUID,
        data: ReplyCreate,
        user: User,
        background_tasks: BackgroundTasks,
    ) -> ThreadReplyOut:
        thread = self.repo.find_by_id(thread_id)
        if not thread:
            raise api_error("NOT_FOUND", "Hilo no encontrado", status_code=404)
        self._access_guard(thread, user)

        reply = ThreadReply(thread_id=thread_id, sender_id=user.id, body=data.body)
        saved = self.repo.save_reply(reply)
        self.repo.touch_thread(thread_id)
        self.repo.commit()

        # Notifications
        from app.arq_pool import enqueue
        sender_name = user.full_name or user.username or user.email
        if thread.thread_type == "PRIVATE":
            emails = self.repo.get_participant_emails(thread_id, user.id)
        else:
            emails = self.repo.get_campaign_member_emails(thread.campaign_id, user.id)
        for email in emails:
            enqueue(
                background_tasks,
                "send_message_reply_email_task",
                email,
                thread.title,
                data.body[:200],
                sender_name,
            )

        return ThreadReplyOut(
            id=saved.id,
            thread_id=saved.thread_id,
            sender_id=saved.sender_id,
            body=saved.body,
            created_at=saved.created_at,
            attachments=[],
        )

    # ── Mark read ─────────────────────────────────────────────────────────────

    def mark_read(self, thread_id: uuid.UUID, user: User) -> None:
        thread = self.repo.find_by_id(thread_id)
        if not thread:
            raise api_error("NOT_FOUND", "Hilo no encontrado", status_code=404)
        if thread.thread_type != "PRIVATE":
            return  # PUBLIC threads don't track reads
        participant = self.repo.get_participant(thread_id, user.id)
        if not participant:
            raise api_error("FORBIDDEN", "No eres participante de este hilo", status_code=403)
        participant.last_read_at = datetime.now(timezone.utc)
        self.repo.commit()

    # ── Purge expired attachments (ARQ cron) ──────────────────────────────────

    @staticmethod
    def purge_expired(db: Session) -> int:
        repo = ThreadRepository(db)
        cutoff = datetime.now(timezone.utc)
        expired = repo.list_expired_attachments(cutoff)
        count = 0
        for att in expired:
            delete_object(att.r2_key)
            repo.delete_attachment(att)
            count += 1
        if count:
            repo.commit()
        return count
