from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Engine configuration
# pool_pre_ping=True prevents stale connection errors
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=(settings.ENVIRONMENT == "development")
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Declarative Base for models
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a SQLAlchemy database session
    and ensures proper teardown / closing after request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
