"""messaging tables

Revision ID: 015
Revises: 014
Create Date: 2026-06-30
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "threads",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("campaign_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("thread_type", sa.String(10), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["campaign_id"], ["campaigns.id"], ondelete="CASCADE"),
        sa.CheckConstraint("thread_type IN ('PRIVATE', 'PUBLIC')", name="ck_thread_type"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_threads_campaign_type", "threads", ["campaign_id", "thread_type"])
    op.create_index("ix_threads_sender", "threads", ["sender_id"])
    op.create_index("ix_threads_updated", "threads", ["updated_at"])

    op.create_table(
        "thread_participants",
        sa.Column("thread_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("last_read_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["thread_id"], ["threads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("thread_id", "user_id"),
    )
    op.create_index("ix_thread_participants_user", "thread_participants", ["user_id"])

    op.create_table(
        "thread_replies",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("thread_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["thread_id"], ["threads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_thread_replies_thread", "thread_replies", ["thread_id"])

    op.create_table(
        "thread_attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("thread_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reply_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("r2_key", sa.String(512), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["thread_id"], ["threads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reply_id"], ["thread_replies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"], ondelete="SET NULL"),
        sa.CheckConstraint(
            "thread_id IS NOT NULL OR reply_id IS NOT NULL",
            name="ck_attachment_parent",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_thread_attachments_thread", "thread_attachments", ["thread_id"])
    op.create_index("ix_thread_attachments_reply", "thread_attachments", ["reply_id"])
    op.create_index("ix_thread_attachments_expires", "thread_attachments", ["expires_at"])


def downgrade() -> None:
    op.drop_table("thread_attachments")
    op.drop_table("thread_replies")
    op.drop_table("thread_participants")
    op.drop_table("threads")
