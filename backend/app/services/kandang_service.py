from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.kandang import Kandang, StatusKandang
from app.repositories.kandang_repository import KandangRepository
from app.repositories.mortalitas_repository import MortalitasRepository
from app.schemas.kandang import KandangCreate, KandangUpdate


class KandangService:
    """
    Business Logic Layer untuk pengelolaan Kandang.
    Menangani validasi aturan bisnis, inisialisasi status/populasi awal,
    serta komputasi deterministik derived state (jumlah_saat_ini) berbasis Genesis Fact (jumlah_awal).
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
        Memperbarui data kandang (nama, tanggal_mulai, status, atau koreksi Genesis Fact jumlah_awal).
        Aturan Bisnis:
        1. Memvalidasi keberadaan kandang (404 jika tidak ditemukan).
        2. Jika jumlah_awal diubah:
           - Mengambil total akumulasi kematian ayam pada kandang tersebut via MortalitasRepository.
           - Underflow Protection Guard: Memastikan jumlah_awal baru >= total_mati (400 jika lebih kecil).
           - Menghitung ulang running derived state: jumlah_saat_ini = jumlah_awal baru - total_mati.
        3. Menjaga integritas data dan mencegah mutasi langsung pada running counter jumlah_saat_ini.
        """
        db_kandang = KandangService.get_kandang_by_id(db, kandang_id)

        update_dict = data.model_dump(exclude_unset=True)

        if "nama_kandang" in update_dict and update_dict["nama_kandang"]:
            update_dict["nama_kandang"] = update_dict["nama_kandang"].strip()

        # Jika terdapat koreksi pada Genesis Fact jumlah_awal
        if "jumlah_awal" in update_dict and update_dict["jumlah_awal"] is not None:
            new_jumlah_awal = update_dict["jumlah_awal"]
            total_mati = MortalitasRepository.get_total_mortalitas_by_kandang(db, kandang_id)

            if new_jumlah_awal < total_mati:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Jumlah awal baru ({new_jumlah_awal}) tidak boleh lebih kecil dari "
                        f"total akumulasi kematian yang sudah tercatat ({total_mati} ekor)."
                    )
                )

            # Hitung ulang derived state jumlah_saat_ini secara deterministik
            update_dict["jumlah_saat_ini"] = new_jumlah_awal - total_mati

        return KandangRepository.update(db, db_kandang, update_dict)
