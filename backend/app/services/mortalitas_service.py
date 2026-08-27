from datetime import date
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.kandang import StatusKandang
from app.models.mortalitas import Mortalitas
from app.repositories.kandang_repository import KandangRepository
from app.repositories.mortalitas_repository import MortalitasRepository
from app.schemas.mortalitas import MortalitasCreate, MortalitasUpdate


class MortalitasService:
    """
    Business Logic Layer untuk pencatatan, pembaruan (delta), dan pembatalan (reversal) mortalitas ayam.
    Menjamin integritas data stok dan ACID transaction pada seluruh mutasi populasi kandang.
    """

    @staticmethod
    def record_mortalitas(db: Session, data: MortalitasCreate) -> Mortalitas:
        """
        Mencatat data kematian ayam baru dengan mekanisme ACID Transaction.
        
        Aturan Bisnis:
        1. Memvalidasi keberadaan kandang (404 jika tidak ditemukan).
        2. Memvalidasi status kandang (400 jika kandang berstatus 'afkir').
        3. Memvalidasi kecukupan stok ayam (400 jika jumlah kematian > jumlah_saat_ini).
        4. Mengurangi populasi ayam kandang secara otomatis: jumlah_saat_ini -= jumlah.
        5. Menyimpan record mortalitas dan update kandang dalam satu commit database.
           Jika terjadi kegagalan, transaksi di-rollback secara otomatis.
        """
        # 1. Validasi keberadaan kandang
        kandang = KandangRepository.get_by_id(db, data.kandang_id)
        if not kandang:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kandang dengan ID {data.kandang_id} tidak ditemukan."
            )

        # 2. Validasi status kandang
        if kandang.status != StatusKandang.aktif:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tidak dapat mencatat data mortalitas pada kandang yang sudah berstatus 'afkir'."
            )

        # 3. Validasi stok ayam hidup
        if data.jumlah > kandang.jumlah_saat_ini:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Jumlah kematian ({data.jumlah} ekor) tidak boleh melebihi "
                    f"populasi ayam saat ini ({kandang.jumlah_saat_ini} ekor)."
                )
            )

        # 4 & 5. Atomic Database Transaction
        try:
            kandang.jumlah_saat_ini -= data.jumlah

            mortalitas_dict = {
                "kandang_id": data.kandang_id,
                "tanggal": data.tanggal,
                "jumlah": data.jumlah,
                "keterangan": data.keterangan.strip() if data.keterangan else None,
            }
            db_mortalitas = MortalitasRepository.create(db, mortalitas_dict)

            db.add(kandang)
            db.commit()
            db.refresh(db_mortalitas)
            return db_mortalitas
        except Exception as exc:
            db.rollback()
            if isinstance(exc, HTTPException):
                raise exc
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gagal mencatat transaksi mortalitas: {str(exc)}"
            )

    @staticmethod
    def update_mortalitas(
        db: Session,
        mortalitas_id: int,
        data: MortalitasUpdate
    ) -> Mortalitas:
        """
        Koreksi data mortalitas dengan perhitungan Atomic Delta.
        
        Aturan Bisnis:
        1. Memvalidasi keberadaan record mortalitas (404 jika tidak ditemukan).
        2. Memvalidasi status kandang terkait (400 jika 'afkir').
        3. Menghitung selisih delta: delta = jumlah_baru - jumlah_lama.
        4. Validasi batas ganda:
           - (jumlah_saat_ini - delta) >= 0 (populasi tidak boleh negatif).
           - (jumlah_saat_ini - delta) <= jumlah_awal (populasi tidak boleh melebihi kapasitas awal).
        5. Mengubah populasi kandang secara otomatis dan menyimpan perubahan secara ACID.
        """
        mortalitas = MortalitasRepository.get_by_id(db, mortalitas_id)
        if not mortalitas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Data mortalitas dengan ID {mortalitas_id} tidak ditemukan."
            )

        kandang = KandangRepository.get_by_id(db, mortalitas.kandang_id)
        if not kandang:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kandang terkait dengan ID {mortalitas.kandang_id} tidak ditemukan."
            )

        if kandang.status != StatusKandang.aktif:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tidak dapat mengoreksi mortalitas pada kandang yang sudah berstatus 'afkir'."
            )

        update_dict = data.model_dump(exclude_unset=True)

        if "jumlah" in update_dict and update_dict["jumlah"] is not None:
            jumlah_baru = update_dict["jumlah"]
            if jumlah_baru <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Jumlah kematian ayam harus lebih dari 0."
                )

            delta = jumlah_baru - mortalitas.jumlah
            new_populasi = kandang.jumlah_saat_ini - delta

            if new_populasi < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Koreksi kematian menjadi {jumlah_baru} ekor mengakibatkan populasi kandang "
                        f"bernilai negatif ({new_populasi} ekor)."
                    )
                )

            if new_populasi > kandang.jumlah_awal:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Koreksi kematian mengakibatkan populasi kandang ({new_populasi} ekor) "
                        f"melebihi jumlah awal ayam saat setup ({kandang.jumlah_awal} ekor)."
                    )
                )

            kandang.jumlah_saat_ini = new_populasi

        if "keterangan" in update_dict and update_dict["keterangan"] is not None:
            update_dict["keterangan"] = update_dict["keterangan"].strip()

        try:
            MortalitasRepository.update(db, mortalitas, update_dict)
            db.add(kandang)
            db.commit()
            db.refresh(mortalitas)
            return mortalitas
        except Exception as exc:
            db.rollback()
            if isinstance(exc, HTTPException):
                raise exc
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gagal mengoreksi data mortalitas: {str(exc)}"
            )

    @staticmethod
    def delete_mortalitas(db: Session, mortalitas_id: int) -> Dict[str, Any]:
        """
        Membatalkan (menghapus) record mortalitas dengan Reversal Stok otomatis.
        
        Aturan Bisnis:
        1. Memvalidasi keberadaan record mortalitas (404 jika tidak ditemukan).
        2. Memvalidasi status kandang terkait (400 jika 'afkir').
        3. Memvalidasi pengembalian stok: pastikan (jumlah_saat_ini + mortalitas.jumlah) <= jumlah_awal.
        4. Mengembalikan stok ayam ke kandang: jumlah_saat_ini += mortalitas.jumlah.
        5. Menghapus record fisik mortalitas dalam satu transaksi ACID.
        """
        mortalitas = MortalitasRepository.get_by_id(db, mortalitas_id)
        if not mortalitas:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Data mortalitas dengan ID {mortalitas_id} tidak ditemukan."
            )

        kandang = KandangRepository.get_by_id(db, mortalitas.kandang_id)
        if not kandang:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kandang terkait dengan ID {mortalitas.kandang_id} tidak ditemukan."
            )

        if kandang.status != StatusKandang.aktif:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tidak dapat membatalkan mortalitas pada kandang yang sudah berstatus 'afkir'."
            )

        new_populasi = kandang.jumlah_saat_ini + mortalitas.jumlah
        if new_populasi > kandang.jumlah_awal:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Pembatalan mortalitas mengakibatkan populasi kandang ({new_populasi} ekor) "
                    f"melebihi populasi awal ({kandang.jumlah_awal} ekor)."
                )
            )

        try:
            kandang.jumlah_saat_ini = new_populasi
            jumlah_dibatalkan = mortalitas.jumlah
            MortalitasRepository.delete(db, mortalitas)
            db.add(kandang)
            db.commit()
            return {
                "message": (
                    f"Data mortalitas #{mortalitas_id} berhasil dibatalkan dan "
                    f"{jumlah_dibatalkan} ekor ayam dikembalikan ke populasi kandang."
                )
            }
        except Exception as exc:
            db.rollback()
            if isinstance(exc, HTTPException):
                raise exc
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gagal membatalkan transaksi mortalitas: {str(exc)}"
            )

    @staticmethod
    def get_mortalitas_by_kandang(
        db: Session,
        kandang_id: int,
        limit: int = 100,
        offset: int = 0
    ) -> List[Mortalitas]:
        """
        Mengambil riwayat kematian ayam untuk kandang tertentu.
        Memvalidasi keberadaan kandang terlebih dahulu.
        """
        kandang = KandangRepository.get_by_id(db, kandang_id)
        if not kandang:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kandang dengan ID {kandang_id} tidak ditemukan."
            )

        return MortalitasRepository.get_by_kandang(db, kandang_id, limit=limit, offset=offset)

    @staticmethod
    def get_all_mortalitas(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Mortalitas]:
        """
        Mengambil riwayat seluruh transaksi mortalitas dengan filter rentang tanggal.
        """
        return MortalitasRepository.get_all(
            db,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset
        )
