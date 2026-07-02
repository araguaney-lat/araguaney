from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select, or_
from sqlalchemy.orm import Session, selectinload

from app.models.messaging import Thread, ThreadAttachment, ThreadParticipant, ThreadReply
from app.models.user_campaign import UserCampaign
from app.repositories.base import BaseRepository


class ThreadRepository(BaseRepository):

    def __init__(self, db: Session) -> None:
        super().__init__(db)

    def find_by_id(self, thread_id: UUID) -> Thread | None:
        return self.db.get(Thread, thread_id)

    def find_by_id_with_replies(self, thread_id: UUID) -> Thread | None:
        """Eager-loads replies + each reply's attachments — avoids N+1 in get_detail."""
        stmt = (
            select(Thread)
            .where(Thread.id == thread_id)
            .options(selectinload(Thread.replies).selectinload(ThreadReply.attachments))
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def list_for_user(
        self,
        user_id: UUID,
        thread_type: str | None = None,
        campaign_id: UUID | None = None,
    ) -> list[Thread]:
        """Return threads accessible to the user.

        PRIVATE: user is a ThreadParticipant.
        PUBLIC: user is a UserCampaign member for that campaign.
        """
        if thread_type == "PRIVATE":
            stmt = (
                select(Thread)
                .join(ThreadParticipant, ThreadParticipant.thread_id == Thread.id)
                .where(
                    ThreadParticipant.user_id == user_id,
                    Thread.thread_type == "PRIVATE",
                )
            )
        elif thread_type == "PUBLIC":
            stmt = (
                select(Thread)
                .join(UserCampaign, UserCampaign.campaign_id == Thread.campaign_id)
                .where(
                    UserCampaign.user_id == user_id,
                    Thread.thread_type == "PUBLIC",
                )
            )
        else:
            private_stmt = (
                select(Thread.id)
                .join(ThreadParticipant, ThreadParticipant.thread_id == Thread.id)
                .where(ThreadParticipant.user_id == user_id, Thread.thread_type == "PRIVATE")
            )
            public_stmt = (
                select(Thread.id)
                .join(UserCampaign, UserCampaign.campaign_id == Thread.campaign_id)
                .where(UserCampaign.user_id == user_id, Thread.thread_type == "PUBLIC")
            )
            combined_ids = private_stmt.union(public_stmt).subquery()
            stmt = select(Thread).where(Thread.id.in_(select(combined_ids)))

        if campaign_id:
            stmt = stmt.where(Thread.campaign_id == campaign_id)

        stmt = stmt.order_by(Thread.updated_at.desc())
        return list(self.db.execute(stmt).scalars().unique())

    def is_participant(self, thread_id: UUID, user_id: UUID) -> bool:
        return self.db.execute(
            select(ThreadParticipant.thread_id)
            .where(ThreadParticipant.thread_id == thread_id, ThreadParticipant.user_id == user_id)
        ).scalar_one_or_none() is not None

    def is_campaign_member(self, campaign_id: UUID, user_id: UUID) -> bool:
        return self.db.execute(
            select(UserCampaign.id)
            .where(UserCampaign.campaign_id == campaign_id, UserCampaign.user_id == user_id)
        ).scalar_one_or_none() is not None

    def save_thread(self, thread: Thread) -> Thread:
        self.db.add(thread)
        self.db.flush()
        self.db.refresh(thread)
        return thread

    def add_participant(self, thread_id: UUID, user_id: UUID) -> ThreadParticipant:
        p = ThreadParticipant(thread_id=thread_id, user_id=user_id)
        self.db.add(p)
        self.db.flush()
        return p

    def get_participant(self, thread_id: UUID, user_id: UUID) -> ThreadParticipant | None:
        return self.db.get(ThreadParticipant, (thread_id, user_id))

    def save_reply(self, reply: ThreadReply) -> ThreadReply:
        self.db.add(reply)
        self.db.flush()
        self.db.refresh(reply)
        return reply

    def save_attachment(self, attachment: ThreadAttachment) -> ThreadAttachment:
        self.db.add(attachment)
        self.db.flush()
        self.db.refresh(attachment)
        return attachment

    def find_attachment(self, attachment_id: UUID) -> ThreadAttachment | None:
        return self.db.get(ThreadAttachment, attachment_id)

    def list_expired_attachments(self, cutoff: datetime) -> list[ThreadAttachment]:
        return list(self.db.execute(
            select(ThreadAttachment).where(ThreadAttachment.expires_at <= cutoff)
        ).scalars())

    def delete_attachment(self, attachment: ThreadAttachment) -> None:
        self.db.delete(attachment)

    def touch_thread(self, thread_id: UUID) -> None:
        thread = self.db.get(Thread, thread_id)
        if thread:
            thread.updated_at = datetime.now(timezone.utc)
            self.db.flush()

    def count_unread_private(self, user_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(Thread)
            .join(ThreadParticipant, ThreadParticipant.thread_id == Thread.id)
            .where(
                ThreadParticipant.user_id == user_id,
                Thread.thread_type == "PRIVATE",
                or_(
                    ThreadParticipant.last_read_at.is_(None),
                    Thread.updated_at > ThreadParticipant.last_read_at,
                ),
            )
        )
        return self.db.execute(stmt).scalar_one()

    def commit(self) -> None:
        self.db.commit()

    def get_campaign_member_emails(self, campaign_id: UUID, exclude_user_id: UUID) -> list[str]:
        """Return emails of all campaign members except one user."""
        from app.models.user import User
        stmt = (
            select(User.email)
            .join(UserCampaign, UserCampaign.user_id == User.id)
            .where(
                UserCampaign.campaign_id == campaign_id,
                User.id != exclude_user_id,
                User.is_active.is_(True),
            )
        )
        return list(self.db.execute(stmt).scalars())

    def get_participant_emails(self, thread_id: UUID, exclude_user_id: UUID) -> list[str]:
        """Return emails of all thread participants except one user."""
        from app.models.user import User
        stmt = (
            select(User.email)
            .join(ThreadParticipant, ThreadParticipant.user_id == User.id)
            .where(
                ThreadParticipant.thread_id == thread_id,
                User.id != exclude_user_id,
                User.is_active.is_(True),
            )
        )
        return list(self.db.execute(stmt).scalars())
