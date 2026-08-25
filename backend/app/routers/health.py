import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.schemas.health import HealthResponse

logger = logging.getLogger("uvicorn.error")

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Server & Database Health Check",
    responses={
        200: {
            "description": "Server and database are healthy and operational.",
            "model": HealthResponse,
        },
        503: {
            "description": "Database connection failed or service unavailable.",
            "content": {
                "application/json": {
                    "example": {
                        "detail": {
                            "status": "error",
                            "database": "disconnected",
                            "message": "Database connection failed",
                            "environment": "development",
                        }
                    }
                }
            },
        },
    },
)
def health_check(db: Session = Depends(get_db)):
    """
    Endpoint pemeriksaan status server dan konektivitas database PostgreSQL.
    Menjalankan query verifikasi 'SELECT 1'.
    """
    try:
        db.execute(text("SELECT 1"))
        return HealthResponse(
            status="ok",
            message="SiTernak API is running smoothly",
            environment=settings.ENVIRONMENT,
            database="connected",
        )
    except OperationalError as err:
        logger.error(
            f"Database connectivity failed during health check: "
            f"host={settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}, db={settings.POSTGRES_DB}. "
            f"Error details: {err.orig if hasattr(err, 'orig') else str(err)}"
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "error",
                "database": "disconnected",
                "message": "Database connection failed",
                "environment": settings.ENVIRONMENT,
            },
        )
    except SQLAlchemyError as err:
        logger.error(f"SQLAlchemy error during health check: {err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "error",
                "database": "disconnected",
                "message": "Database error encountered",
                "environment": settings.ENVIRONMENT,
            },
        )
    except Exception as err:
        logger.error(f"Unexpected error during health check: {err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "error",
                "database": "disconnected",
                "message": "Internal service error",
                "environment": settings.ENVIRONMENT,
            },
        )
