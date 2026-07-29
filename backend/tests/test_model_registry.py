"""El registro de modelos debe estar completo desde cualquier punto de entrada.

Las llaves foráneas se resuelven contra el `MetaData` compartido al hacer flush.
Un proceso que importe solo algunos modelos revienta con `NoReferencedTableError`
al escribir en una tabla cuya FK apunta a otra que nadie importó. Es lo que le
pasaba al worker de ARQ, cuyas tareas importan de forma perezosa: rompía todas
las exportaciones (manifiestos, etiquetas, reportes) sin que la API lo notara.
"""

import subprocess
import sys
import textwrap
from pathlib import Path

_BACKEND = Path(__file__).resolve().parents[1]


def _run_isolated(code: str) -> subprocess.CompletedProcess:
    """Ejecuta código en un proceso limpio: aquí el orden de imports sí importa."""
    return subprocess.run(
        [sys.executable, "-c", textwrap.dedent(code)],
        cwd=_BACKEND,
        capture_output=True,
        text=True,
        env={
            "PATH": "/usr/bin:/bin:/usr/local/bin",
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "SECRET_KEY": "test-secret-key-for-unit-tests-only-32-chars",
            "FRONTEND_URL": "http://localhost:3000",
            "PYTHONPATH": str(_BACKEND),
        },
    )


def test_importing_one_model_registers_every_table():
    """Importar un solo modelo debe bastar para resolver todas las FK."""
    result = _run_isolated("""
        from app.models.export_job import ExportJob  # noqa: F401
        from app.database import Base
        from sqlalchemy import inspect

        tablas = set(Base.metadata.tables)
        faltantes = []
        for tabla in Base.metadata.tables.values():
            for fk in tabla.foreign_keys:
                destino = fk.target_fullname.split(".")[0]
                if destino not in tablas:
                    faltantes.append(f"{tabla.name} -> {destino}")
        print("FALTANTES:" + ",".join(faltantes))
    """)
    assert result.returncode == 0, result.stderr[-800:]
    faltantes = result.stdout.split("FALTANTES:")[-1].strip()
    assert faltantes == "", f"llaves foráneas sin resolver: {faltantes}"


def test_foreign_keys_resolve_to_real_columns():
    """Resolver cada FK a su columna es lo que hace el flush, y lo que fallaba.

    El unit-of-work de SQLAlchemy toca `fk.column` al ordenar tablas por
    dependencia durante el commit. Ahí es donde el worker moría con
    NoReferencedTableError.
    """
    result = _run_isolated("""
        from app.models.export_job import ExportJob  # noqa: F401
        from app.database import Base

        for tabla in Base.metadata.tables.values():
            for fk in tabla.foreign_keys:
                fk.column
        print("OK")
    """)
    assert result.returncode == 0, result.stderr[-800:]
    assert "OK" in result.stdout


def test_registry_matches_alembic_env():
    """Un modelo nuevo debe entrar en ambos lugares, o las migraciones lo pierden."""
    en_init = {
        line.split("import ")[1].split()[0]
        for line in (_BACKEND / "app/models/__init__.py").read_text().splitlines()
        if line.startswith("from app.models import ")
    }
    en_alembic = {
        line.split("app.models.")[1].split()[0]
        for line in (_BACKEND / "alembic/env.py").read_text().splitlines()
        if line.strip().startswith("import app.models.")
    }
    assert en_init == en_alembic, (
        f"solo en __init__.py: {sorted(en_init - en_alembic)} | "
        f"solo en alembic/env.py: {sorted(en_alembic - en_init)}"
    )
