import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Thread(Base):
    __tablename__ = "threads"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    sender_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    campaign_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    thread_type: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    participants: Mapped[list["ThreadParticipant"]] = relationship("ThreadParticipant", back_populates="thread", cascade="all, delete-orphan")
    replies: Mapped[list["ThreadReply"]] = relationship("ThreadReply", back_populates="thread", cascade="all, delete-orphan", order_by="ThreadReply.created_at")
    attachments: Mapped[list["ThreadAttachment"]] = relationship("ThreadAttachment", foreign_keys="ThreadAttachment.thread_id", back_populates="thread", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("thread_type IN ('PRIVATE', 'PUBLIC')", name="ck_thread_type"),
        Index("ix_threads_campaign_type", "campaign_id", "thread_type"),
        Index("ix_threads_updated", "updated_at"),
    )


class ThreadParticipant(Base):
    __tablename__ = "thread_participants"

    thread_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("threads.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    thread: Mapped["Thread"] = relationship("Thread", back_populates="participants")

    __table_args__ = (
        Index("ix_thread_participants_user", "user_id"),
    )


class ThreadReply(Base):
    __tablename__ = "thread_replies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("threads.id", ondelete="CASCADE"), nullable=False)
    sender_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    thread: Mapped["Thread"] = relationship("Thread", back_populates="replies")
    attachments: Mapped[list["ThreadAttachment"]] = relationship("ThreadAttachment", foreign_keys="ThreadAttachment.reply_id", back_populates="reply", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_thread_replies_thread", "thread_id"),
    )


class ThreadAttachment(Base):
    __tablename__ = "thread_attachments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("threads.id", ondelete="CASCADE"), nullable=True)
    reply_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("thread_replies.id", ondelete="CASCADE"), nullable=True)
    r2_key: Mapped[str] = mapped_column(String(512), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    thread: Mapped["Thread | None"] = relationship("Thread", foreign_keys=[thread_id], back_populates="attachments")
    reply: Mapped["ThreadReply | None"] = relationship("ThreadReply", foreign_keys=[reply_id], back_populates="attachments")

    __table_args__ = (
        CheckConstraint("thread_id IS NOT NULL OR reply_id IS NOT NULL", name="ck_attachment_parent"),
        Index("ix_thread_attachments_expires", "expires_at"),
    )
