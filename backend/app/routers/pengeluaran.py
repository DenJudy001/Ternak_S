from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.pengeluaran import KategoriPengeluaran
from app.schemas.auth import MessageResponse
from app.schemas.pengeluaran import (
    PengeluaranCreate,
    PengeluaranUpdate,
    PengeluaranResponse,
    PengeluaranSummaryResponse,
)
from app.services.pengeluaran_service import PengeluaranService

router = APIRouter(prefix="/pengeluaran", tags=["Pengeluaran"])


@router.post(
    "/",
    response_model=PengeluaranResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Catat Pengeluaran Baru",
    responses={
        201: {"description": "Data pengeluaran operasional berhasil disimpan."},
        400: {"description": "Nominal tidak valid (harus > 0)."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Kandang tidak ditemukan."},
    },
)
def create_pengeluaran(
    data: PengeluaranCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mencatat pengeluaran operasional baru untuk peternakan.
    Mendukung biaya spesifik kandang (`kandang_id` diisi) maupun biaya umum peternakan (`kandang_id` null).
    """
    return PengeluaranService.create_pengeluaran(db, data)


@router.get(
    "/summary",
    response_model=PengeluaranSummaryResponse,
    summary="Ringkasan Total dan Breakdown Kategori Pengeluaran",
    responses={
        200: {"description": "Agregasi ringkasan pengeluaran berhasil diambil."},
        400: {"description": "Rentang tanggal tidak valid."},
        401: {"description": "Belum terautentikasi."},
    },
)
def get_pengeluaran_summary(
    start_date: Optional[date] = Query(None, description="Filter tanggal awal (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter tanggal akhir (YYYY-MM-DD)"),
    kandang_id: Optional[int] = Query(
        None,
        description="Filter alokasi kandang (0 untuk biaya umum peternakan, ID kandang untuk kandang spesifik, omit untuk semua)"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil data agregasi total nominal dan rincian per kategori pengeluaran via SQL GROUP BY.
    """
    return PengeluaranService.get_pengeluaran_summary(
        db=db,
        start_date=start_date,
        end_date=end_date,
        kandang_id=kandang_id,
    )


@router.get(
    "/",
    response_model=List[PengeluaranResponse],
    summary="Daftar Riwayat Pengeluaran",
    responses={
        200: {"description": "Daftar riwayat pengeluaran berhasil diambil."},
        400: {"description": "Rentang tanggal tidak valid."},
        401: {"description": "Belum terautentikasi."},
    },
)
def get_pengeluaran_list(
    kategori: Optional[KategoriPengeluaran] = Query(None, description="Filter berdasarkan kategori"),
    kandang_id: Optional[int] = Query(
        None,
        description="Filter alokasi kandang (0 = umum/non-kandang, >0 = spesifik kandang)"
    ),
    start_date: Optional[date] = Query(None, description="Filter tanggal awal (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter tanggal akhir (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=500, description="Batas jumlah record yang dikembalikan"),
    offset: int = Query(0, ge=0, description="Offset pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil daftar riwayat pengeluaran dengan filter fleksibel dan pengurutan kronologis terbalik (terbaru dahulu).
    """
    return PengeluaranService.get_pengeluaran_list(
        db=db,
        kategori=kategori,
        kandang_id=kandang_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{pengeluaran_id}",
    response_model=PengeluaranResponse,
    summary="Detail Entri Pengeluaran",
    responses={
        200: {"description": "Detail data pengeluaran berhasil diambil."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Data pengeluaran tidak ditemukan."},
    },
)
def get_pengeluaran_by_id(
    pengeluaran_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil 1 data pengeluaran berdasarkan ID.
    """
    return PengeluaranService.get_pengeluaran_by_id(db, pengeluaran_id)


@router.patch(
    "/{pengeluaran_id}",
    response_model=PengeluaranResponse,
    summary="Koreksi / Update Pengeluaran",
    responses={
        200: {"description": "Data pengeluaran berhasil diperbarui."},
        400: {"description": "Nominal tidak valid."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Data pengeluaran atau kandang tidak ditemukan."},
    },
)
def update_pengeluaran(
    pengeluaran_id: int,
    data: PengeluaranUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Memperbarui atau mengoreksi data pengeluaran operasional secara parsial (PATCH).
    """
    return PengeluaranService.update_pengeluaran(db, pengeluaran_id, data)


@router.delete(
    "/{pengeluaran_id}",
    response_model=MessageResponse,
    summary="Hapus Entri Pengeluaran",
    responses={
        200: {"description": "Data pengeluaran berhasil dihapus."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Data pengeluaran tidak ditemukan."},
    },
)
def delete_pengeluaran(
    pengeluaran_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Menghapus record fisik pengeluaran dari basis data.
    """
    PengeluaranService.delete_pengeluaran(db, pengeluaran_id)
    return MessageResponse(message=f"Data pengeluaran dengan ID {pengeluaran_id} berhasil dihapus.")
