from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.produksi_telur import (
    ProduksiTelurCreate,
    ProduksiTelurUpdate,
    ProduksiTelurResponse,
    ProduksiTelurDetailResponse,
    ProduksiAnalyticsResponse,
)
from app.services.produksi_telur_service import ProduksiTelurService

router = APIRouter(prefix="/produksi-telur", tags=["Produksi Telur"])


@router.post(
    "/",
    response_model=ProduksiTelurResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Catat Produksi Telur Harian",
    responses={
        201: {"description": "Data produksi telur harian berhasil dicatat."},
        400: {"description": "Kandang sudah berstatus afkir atau input tidak valid."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Kandang tidak ditemukan."},
        409: {"description": "Data produksi telur untuk kandang dan tanggal ini sudah pernah dicatat."},
    },
)
def create_produksi(
    produksi_in: ProduksiTelurCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mencatat data produksi telur harian (butir normal, retak, pecah) untuk satu kandang aktif.
    Menolak pencatatan ganda pada kandang dan tanggal yang sama dengan HTTP 409 Conflict.
    """
    return ProduksiTelurService.create_produksi(db, produksi_in)


@router.get(
    "/analytics/performance",
    response_model=ProduksiAnalyticsResponse,
    summary="Analitik Performa HDP dan Deret Waktu Produksi (T2.3)",
    responses={
        200: {"description": "Data analitik performa berhasil diambil."},
        400: {"description": "Rentang tanggal tidak valid."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Kandang tidak ditemukan."},
    },
)
def get_performance_analytics_endpoint(
    kandang_id: Optional[int] = Query(None, description="Filter berdasarkan ID kandang"),
    start_date: Optional[date] = Query(None, description="Filter tanggal awal (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter tanggal akhir (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil data deret waktu time-series performa harian (HDP% dan kuantitas butir)
    beserta agregasi ringkasan periode untuk visualisasi grafik.
    """
    return ProduksiTelurService.get_performance_analytics(
        db,
        kandang_id=kandang_id,
        start_date=start_date,
        end_date=end_date
    )


@router.get(
    "/",
    response_model=List[ProduksiTelurDetailResponse],
    summary="Daftar & Riwayat Produksi Telur (Filtering & Eager Load)",
    responses={
        200: {"description": "Daftar riwayat produksi telur berhasil diambil."},
        400: {"description": "Rentang tanggal tidak valid (start_date > end_date)."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Kandang tidak ditemukan."},
    },
)
def list_riwayat_produksi(
    kandang_id: Optional[int] = Query(None, description="Filter berdasarkan ID kandang"),
    start_date: Optional[date] = Query(None, description="Filter tanggal awal (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter tanggal akhir (YYYY-MM-DD)"),
    limit: int = Query(50, ge=1, le=100, description="Maksimum jumlah data yang diambil"),
    offset: int = Query(0, ge=0, description="Offset pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil riwayat data produksi telur dengan filter kandang dan rentang tanggal.
    Eager loading nama kandang dan kalkulasi HDP% diterapkan di level service/query.
    """
    return ProduksiTelurService.get_riwayat_produksi(
        db,
        kandang_id=kandang_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )


@router.get(
    "/kandang/{kandang_id}",
    response_model=List[ProduksiTelurDetailResponse],
    summary="Riwayat Produksi Telur per Kandang",
    responses={
        200: {"description": "Riwayat produksi telur kandang berhasil diambil."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Kandang tidak ditemukan."},
    },
)
def get_produksi_kandang(
    kandang_id: int,
    limit: int = Query(100, ge=1, le=1000, description="Maksimum jumlah data"),
    offset: int = Query(0, ge=0, description="Offset pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil riwayat data produksi telur khusus untuk satu kandang spesifik.
    """
    return ProduksiTelurService.get_produksi_by_kandang(
        db, kandang_id, limit=limit, offset=offset
    )


@router.get(
    "/{produksi_id}",
    response_model=ProduksiTelurDetailResponse,
    summary="Detail Produksi Telur",
    responses={
        200: {"description": "Detail data produksi telur berhasil diambil."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Data produksi telur tidak ditemukan."},
    },
)
def get_produksi_detail(
    produksi_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil 1 detail data produksi telur berdasarkan ID beserta kalkulasi HDP%.
    """
    return ProduksiTelurService.get_produksi_by_id(db, produksi_id)


@router.patch(
    "/{produksi_id}",
    response_model=ProduksiTelurResponse,
    summary="Koreksi / Update Produksi Telur",
    responses={
        200: {"description": "Data produksi telur berhasil diperbarui."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Data produksi telur tidak ditemukan."},
        409: {"description": "Perubahan tanggal menyebabkan konflik duplikasi data."},
    },
)
def update_produksi_endpoint(
    produksi_id: int,
    produksi_in: ProduksiTelurUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengoreksi sebagian atau seluruh field data produksi telur (jumlah butir normal/retak/pecah, tanggal, catatan).
    """
    return ProduksiTelurService.update_produksi(db, produksi_id, produksi_in)


@router.delete(
    "/{produksi_id}",
    response_model=MessageResponse,
    summary="Hapus Data Produksi Telur",
    responses={
        200: {"description": "Data produksi telur berhasil dihapus."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Data produksi telur tidak ditemukan."},
    },
)
def delete_produksi_endpoint(
    produksi_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Menghapus catatan data produksi telur secara permanen.
    """
    result = ProduksiTelurService.delete_produksi(db, produksi_id)
    return MessageResponse(**result)
