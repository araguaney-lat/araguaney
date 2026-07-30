"""donations: pre-registro por el donante + campaigns.is_public

Revision ID: 032
Revises: 031
Create Date: 2026-07-29

La tabla `donors` ya existe (migración 031, Fase 19): aquí solo se añaden las
tablas de donación encima.

`campaigns.is_public` hace explícita una visibilidad que hasta ahora era
implícita: cualquier campaña con `slug` era alcanzable en /eventos/[slug]. Se
rellena en `true` donde ya hay slug para no cambiar el comportamiento actual, y
las campañas internas quedan invisibles para el público.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "032"
down_revision = "031"
branch_labels = None
depends_on = None

_STATUSES = ("PENDING_EMAIL", "REGISTERED", "RECEIVED", "CANCELLED", "EXPIRED")
_ADDED_BY = ("donor", "center")
_RECEPTION = ("RECEIVED", "MISSING", "REJECTED")


def upgrade() -> None:
    op.create_table(
        "donations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("donor_id", UUID(as_uuid=True),
                  sa.ForeignKey("donors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("intended_center_id", UUID(as_uuid=True),
                  sa.ForeignKey("centers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("intended_campaign_id", UUID(as_uuid=True),
                  sa.ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True),
        sa.Column("received_center_id", UUID(as_uuid=True),
                  sa.ForeignKey("centers.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="PENDING_EMAIL"),
        sa.Column("manage_token_hash", sa.String(), nullable=True),
        sa.Column("manage_token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("intake_id", UUID(as_uuid=True),
                  sa.ForeignKey("intakes.id", ondelete="SET NULL"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN " + str(_STATUSES), name="ck_donations_status"),
    )
    op.create_index("uq_donations_code", "donations", ["code"], unique=True)
    op.create_index("ix_donations_donor_id", "donations", ["donor_id"])
    op.create_index("ix_donations_intended_center_id", "donations", ["intended_center_id"])
    op.create_index("ix_donations_received_center_id", "donations", ["received_center_id"])
    op.create_index("ix_donations_manage_token_hash", "donations", ["manage_token_hash"])

    op.create_table(
        "donation_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("donation_id", UUID(as_uuid=True),
                  sa.ForeignKey("donations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_type_id", UUID(as_uuid=True),
                  sa.ForeignKey("product_types.id", ondelete="SET NULL"), nullable=True),
        sa.Column("free_text", sa.String(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit", sa.String(), nullable=False),
        sa.Column("added_by", sa.String(), nullable=False, server_default="donor"),
        sa.Column("reception_status", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        # Del catálogo o texto libre, exactamente uno de los dos.
        sa.CheckConstraint(
            "(product_type_id IS NOT NULL) <> (free_text IS NOT NULL)",
            name="ck_donation_items_producto_o_texto",
        ),
        sa.CheckConstraint("quantity > 0", name="ck_donation_items_quantity_positiva"),
        sa.CheckConstraint("added_by IN " + str(_ADDED_BY), name="ck_donation_items_added_by"),
        sa.CheckConstraint(
            "reception_status IS NULL OR reception_status IN " + str(_RECEPTION),
            name="ck_donation_items_reception_status",
        ),
    )
    op.create_index("ix_donation_items_donation_id", "donation_items", ["donation_id"])

    op.create_table(
        "donation_photos",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("donation_id", UUID(as_uuid=True),
                  sa.ForeignKey("donations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("storage_key", sa.String(), nullable=False),
        sa.Column("content_type", sa.String(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("uploaded_by", sa.String(), nullable=False, server_default="donor"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.CheckConstraint("uploaded_by IN " + str(_ADDED_BY), name="ck_donation_photos_uploaded_by"),
    )
    op.create_index("ix_donation_photos_donation_id", "donation_photos", ["donation_id"])

    op.create_table(
        "donation_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("donation_id", UUID(as_uuid=True),
                  sa.ForeignKey("donations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.create_index("ix_donation_events_donation_id", "donation_events", ["donation_id"])

    op.add_column(
        "campaigns",
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="false"),
    )
    # Preserva el comportamiento actual: hoy toda campaña con slug es alcanzable.
    op.execute("UPDATE campaigns SET is_public = true WHERE slug IS NOT NULL AND slug <> ''")


def downgrade() -> None:
    op.drop_column("campaigns", "is_public")
    op.drop_index("ix_donation_events_donation_id", table_name="donation_events")
    op.drop_table("donation_events")
    op.drop_index("ix_donation_photos_donation_id", table_name="donation_photos")
    op.drop_table("donation_photos")
    op.drop_index("ix_donation_items_donation_id", table_name="donation_items")
    op.drop_table("donation_items")
    for idx in ("ix_donations_manage_token_hash", "ix_donations_received_center_id",
                "ix_donations_intended_center_id", "ix_donations_donor_id", "uq_donations_code"):
        op.drop_index(idx, table_name="donations")
    op.drop_table("donations")
