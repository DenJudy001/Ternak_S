from fastapi import APIRouter
from app.core.config import settings
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="Server Health Check")
async def health_check():
    """
    Endpoint pemeriksaan status server SiTernak API.
    """
    return HealthResponse(
        status="ok",
        message="SiTernak API is running smoothly",
        environment=settings.ENVIRONMENT
    )
