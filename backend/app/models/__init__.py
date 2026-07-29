"""Registro central de modelos.

Importar cualquier submódulo de `app.models` ejecuta primero este archivo, así
que basta con listar aquí todos los modelos para que el registro de SQLAlchemy
quede siempre completo, sin importar por dónde entre el proceso.

Esto no es cosmético. Las llaves foráneas se resuelven contra el `MetaData`
compartido en el momento del flush: si un proceso importa `ExportJob` (que
apunta a `users.id`) sin haber importado `User`, la escritura falla con
`NoReferencedTableError`. Le pasaba al worker de ARQ, cuyas tareas importan de
forma perezosa solo lo que tocan, y eso rompía **todas** las exportaciones
(manifiestos PDF y XLSX, etiquetas de caja y tarima, manifiesto de
transferencia y reportes CSV). La API no lo sufría porque `app.main` importa
los routers, y estos terminan importando `User`.

Al agregar un modelo nuevo, agrégalo también aquí y en `alembic/env.py`.
"""

from app.models import audit_log  # noqa: F401
from app.models import box  # noqa: F401
from app.models import campaign  # noqa: F401
from app.models import center  # noqa: F401
from app.models import center_application  # noqa: F401
from app.models import email_failure  # noqa: F401
from app.models import events  # noqa: F401
from app.models import export_job  # noqa: F401
from app.models import intake  # noqa: F401
from app.models import messaging  # noqa: F401
from app.models import pallet  # noqa: F401
from app.models import product_type  # noqa: F401
from app.models import request  # noqa: F401
from app.models import shipment  # noqa: F401
from app.models import token_denylist  # noqa: F401
from app.models import transfer  # noqa: F401
from app.models import user  # noqa: F401
from app.models import user_campaign  # noqa: F401
