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
    "/kandang/{kandang_id}",
    response_model=List[ProduksiTelurResponse],
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
    Mengambil riwayat data produksi telur untuk satu kandang spesifik.
    """
    return ProduksiTelurService.get_produksi_by_kandang(
        db, kandang_id, limit=limit, offset=offset
    )


@router.get(
    "/{produksi_id}",
    response_model=ProduksiTelurResponse,
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
    Mengambil 1 detail data produksi telur berdasarkan ID.
    """
    return ProduksiTelurService.get_produksi_by_id(db, produksi_id)


@router.get(
    "/",
    response_model=List[ProduksiTelurResponse],
    summary="Seluruh Riwayat Produksi Telur",
    responses={
        200: {"description": "Daftar riwayat produksi telur berhasil diambil."},
        401: {"description": "Belum terautentikasi."},
    },
)
def list_all_produksi(
    start_date: Optional[date] = Query(None, description="Filter tanggal awal (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter tanggal akhir (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=1000, description="Maksimum data"),
    offset: int = Query(0, ge=0, description="Offset pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil seluruh catatan data produksi telur lintas kandang dengan filter rentang tanggal.
    """
    return ProduksiTelurService.get_all_produksi(
        db,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )


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
