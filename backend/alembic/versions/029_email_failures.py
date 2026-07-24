"""email_failures: deliverability failures captured from the Resend webhook

Revision ID: 029
Revises: 028
Create Date: 2026-07-24

Only failure/attention events (bounce / complaint / delayed) are stored — not
successful deliveries — so the table stays small. Correlated to the originating
entity via tags set at send time. Deduped by svix_id.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "029"
down_revision = "028"
branch_labels = None
depends_on = None

_EVENTS = ("bounced", "complained", "delivery_delayed")


def upgrade() -> None:
    op.create_table(
        "email_failures",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("resend_email_id", sa.String(), nullable=False),
        sa.Column("to_email", sa.String(), nullable=False),
        sa.Column("email_type", sa.String(), nullable=False),
        sa.Column("entity_type", sa.String(), nullable=True),
        sa.Column("entity_id", UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("svix_id", sa.String(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint(
            "event_type IN " + str(_EVENTS),
            name="ck_email_failures_event_type",
        ),
        sa.UniqueConstraint("svix_id", name="uq_email_failures_svix_id"),
    )
    op.create_index("ix_email_failures_resend_email_id", "email_failures", ["resend_email_id"])
    # Studio list: recent-first, optionally filtered by event.
    op.create_index("ix_email_failures_created_at", "email_failures", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_email_failures_created_at", table_name="email_failures")
    op.drop_index("ix_email_failures_resend_email_id", table_name="email_failures")
    op.drop_table("email_failures")
