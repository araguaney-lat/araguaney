"""Seed global catalog: WHO Essential Medicines (curated subset)

Revision ID: 025
Revises: 024
Create Date: 2026-07-21

Idempotent: rows carry a deterministic uuid5 id, inserted with
ON CONFLICT (id) DO NOTHING. All global (campaign_id = NULL).
"""
from alembic import op

from app.seeds._base import build_rows
from app.seeds._insert import seed_delete, seed_insert
from app.seeds.who_medicines import MEDICINES

revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    seed_insert(op.get_bind(), build_rows(MEDICINES))


def downgrade() -> None:
    ids = [row["id"] for row in build_rows(MEDICINES)]
    seed_delete(op.get_bind(), ids)
