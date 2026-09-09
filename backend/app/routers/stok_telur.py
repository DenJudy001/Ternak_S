"""
Router Layer: Stok Telur API Router (T3.3)

Menyediakan endpoint REST untuk kalkulasi ringkasan stok telur on-the-fly
dan riwayat buku besar (ledger) mutasi gudang.
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.stok_telur import (
    StokSummaryResponse,
    StokLedgerResponse,
)
from app.services.stok_service import StokService

router = APIRouter(prefix="/stok-telur", tags=["Stok Telur"])


@router.get(
    "/summary",
    response_model=StokSummaryResponse,
    summary="Ringkasan Status Stok Telur Gudang Live",
    responses={
        200: {"description": "Ringkasan stok telur berhasil dihitung on-the-fly."},
        401: {"description": "Belum terautentikasi."},
    },
)
def get_stok_summary(
    target_date: Optional[date] = Query(
        None,
        description="Filter batas tanggal perhitungan stok (YYYY-MM-DD). Default: seluruh catatan.",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Menghitung saldo dan status stok telur aktif secara on-the-fly dari akumulasi produksi
    (dikurangi telur rusak/pecah) dan akumulasi penjualan.
    Menghasilkan konversi tray (30 butir) dan estimasi bobot kilogram.
    """
    return StokService.get_stok_ringkasan(db, target_date=target_date)


@router.get(
    "/mutasi",
    response_model=StokLedgerResponse,
    summary="Buku Mutasi & Ledger Aliran Stok Gudang",
    responses={
        200: {"description": "Daftar mutasi aliran telur dan running balance berhasil diambil."},
        400: {"description": "Rentang tanggal tidak valid."},
        401: {"description": "Belum terautentikasi."},
    },
)
def get_stok_mutasi(
    start_date: Optional[date] = Query(
        None,
        description="Filter tanggal awal mutasi (YYYY-MM-DD)",
    ),
    end_date: Optional[date] = Query(
        None,
        description="Filter tanggal akhir mutasi (YYYY-MM-DD)",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil riwayat aliran mutasi telur masuk (panen layak) dan keluar (penjualan)
    dengan kalkulasi running balance saldo akhir per hari.
    """
    return StokService.get_stok_ledger_history(
        db, start_date=start_date, end_date=end_date
    )
