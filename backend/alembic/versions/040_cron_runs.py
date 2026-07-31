"""Fase 24: latido de los crons

Una fila por cron con su última corrida exitosa. Las filas se siembran vacías
para que `created_at` sirva de referencia: así se distingue "recién desplegado"
de "lleva su ventana entera sin correr ni una vez", que es el caso del worker
que dejó de arrancar.

Revision ID: 040
Revises: 039
"""

import sqlalchemy as sa
from alembic import op

revision = "040"
down_revision = "039"
branch_labels = None
depends_on = None

_CRONS = (
    "purge_audit_logs_cron",
    "purge_attachments_cron",
    "purge_email_failures_cron",
    "purge_donations_cron",
    "purge_export_jobs_cron",
    "heartbeat_watchdog_cron",
)


def upgrade() -> None:
    op.create_table(
        "cron_runs",
        sa.Column("name", sa.String(), primary_key=True),
        sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
    )
    bind = op.get_bind()
    for nombre in _CRONS:
        bind.execute(
            sa.text("INSERT INTO cron_runs (name) VALUES (:n) ON CONFLICT (name) DO NOTHING"),
            {"n": nombre},
        )


def downgrade() -> None:
    op.drop_table("cron_runs")
