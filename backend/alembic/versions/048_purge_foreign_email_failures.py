"""Saca de email_failures los rebotes que no son nuestros

Un endpoint de webhook de Resend está en el alcance de la **cuenta**, no del
dominio de envío ni de la clave de API. Tener un endpoint por producto no
reparte los eventos: duplica. Mientras la cuenta se compartió con otro
producto, esta tabla estuvo guardando también sus rebotes.

El filtro al recibir (`services/email_sender_scope.py`) corta el flujo hacia
adelante. Esta migración limpia lo que ya entró.

No se puede filtrar por remitente: la tabla nunca guardó `from`. Se limpia por
las dos vías que sí distinguen sin adivinar:

1. **Tipo de correo que esta aplicación no manda.** La lista de abajo es el
   conjunto cerrado de valores que `app/email.py` pasa como `email_type`.
   Cualquier otro valor lo produjo otro producto. Va literal y no importada a
   propósito: una migración describe el esquema del día en que corrió, y si
   mañana se agrega un tipo nuevo esta limpieza no debe cambiar de efecto.

2. **Correo de cuenta sin cuenta detrás.** `verification`, `password_reset`,
   `password_changed` e `invitation` los etiquetan igual los dos productos, así
   que el tipo no alcanza. Pero esos cuatro solo se le mandan a una persona
   usuaria de esta base: si el destinatario no existe en `users`, la fila es de
   la otra aplicación.

`unknown` se conserva: es el valor que pone el servicio cuando el evento llega
sin etiqueta, y no dice de quién es.

**El downgrade no restaura nada.** Son filas de otro producto, guardadas por
error; resucitarlas sería reintroducir el defecto. Se declara vacío en vez de
fingir reversibilidad.

Revision ID: 048
Revises: 047
"""

from alembic import op

revision = "048"
down_revision = "047"
branch_labels = None
depends_on = None

# Valores de `email_type` que esta aplicación emitía cuando corrió la migración.
_OURS = (
    "center_application_admin_notice",
    "center_application_confirm",
    "center_application_received",
    "center_application_rejected",
    "donation_confirm",
    "donation_received",
    "donation_registered",
    "donation_shipped",
    "invitation",
    "message_private",
    "message_public",
    "message_reply",
    "password_changed",
    "password_reset",
    "request_reply",
    "transfer_created",
    "transfer_received",
    "transfer_status",
    "verification",
    # Sin etiqueta en el evento: no identifica a nadie, no se borra.
    "unknown",
)

# Tipos que ambos productos etiquetan igual y que solo van a una cuenta nuestra.
_ACCOUNT_ONLY = ("verification", "password_reset", "password_changed", "invitation")


def upgrade() -> None:
    ours = ", ".join(f"'{value}'" for value in _OURS)
    account_only = ", ".join(f"'{value}'" for value in _ACCOUNT_ONLY)

    op.execute(f"DELETE FROM email_failures WHERE email_type NOT IN ({ours})")
    op.execute(
        "DELETE FROM email_failures "
        f"WHERE email_type IN ({account_only}) "
        "AND NOT EXISTS (SELECT 1 FROM users WHERE lower(users.email) = lower(email_failures.to_email))"
    )


def downgrade() -> None:
    """Irreversible a propósito: lo borrado era de otro producto."""
