from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.mortalitas import MortalitasCreate, MortalitasResponse
from app.services.mortalitas_service import MortalitasService

router = APIRouter(prefix="/mortalitas", tags=["Mortalitas"])


@router.post(
    "/",
    response_model=MortalitasResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Catat Kematian Ayam Baru",
    responses={
        201: {"description": "Data kematian berhasil dicatat dan populasi kandang berkurang otomatis."},
        400: {"description": "Jumlah melebihi populasi saat ini atau kandang sudah afkir."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Kandang tidak ditemukan."},
    },
)
def create_mortalitas(
    mortalitas_in: MortalitasCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mencatat data mortalitas ayam pada kandang aktif.
    Secara otomatis mengurangi jumlah ayam saat ini (jumlah_saat_ini) di kandang terkait dalam satu transaksi ACID.
    """
    return MortalitasService.record_mortalitas(db, mortalitas_in)


@router.get(
    "/kandang/{kandang_id}",
    response_model=List[MortalitasResponse],
    summary="Riwayat Mortalitas per Kandang",
    responses={
        200: {"description": "Riwayat mortalitas kandang berhasil diambil."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Kandang tidak ditemukan."},
    },
)
def get_mortalitas_kandang(
    kandang_id: int,
    limit: int = Query(100, ge=1, le=1000, description="Maksimum jumlah data yang diambil"),
    offset: int = Query(0, ge=0, description="Offset data untuk pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil riwayat kematian ayam khusus untuk satu kandang tertentu.
    """
    return MortalitasService.get_mortalitas_by_kandang(db, kandang_id, limit=limit, offset=offset)


@router.get(
    "/",
    response_model=List[MortalitasResponse],
    summary="Seluruh Riwayat Mortalitas",
    responses={
        200: {"description": "Daftar riwayat mortalitas berhasil diambil."},
        401: {"description": "Belum terautentikasi."},
    },
)
def list_all_mortalitas(
    start_date: Optional[date] = Query(None, description="Filter tanggal awal (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter tanggal akhir (YYYY-MM-DD)"),
    limit: int = Query(100, ge=1, le=1000, description="Maksimum jumlah data yang diambil"),
    offset: int = Query(0, ge=0, description="Offset data untuk pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil seluruh catatan mortalitas lintas kandang dengan filter rentang tanggal.
    """
    return MortalitasService.get_all_mortalitas(
        db,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )
