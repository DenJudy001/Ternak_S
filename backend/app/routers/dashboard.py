"""
Router: Dashboard Router

Menyediakan endpoint ringkasan eksekutif dashboard peternakan (API Aggregator Pattern).
Diproteksi dengan otentikasi JWT (Depends get_current_user).
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.dashboard import DashboardSummaryResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Ambil Ringkasan Eksekutif Dashboard",
    description=(
        "Mengembalikan data ringkasan eksekutif terpadu (HDP Hari Ini, Laba/Rugi Bulan Ini MTD, "
        "Stok Telur Gudang Siap Jual, dan Tren Produksi vs Penjualan 7 Hari Terakhir) "
        "dalam 1 kali panggilan API."
    ),
)
def get_dashboard_summary(
    target_date: Optional[date] = Query(
        None,
        description="Tanggal referensi evaluasi dashboard (opsional, default: hari ini)"
    ),
    trend_days: int = Query(
        7,
        ge=3,
        le=90,
        description="Rentang hari tren produksi vs penjualan (default: 7)"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return DashboardService.get_dashboard_summary(
        db=db, target_date=target_date, trend_days=trend_days
    )
