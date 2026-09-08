from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.penjualan import SatuanJual
from app.schemas.auth import MessageResponse
from app.schemas.penjualan import (
    PenjualanCreate,
    PenjualanUpdate,
    PenjualanResponse,
    PenjualanSummaryResponse,
)
from app.services.penjualan_service import PenjualanService

router = APIRouter(prefix="/penjualan", tags=["Penjualan Telur"])


@router.post(
    "/",
    response_model=PenjualanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Catat Transaksi Penjualan Telur",
    responses={
        201: {"description": "Transaksi penjualan telur berhasil dicatat."},
        400: {"description": "Kuantitas atau harga satuan tidak valid."},
        401: {"description": "Belum terautentikasi."},
    },
)
def create_penjualan(
    data: PenjualanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mencatat transaksi penjualan telur baru.
    Mendukung satuan jual butir, kg, dan tray dengan kalkulasi server-side otomatis untuk total nilai transaksi dan normalisasi butir fisik.
    """
    return PenjualanService.create_penjualan(db, data)


@router.get(
    "/summary",
    response_model=PenjualanSummaryResponse,
    summary="Ringkasan KPI Penjualan Telur",
    responses={
        200: {"description": "Ringkasan data penjualan berhasil diambil."},
        400: {"description": "Rentang tanggal tidak valid."},
        401: {"description": "Belum terautentikasi."},
    },
)
def get_penjualan_summary(
    start_date: Optional[date] = Query(None, description="Filter tanggal awal (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter tanggal akhir (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil ringkasan agregasi penjualan (total pendapatan, total butir fisik keluar, dan rincian subtotal per satuan) via SQL.
    """
    return PenjualanService.get_penjualan_summary(
        db=db,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/",
    response_model=List[PenjualanResponse],
    summary="Daftar Riwayat Penjualan Telur",
    responses={
        200: {"description": "Daftar riwayat penjualan berhasil diambil."},
        400: {"description": "Rentang tanggal tidak valid."},
        401: {"description": "Belum terautentikasi."},
    },
)
def get_penjualan_list(
    satuan_jual: Optional[SatuanJual] = Query(None, description="Filter berdasarkan jenis satuan jual"),
    start_date: Optional[date] = Query(None, description="Filter tanggal awal (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter tanggal akhir (YYYY-MM-DD)"),
    search_pembeli: Optional[str] = Query(None, description="Pencarian nama pembeli/pelanggan (case-insensitive)"),
    limit: int = Query(100, ge=1, le=500, description="Batas jumlah record yang dikembalikan"),
    offset: int = Query(0, ge=0, description="Offset pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil daftar transaksi penjualan dengan filter fleksibel dan pengurutan kronologis terbalik (terbaru dahulu).
    """
    return PenjualanService.get_penjualan_list(
        db=db,
        satuan_jual=satuan_jual,
        start_date=start_date,
        end_date=end_date,
        search_pembeli=search_pembeli,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{penjualan_id}",
    response_model=PenjualanResponse,
    summary="Detail Transaksi Penjualan",
    responses={
        200: {"description": "Detail data transaksi penjualan berhasil diambil."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Data transaksi penjualan tidak ditemukan."},
    },
)
def get_penjualan_by_id(
    penjualan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil detail 1 transaksi penjualan berdasarkan ID.
    """
    return PenjualanService.get_penjualan_by_id(db, penjualan_id)


@router.patch(
    "/{penjualan_id}",
    response_model=PenjualanResponse,
    summary="Koreksi / Update Transaksi Penjualan",
    responses={
        200: {"description": "Data transaksi penjualan berhasil diperbarui."},
        400: {"description": "Input pembaruan tidak valid."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Data transaksi penjualan tidak ditemukan."},
    },
)
def update_penjualan(
    penjualan_id: int,
    data: PenjualanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Memperbarui data transaksi penjualan secara parsial.
    Otomatis menghitung ulang total pendapatan dan jumlah butir jika kuantitas/harga/satuan berubah.
    """
    return PenjualanService.update_penjualan(db, penjualan_id, data)


@router.delete(
    "/{penjualan_id}",
    response_model=MessageResponse,
    summary="Hapus Transaksi Penjualan",
    responses={
        200: {"description": "Data transaksi penjualan berhasil dihapus."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Data transaksi penjualan tidak ditemukan."},
    },
)
def delete_penjualan(
    penjualan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Menghapus record fisik transaksi penjualan dari basis data.
    """
    PenjualanService.delete_penjualan(db, penjualan_id)
    return MessageResponse(message=f"Data transaksi penjualan dengan ID {penjualan_id} berhasil dihapus.")
