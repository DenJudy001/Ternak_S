from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.kandang import StatusKandang
from app.models.user import User
from app.schemas.kandang import KandangCreate, KandangResponse, KandangUpdate
from app.services.kandang_service import KandangService

router = APIRouter(prefix="/kandang", tags=["Kandang"])


@router.post(
    "/",
    response_model=KandangResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Setup Kandang Baru",
    responses={
        201: {"description": "Kandang berhasil dibuat dengan populasi awal dan status aktif."},
        401: {"description": "Belum terautentikasi."},
        422: {"description": "Validasi payload gagal."},
    },
)
def create_kandang(
    kandang_in: KandangCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Membuat data setup kandang baru.
    Populasi saat ini otomatis diatur sama dengan populasi awal, dan status default adalah 'aktif'.
    """
    return KandangService.create_kandang(db, kandang_in)


@router.get(
    "/",
    response_model=List[KandangResponse],
    summary="Daftar Seluruh Kandang",
    responses={
        200: {"description": "Daftar kandang berhasil diambil."},
        401: {"description": "Belum terautentikasi."},
    },
)
def list_kandang(
    status_filter: Optional[StatusKandang] = Query(
        None,
        alias="status",
        description="Filter status kandang: 'aktif' atau 'afkir'"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil daftar seluruh kandang peternakan, dapat difilter berdasarkan status (aktif/afkir).
    """
    return KandangService.get_kandang_list(db, status_filter=status_filter)


@router.get(
    "/{kandang_id}",
    response_model=KandangResponse,
    summary="Detail Satu Kandang",
    responses={
        200: {"description": "Detail data kandang."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Kandang tidak ditemukan."},
    },
)
def get_kandang(
    kandang_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mengambil data detail satu kandang berdasarkan ID.
    """
    return KandangService.get_kandang_by_id(db, kandang_id)


@router.patch(
    "/{kandang_id}",
    response_model=KandangResponse,
    summary="Update Parsial Kandang",
    responses={
        200: {"description": "Data kandang berhasil diperbarui."},
        400: {"description": "Nilai update tidak valid."},
        401: {"description": "Belum terautentikasi."},
        404: {"description": "Kandang tidak ditemukan."},
    },
)
def update_kandang_patch(
    kandang_id: int,
    kandang_in: KandangUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Memperbarui sebagian atribut kandang (nama, status afkir, atau koreksi jumlah saat ini).
    """
    return KandangService.update_kandang(db, kandang_id, kandang_in)

