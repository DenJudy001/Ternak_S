from datetime import date
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.kandang import StatusKandang
from app.models.mortalitas import Mortalitas
from app.repositories.kandang_repository import KandangRepository
from app.repositories.mortalitas_repository import MortalitasRepository
from app.schemas.mortalitas import MortalitasCreate


class MortalitasService:
    """
    Business Logic Layer untuk pencatatan dan pengelolaan mortalitas ayam.
    Menjamin integritas data stok dan ACID transaction pada mutasi populasi kandang.
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
