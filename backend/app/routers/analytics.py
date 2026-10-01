"""
Router: Performance Analytics & FCR Router

Menyediakan endpoint analitik efisiensi pakan (FCR) dan tren produksi 30 hari kontinu.
Diproteksi dengan otentikasi JWT (Depends get_current_user).
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.analytics import FCRAnalyticsResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@router.get(
    "/fcr",
    response_model=FCRAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Analitik Feed Conversion Ratio (FCR)",
    description=(
        "Menghitung rasio konversi pakan ke telur (Total Kg Pakan / Total Kg Telur Layak Jual) "
        "serta mengevaluasi status efisiensi operasional peternakan layer."
    ),
)
def get_fcr_analytics(
    start_date: date = Query(..., description="Tanggal awal evaluasi periode FCR (YYYY-MM-DD)"),
    end_date: date = Query(..., description="Tanggal akhir evaluasi periode FCR (YYYY-MM-DD)"),
    kandang_id: Optional[int] = Query(None, description="ID kandang spesifik (opsional)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return AnalyticsService.get_fcr_analytics(
        db=db,
        start_date=start_date,
        end_date=end_date,
        kandang_id=kandang_id,
    )
