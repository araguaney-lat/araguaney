"""seed initial superadmin / national_admin user

Revision ID: 006
Revises: 005
Create Date: 2026-06-30

Lee credenciales de variables de entorno antes de correr la migración:

    SEED_SUPERADMIN_EMAIL     (requerido para ejecutar el seed)
    SEED_SUPERADMIN_PASSWORD  (requerido si el email está definido)
    SEED_SUPERADMIN_USERNAME  (opcional; default: parte local del email)
    SEED_SUPERADMIN_NAME      (opcional; default: "Super Admin")

Si SEED_SUPERADMIN_EMAIL no está definida, la migración se aplica sin
insertar nada (skip seguro para entornos de CI/test).
"""
import os
import uuid

import bcrypt
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def upgrade() -> None:
    email = os.environ.get("SEED_SUPERADMIN_EMAIL", "").strip()
    if not email:
        return  # skip — no seed requested

    password = os.environ.get("SEED_SUPERADMIN_PASSWORD", "").strip()
    if not password:
        raise RuntimeError(
            "SEED_SUPERADMIN_PASSWORD es requerida cuando SEED_SUPERADMIN_EMAIL está definida"
        )

    username = os.environ.get("SEED_SUPERADMIN_USERNAME", "").strip() or email.split("@")[0]
    full_name = os.environ.get("SEED_SUPERADMIN_NAME", "Super Admin").strip()

    conn = op.get_bind()

    # idempotente: no insertar si ya existe
    exists = conn.execute(
        sa.text("SELECT 1 FROM users WHERE email = :email LIMIT 1"),
        {"email": email},
    ).fetchone()
    if exists:
        return

    conn.execute(
        sa.text("""
            INSERT INTO users (
                id, email, username, full_name, hashed_password,
                is_active, is_verified,
                role, plan,
                center_id, center_role,
                login_attempts,
                created_at
            ) VALUES (
                :id, :email, :username, :full_name, :hashed_password,
                true, true,
                'superadmin', 'free',
                NULL, 'national_admin',
                0,
                now()
            )
        """),
        {
            "id": str(uuid.uuid4()),
            "email": email,
            "username": username,
            "full_name": full_name,
            "hashed_password": _hash(password),
        },
    )


def downgrade() -> None:
    email = os.environ.get("SEED_SUPERADMIN_EMAIL", "").strip()
    if not email:
        return

    op.get_bind().execute(
        sa.text("DELETE FROM users WHERE email = :email AND role = 'superadmin'"),
        {"email": email},
    )
