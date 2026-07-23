"""center_applications: public self-registration with approval queue

Revision ID: 028
Revises: 027
Create Date: 2026-07-22

Pending applications live here, NOT in centers — the Center is created only on
approval, so a pending/rejected application can never surface in the aggregate.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "028"
down_revision = "027"
branch_labels = None
depends_on = None

_STATUSES = ("PENDING_EMAIL", "PENDING_REVIEW", "APPROVED", "REJECTED")


def upgrade() -> None:
    op.create_table(
        "center_applications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("center_name", sa.String(), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("state_name", sa.String(), nullable=True),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("contact_name", sa.String(), nullable=False),
        sa.Column("contact_email", sa.String(), nullable=False),
        sa.Column("contact_phone", sa.String(), nullable=True),
        sa.Column("backing_org", sa.String(), nullable=True),
        sa.Column("social_url", sa.String(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="PENDING_EMAIL"),
        sa.Column("email_verify_token_hash", sa.String(), nullable=True),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reject_reason", sa.Text(), nullable=True),
        sa.Column("created_center_id", UUID(as_uuid=True), sa.ForeignKey("centers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN " + str(_STATUSES),
            name="ck_center_applications_status",
        ),
    )
    # Queue is filtered by country (national_admin scope) and status.
    op.create_index("ix_center_applications_status", "center_applications", ["status"])
    op.create_index("ix_center_applications_country_code", "center_applications", ["country_code"])
    # Token lookup on email confirmation.
    op.create_index(
        "ix_center_applications_token", "center_applications", ["email_verify_token_hash"]
    )
    # Dedup helper: case-insensitive email lookup for open applications.
    op.create_index(
        "ix_center_applications_email_lower",
        "center_applications",
        [sa.text("lower(contact_email)")],
    )


def downgrade() -> None:
    op.drop_index("ix_center_applications_email_lower", table_name="center_applications")
    op.drop_index("ix_center_applications_token", table_name="center_applications")
    op.drop_index("ix_center_applications_country_code", table_name="center_applications")
    op.drop_index("ix_center_applications_status", table_name="center_applications")
    op.drop_table("center_applications")
