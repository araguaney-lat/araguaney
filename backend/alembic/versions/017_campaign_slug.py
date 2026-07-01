"""Add slug to campaigns for public event landing pages (/eventos/{slug})

Revision ID: 017
Revises: 016
Create Date: 2026-07-01

Backfills existing rows from `name` via the same slugify() used by
CampaignService.create(), de-duplicating collisions with a short UUID suffix.
"""
import re
import unicodedata

import sqlalchemy as sa
from alembic import op

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def _slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    lowered = ascii_text.lower()
    hyphenated = re.sub(r"[^a-z0-9]+", "-", lowered)
    return hyphenated.strip("-")


def upgrade() -> None:
    op.add_column("campaigns", sa.Column("slug", sa.String(), nullable=True))
    op.create_index("ix_campaigns_slug", "campaigns", ["slug"], unique=True)

    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, name FROM campaigns")).fetchall()

    seen: set[str] = set()
    for row in rows:
        base = _slugify(row.name) or "campana"
        slug = base
        suffix = 1
        while slug in seen:
            suffix += 1
            slug = f"{base}-{suffix}"
        seen.add(slug)
        bind.execute(
            sa.text("UPDATE campaigns SET slug = :slug WHERE id = :id"),
            {"slug": slug, "id": row.id},
        )


def downgrade() -> None:
    op.drop_index("ix_campaigns_slug", table_name="campaigns")
    op.drop_column("campaigns", "slug")
