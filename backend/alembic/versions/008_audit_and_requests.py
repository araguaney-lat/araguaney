"""audit_log and requests tables

Revision ID: 008
Revises: 007
Create Date: 2026-06-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── audit_log ─────────────────────────────────────────────────────────────
    op.create_table(
        "audit_log",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String, nullable=False),
        sa.Column("entity_type", sa.String, nullable=False),
        sa.Column("entity_id", sa.String, nullable=True),
        sa.Column("metadata", postgresql.JSONB, nullable=True),
        sa.Column("ip", sa.String, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_audit_entity", "audit_log", ["entity_type", "entity_id"])
    op.create_index("ix_audit_user", "audit_log", ["user_id"])
    op.create_index("ix_audit_created", "audit_log", ["created_at"])

    # ── requests ──────────────────────────────────────────────────────────────
    op.create_table(
        "requests",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("author_id", sa.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("center_id", sa.UUID(as_uuid=True), sa.ForeignKey("centers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="OPEN"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED')", name="ck_requests_status"),
    )
    op.create_index("ix_requests_center", "requests", ["center_id"])
    op.create_index("ix_requests_status", "requests", ["status"])

    op.create_table(
        "request_messages",
        sa.Column("id", sa.UUID(as_uuid=True), primary_key=True),
        sa.Column("request_id", sa.UUID(as_uuid=True), sa.ForeignKey("requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_req_messages_request", "request_messages", ["request_id"])


def downgrade() -> None:
    op.drop_table("request_messages")
    op.drop_table("requests")
    op.drop_table("audit_log")
