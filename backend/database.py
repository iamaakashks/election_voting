import os
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@127.0.0.1:5432/nie_elections")

# Create engine with connection pooling
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        raise
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    try:
        Base.metadata.create_all(bind=engine)
        _apply_compat_migrations()
        logger.info("Database tables created successfully!")
        return True
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        return False


def _apply_compat_migrations():
    """
    Lightweight compatibility migration for local/dev installs.
    Ensures votes.candidate_id allows NULL for NOTA support.
    """
    try:
        inspector = inspect(engine)
        if "votes" not in inspector.get_table_names():
            return

        columns = {c["name"]: c for c in inspector.get_columns("votes")}
        candidate_col = columns.get("candidate_id")
        if not candidate_col:
            return
        if candidate_col.get("nullable", True):
            return

        dialect_name = engine.dialect.name
        with engine.begin() as conn:
            if dialect_name == "postgresql":
                conn.execute(text("ALTER TABLE votes ALTER COLUMN candidate_id DROP NOT NULL"))
                logger.info("Compatibility migration applied: votes.candidate_id is now nullable.")
            else:
                logger.warning(
                    "votes.candidate_id is NOT NULL but automatic migration is only implemented for PostgreSQL."
                )
    except Exception as e:
        logger.warning(f"Compatibility migration skipped/failed: {e}")

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Set pragmas for SQLite if used (for development)."""
    pass
