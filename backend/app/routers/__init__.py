from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.kandang import router as kandang_router
from app.routers.mortalitas import router as mortalitas_router
from app.routers.produksi_telur import router as produksi_telur_router

__all__ = [
    "health_router",
    "auth_router",
    "kandang_router",
    "mortalitas_router",
    "produksi_telur_router",
]
