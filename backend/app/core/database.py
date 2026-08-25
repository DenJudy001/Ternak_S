from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Engine configuration with robust connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
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
