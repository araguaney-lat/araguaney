"""product_type_gtins: códigos de barras aprendidos del uso

Revision ID: 030
Revises: 029
Create Date: 2026-07-29

El catálogo nace sin un solo GTIN, así que el paso local de la búsqueda por
código de barras nunca acierta y todo depende de Open Food Facts, que solo
cubre alimentos. Esta tabla deja que cada captura del centro enseñe al sistema:
el código escaneado queda ligado al tipo de producto que la persona eligió.

Tabla aparte y no una columna porque un SKU del catálogo corresponde a muchas
marcas y presentaciones. Se migra lo que hubiera en `product_types.gtin`; esa
columna se conserva por compatibilidad con el catálogo sembrado.
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "030"
down_revision = "029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "product_type_gtins",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "product_type_id",
            UUID(as_uuid=True),
            sa.ForeignKey("product_types.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("gtin", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False, server_default="intake"),
        sa.Column(
            "created_by_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.create_index("ix_product_type_gtins_product_type_id", "product_type_gtins",
                    ["product_type_id"])
    op.create_unique_constraint("uq_product_type_gtins_gtin", "product_type_gtins", ["gtin"])

    # Arrastra lo que ya existiera en la columna vieja.
    op.execute(
        """
        INSERT INTO product_type_gtins (id, product_type_id, gtin, source, created_at)
        SELECT gen_random_uuid(), id, gtin, 'catalog', now()
        FROM product_types
        WHERE gtin IS NOT NULL AND gtin <> ''
        ON CONFLICT (gtin) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_constraint("uq_product_type_gtins_gtin", "product_type_gtins", type_="unique")
    op.drop_index("ix_product_type_gtins_product_type_id", table_name="product_type_gtins")
    op.drop_table("product_type_gtins")
