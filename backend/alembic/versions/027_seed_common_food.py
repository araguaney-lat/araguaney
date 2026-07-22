"""Seed global catalog: common shelf-stable foods (curated subset)

Revision ID: 027
Revises: 026
Create Date: 2026-07-21

Idempotent (deterministic uuid5 id + ON CONFLICT DO NOTHING). Global rows.
"""
from alembic import op

from app.seeds._base import build_rows
from app.seeds._insert import seed_delete, seed_insert
from app.seeds.common_food import FOOD

revision = "027"
down_revision = "026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    seed_insert(op.get_bind(), build_rows(FOOD))


def downgrade() -> None:
    ids = [row["id"] for row in build_rows(FOOD)]
    seed_delete(op.get_bind(), ids)
