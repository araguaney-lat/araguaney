"""Seed global catalog: IOM/IFRC non-food relief items (curated subset)

Revision ID: 026
Revises: 025
Create Date: 2026-07-21

Idempotent (deterministic uuid5 id + ON CONFLICT DO NOTHING). Global rows.
"""
from alembic import op

from app.seeds._base import build_rows
from app.seeds._insert import seed_delete, seed_insert
from app.seeds.iom_nonfood import NONFOOD

revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    seed_insert(op.get_bind(), build_rows(NONFOOD))


def downgrade() -> None:
    ids = [row["id"] for row in build_rows(NONFOOD)]
    seed_delete(op.get_bind(), ids)
