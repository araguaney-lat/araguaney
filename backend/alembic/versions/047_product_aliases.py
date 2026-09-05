"""Otros nombres por los que la gente pide un producto (Fase 28)

La medición del mapeo de texto dejó tres fallos que ninguna mejora de búsqueda
alcanza: "frazadas", "acetaminofén" y "advil" no comparten una letra con la
entrada del catálogo a la que corresponden. No es un problema de búsqueda, es
que al producto le falta el nombre por el que esa persona lo pidió.

La tabla sirve a los **dos** consumidores del catálogo: el shortlist que arma
los candidatos para la IA y el buscador que usan el panel y la aplicación. Si
alimentara solo a uno, teclear "frazadas" encontraría el producto por un camino
y no por el otro.

Se siembra solo lo que se sabe sin datos —hechos del idioma— y no las marcas
comerciales, que son miles y salen del laboratorio, no del idioma.

Revision ID: 047
Revises: 046
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "047"
down_revision = "046"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "product_aliases",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "product_type_id",
            UUID(as_uuid=True),
            sa.ForeignKey("product_types.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("alias", sa.String(), nullable=False),
        sa.Column("normalized", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False, server_default="seed"),
        sa.Column(
            "created_by_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "source IN ('seed', 'manual', 'learned')", name="ck_product_aliases_source"
        ),
        sa.UniqueConstraint("product_type_id", "normalized", name="uq_alias_per_product"),
    )
    op.create_index("ix_product_aliases_product_type_id", "product_aliases", ["product_type_id"])
    op.create_index("ix_product_aliases_normalized", "product_aliases", ["normalized"])

    _seed()


def _seed() -> None:
    """Inserta los alias sembrados, saltando los que ya estén.

    Los ids son deterministas (uuid5 sobre producto + alias normalizado), así
    que volver a correr esto no duplica — el mismo mecanismo que usan las
    migraciones 025-027 del catálogo.

    Un alias cuyo producto no exista se salta en silencio en vez de reventar la
    migración: el catálogo semilla puede haber cambiado, y perder un alias es
    mucho más barato que dejar un despliegue a medias. La prueba
    `test_every_seeded_alias_points_at_a_real_product` es la que sí falla
    ruidosamente cuando eso pasa, que es donde conviene enterarse.
    """
    from app.seeds._base import seed_id
    from app.seeds.aliases import build_alias_rows

    filas = build_alias_rows(seed_id)
    if not filas:
        return

    conn = op.get_bind()
    existentes = {
        row[0]
        for row in conn.execute(sa.text("SELECT id FROM product_types")).fetchall()
    }
    insertables = [f for f in filas if f["product_type_id"] in existentes]
    if not insertables:
        return

    conn.execute(
        sa.text(
            "INSERT INTO product_aliases (id, product_type_id, alias, normalized, source) "
            "VALUES (:id, :product_type_id, :alias, :normalized, 'seed') "
            "ON CONFLICT (id) DO NOTHING"
        ),
        insertables,
    )


def downgrade() -> None:
    op.drop_index("ix_product_aliases_normalized", table_name="product_aliases")
    op.drop_index("ix_product_aliases_product_type_id", table_name="product_aliases")
    op.drop_table("product_aliases")
