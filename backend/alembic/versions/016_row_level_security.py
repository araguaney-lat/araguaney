"""Enable Row-Level Security on tenant-scoped tables.

RLS acts as a defense-in-depth layer: even if application code forgets
TenantRepository.scoped(), Postgres enforces isolation.

Policy: a session must SET LOCAL app.current_center_id = '<uuid>' before querying.
- national_admin → set to '' (empty string) → USING clause matches all rows
- volunteer/coordinator → set to their center UUID → only their rows pass

The middleware RLSContextMiddleware in main.py decodes the JWT and stores center_id
in request.state.rls_center_id. database.get_db() reads it and calls SET LOCAL.

FORCE ROW LEVEL SECURITY ensures the policy also applies to the table owner (the
app DB user). Superusers (used by Alembic migrations) bypass RLS automatically.

Revision ID: 016
Revises: 015
"""

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None

from alembic import op

# Tables with a center_id column that must be tenant-isolated
_TABLES = ["boxes", "intakes", "pallets", "shipments"]


def upgrade() -> None:
    for table in _TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"""
            CREATE POLICY tenant_isolation ON {table}
            USING (
                current_setting('app.current_center_id', true) = ''
                OR center_id::text = current_setting('app.current_center_id', true)
            )
        """)


def downgrade() -> None:
    for table in reversed(_TABLES):
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
