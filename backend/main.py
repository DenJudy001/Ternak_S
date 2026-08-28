from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.kandang import router as kandang_router
from app.routers.mortalitas import router as mortalitas_router
from app.routers.produksi_telur import router as produksi_telur_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include Routers
app.include_router(health_router)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(kandang_router, prefix=settings.API_V1_STR)
app.include_router(mortalitas_router, prefix=settings.API_V1_STR)
app.include_router(produksi_telur_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "health": "/health",
        "auth": f"{settings.API_V1_STR}/auth",
        "kandang": f"{settings.API_V1_STR}/kandang",
        "mortalitas": f"{settings.API_V1_STR}/mortalitas",
        "produksi_telur": f"{settings.API_V1_STR}/produksi-telur",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
