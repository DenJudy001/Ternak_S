from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.kandang import Kandang, StatusKandang
from app.repositories.kandang_repository import KandangRepository
from app.schemas.kandang import KandangCreate, KandangUpdate


class KandangService:
    """
    Business Logic Layer untuk pengelolaan Kandang.
    Menangani validasi aturan bisnis, inisialisasi status/populasi awal,
    dan orkestrasi operasi repository.
    """

    @staticmethod
    def get_kandang_list(
        db: Session,
        status_filter: Optional[StatusKandang] = None
    ) -> List[Kandang]:
        """
        Mengambil daftar seluruh kandang dengan filter status opsional.
        """
        return KandangRepository.get_all(db, status=status_filter)

    @staticmethod
    def get_kandang_by_id(db: Session, kandang_id: int) -> Kandang:
        """
        Mengambil detail kandang berdasarkan ID.
        Melempar HTTP 404 jika kandang tidak ditemukan.
        """
        kandang = KandangRepository.get_by_id(db, kandang_id)
        if not kandang:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kandang dengan ID {kandang_id} tidak ditemukan."
            )
        return kandang

    @staticmethod
    def create_kandang(db: Session, data: KandangCreate) -> Kandang:
        """
        Membuat setup kandang baru.
        Aturan Bisnis:
        - jumlah_saat_ini otomatis diinisialisasi sama dengan jumlah_awal.
        - status otomatis di-set ke StatusKandang.aktif.
        """
        kandang_data = {
            "nama_kandang": data.nama_kandang.strip(),
            "tanggal_mulai": data.tanggal_mulai,
            "jumlah_awal": data.jumlah_awal,
            "jumlah_saat_ini": data.jumlah_awal,
            "status": StatusKandang.aktif,
        }
        return KandangRepository.create(db, kandang_data)

    @staticmethod
    def update_kandang(
        db: Session,
        kandang_id: int,
        data: KandangUpdate
    ) -> Kandang:
        """
        Memperbarui data kandang (nama, status afkir/aktif, atau koreksi jumlah saat ini).
        Aturan Bisnis:
        - Memvalidasi keberadaan kandang (404 jika tidak ditemukan).
        - Memvalidasi jumlah_saat_ini tidak boleh bernilai negatif.
        """
        db_kandang = KandangService.get_kandang_by_id(db, kandang_id)

        update_dict = data.model_dump(exclude_unset=True)

        if "nama_kandang" in update_dict and update_dict["nama_kandang"]:
            update_dict["nama_kandang"] = update_dict["nama_kandang"].strip()

        if "jumlah_saat_ini" in update_dict:
            if update_dict["jumlah_saat_ini"] is not None and update_dict["jumlah_saat_ini"] < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Jumlah ayam saat ini tidak boleh bernilai negatif."
                )

        return KandangRepository.update(db, db_kandang, update_dict)
