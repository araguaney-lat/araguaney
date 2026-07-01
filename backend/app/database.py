from typing import Generator, Optional

from fastapi import Request
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool
from app.config import settings

# TCP keepalives prevent Railway/PgBouncer from silently dropping idle
# connections, which otherwise surfaces as "server closed the connection
# unexpectedly" on the first query after an idle period.
_KEEPALIVE_ARGS = {
    "keepalives": 1,
    "keepalives_idle": 30,
    "keepalives_interval": 10,
    "keepalives_count": 5,
}

if settings.pgbouncer_mode:
    # PgBouncer in transaction-pooling mode manages the connection pool itself.
    # NullPool: SQLAlchemy opens/closes a connection per request (no client pool).
    # prepare_threshold=None: disables prepared statements (incompatible with
    # PgBouncer transaction mode).
    engine = create_engine(
        settings.database_url,
        poolclass=NullPool,
        connect_args={"prepare_threshold": None, **_KEEPALIVE_ARGS},
    )
else:
    engine = create_engine(
        settings.database_url,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args=_KEEPALIVE_ARGS,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db(request: Optional[Request] = None) -> Generator[Session, None, None]:
    """Yield a DB session with Row-Level Security context set per transaction.

    RLSContextMiddleware stores center_id (from JWT) in request.state.rls_center_id.
    We pass it via SET LOCAL so Postgres tenant policies are activated automatically.
    national_admin → '' → policy sees all rows.  No request (tests/jobs) → '' → same.
    """
    db = SessionLocal()
    center_id = ""
    if request is not None:
        center_id = getattr(request.state, "rls_center_id", "")
    try:
        db.execute(text("SET LOCAL \"app.current_center_id\" = :cid"), {"cid": center_id})
        yield db
    finally:
        db.close()
