"""donors: identidad estructurada del donante + intakes.donor_id

Revision ID: 031
Revises: 030
Create Date: 2026-07-29

Reemplaza la captura en `intakes.donante_libre` (una línea de texto sin
estructura) por un registro con tipo: persona física o moral. Las donaciones
siguen siendo anónimas por default — un intake sin `donor_id` lo es.

La tabla nace con el esquema completo que también usará el pre-registro de
donaciones (Fase 18), para no migrarla dos veces.

Unicidad de email por índices **parciales**, no por constraint simple:

  - `source='self'`   → email único global (es la identidad del autoservicio).
  - `source='center'` → único por (email, center_id).

Un único global sobre toda la tabla filtraría la cartera de donantes entre
centros: bastaría intentar registrar un email para descubrir si otro centro ya
lo tiene. Ambos índices llevan `WHERE email IS NOT NULL` porque en persona
física capturada el email es opcional.

`donante_libre` se conserva: el texto libre histórico no se puede convertir en
campos estructurados con fiabilidad, así que deja de escribirse y queda de solo
lectura.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "031"
down_revision = "030"
branch_labels = None
depends_on = None

_DONOR_TYPES = ("fisica", "moral")
_SOURCES = ("self", "center")


def upgrade() -> None:
    op.create_table(
        "donors",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("donor_type", sa.String(), nullable=False, server_default="fisica"),
        sa.Column("source", sa.String(), nullable=False, server_default="center"),
        sa.Column(
            "center_id",
            UUID(as_uuid=True),
            sa.ForeignKey("centers.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("first_name", sa.String(), nullable=False),
        sa.Column("last_name", sa.String(), nullable=False),
        sa.Column("legal_name", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("email_verify_token_hash", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "donor_type IN " + str(_DONOR_TYPES), name="ck_donors_donor_type"
        ),
        sa.CheckConstraint("source IN " + str(_SOURCES), name="ck_donors_source"),
        # Un donante de centro pertenece a un centro; uno de autoservicio, a ninguno.
        sa.CheckConstraint(
            "(source = 'center' AND center_id IS NOT NULL) OR "
            "(source = 'self' AND center_id IS NULL)",
            name="ck_donors_center_matches_source",
        ),
        # La razón social es exclusiva de persona moral.
        sa.CheckConstraint(
            "donor_type = 'moral' OR legal_name IS NULL",
            name="ck_donors_legal_name_only_moral",
        ),
    )
    op.create_index("ix_donors_center_id", "donors", ["center_id"])
    op.create_index("ix_donors_email", "donors", ["email"])
    op.create_index(
        "uq_donors_email_self",
        "donors",
        ["email"],
        unique=True,
        postgresql_where=sa.text("source = 'self' AND email IS NOT NULL"),
    )
    op.create_index(
        "uq_donors_email_center",
        "donors",
        ["email", "center_id"],
        unique=True,
        postgresql_where=sa.text("source = 'center' AND email IS NOT NULL"),
    )

    op.add_column(
        "intakes",
        sa.Column(
            "donor_id",
            UUID(as_uuid=True),
            sa.ForeignKey("donors.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_intakes_donor_id", "intakes", ["donor_id"])


def downgrade() -> None:
    op.drop_index("ix_intakes_donor_id", table_name="intakes")
    op.drop_column("intakes", "donor_id")
    op.drop_index("uq_donors_email_center", table_name="donors")
    op.drop_index("uq_donors_email_self", table_name="donors")
    op.drop_index("ix_donors_email", table_name="donors")
    op.drop_index("ix_donors_center_id", table_name="donors")
    op.drop_table("donors")
