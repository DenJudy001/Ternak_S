from datetime import date
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.pengeluaran import Pengeluaran, KategoriPengeluaran
from app.repositories.kandang_repository import KandangRepository
from app.repositories.pengeluaran_repository import PengeluaranRepository
from app.schemas.pengeluaran import PengeluaranCreate, PengeluaranUpdate


class PengeluaranService:
    """
    Business Logic Layer untuk pengelolaan Pengeluaran Operasional Peternakan.
    Menangani validasi nominal, validasi integritas relasi kandang,
    konsistensi rentang tanggal, dan delegasi ke repository layer.
    """

    @staticmethod
    def create_pengeluaran(db: Session, data: PengeluaranCreate) -> Pengeluaran:
        """
        Mencatat pengeluaran operasional baru.
        Aturan Bisnis:
        1. Nominal harus bernilai positif (> 0).
        2. Jika dialokasikan ke kandang (kandang_id diisi), kandang harus valid dan terdaftar (404 jika tidak ditemukan).
        3. Jika kandang_id None, pengeluaran dianggap sebagai Shared Cost / Biaya Umum Peternakan.
        """
        if data.nominal <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nominal pengeluaran harus lebih besar dari 0."
            )

        if data.kandang_id is not None:
            kandang = KandangRepository.get_by_id(db, data.kandang_id)
            if not kandang:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Kandang dengan ID {data.kandang_id} tidak ditemukan."
                )

        pengeluaran_data = {
            "tanggal": data.tanggal,
            "kategori": data.kategori,
            "nominal": data.nominal,
            "jumlah_kg": data.jumlah_kg if data.kategori == KategoriPengeluaran.pakan else None,
            "keterangan": data.keterangan.strip() if data.keterangan else None,
            "kandang_id": data.kandang_id,
        }

        return PengeluaranRepository.create(db, pengeluaran_data)

    @staticmethod
    def get_pengeluaran_by_id(db: Session, pengeluaran_id: int) -> Pengeluaran:
        """
        Mengambil 1 record pengeluaran berdasarkan ID.
        Melempar HTTP 404 jika tidak ditemukan.
        """
        pengeluaran = PengeluaranRepository.get_by_id(db, pengeluaran_id)
        if not pengeluaran:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Data pengeluaran dengan ID {pengeluaran_id} tidak ditemukan."
            )
        return pengeluaran

    @staticmethod
    def get_pengeluaran_list(
        db: Session,
        kategori: Optional[KategoriPengeluaran] = None,
        kandang_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Pengeluaran]:
        """
        Mengambil daftar riwayat pengeluaran dengan filter fleksibel dan pagination.
        Memvalidasi agar start_date tidak lebih besar dari end_date.
        """
        if start_date and end_date and start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tanggal mulai (start_date) tidak boleh lebih besar dari tanggal akhir (end_date)."
            )

        return PengeluaranRepository.get_all(
            db=db,
            kategori=kategori,
            kandang_id=kandang_id,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset,
        )

    @staticmethod
    def get_pengeluaran_summary(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        kandang_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Mengambil ringkasan total pengeluaran dan agregasi per kategori berbasis SQL SUM & GROUP BY.
        Memvalidasi konsistensi rentang tanggal filter.
        """
        if start_date and end_date and start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tanggal mulai (start_date) tidak boleh lebih besar dari tanggal akhir (end_date)."
            )

        return PengeluaranRepository.get_summary(
            db=db,
            start_date=start_date,
            end_date=end_date,
            kandang_id=kandang_id,
        )

    @staticmethod
    def update_pengeluaran(
        db: Session,
        pengeluaran_id: int,
        data: PengeluaranUpdate,
    ) -> Pengeluaran:
        """
        Memperbarui record pengeluaran yang sudah ada.
        Aturan Bisnis:
        1. Validasi keberadaan record (HTTP 404).
        2. Jika nominal diisi, harus > 0.
        3. Jika kandang_id diubah ke ID kandang spesifik (bukan None), pastikan kandang valid (HTTP 404).
        """
        db_pengeluaran = PengeluaranService.get_pengeluaran_by_id(db, pengeluaran_id)

        update_dict = data.model_dump(exclude_unset=True)

        if "nominal" in update_dict:
            if update_dict["nominal"] is not None and update_dict["nominal"] <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Nominal pengeluaran harus lebih besar dari 0."
                )

        if "kandang_id" in update_dict and update_dict["kandang_id"] is not None:
            kandang = KandangRepository.get_by_id(db, update_dict["kandang_id"])
            if not kandang:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Kandang dengan ID {update_dict['kandang_id']} tidak ditemukan."
                )

        if "keterangan" in update_dict and update_dict["keterangan"]:
            update_dict["keterangan"] = update_dict["keterangan"].strip()

        # Sanitasi dan validasi jumlah_kg berdasarkan kategori aktif
        effective_kategori = update_dict.get("kategori", db_pengeluaran.kategori)
        if effective_kategori != KategoriPengeluaran.pakan:
            update_dict["jumlah_kg"] = None
        else:
            if "jumlah_kg" in update_dict:
                if update_dict["jumlah_kg"] is None or update_dict["jumlah_kg"] <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Jumlah pakan dalam satuan kg wajib diisi untuk kategori pakan."
                    )
            elif "kategori" in update_dict and update_dict["kategori"] == KategoriPengeluaran.pakan:
                if db_pengeluaran.jumlah_kg is None or db_pengeluaran.jumlah_kg <= 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Jumlah pakan dalam satuan kg wajib diisi untuk kategori pakan."
                    )

        return PengeluaranRepository.update(db, db_pengeluaran, update_dict)

    @staticmethod
    def delete_pengeluaran(db: Session, pengeluaran_id: int) -> None:
        """
        Menghapus entri pengeluaran dari basis data.
        Validasi keberadaan record (HTTP 404).
        """
        db_pengeluaran = PengeluaranService.get_pengeluaran_by_id(db, pengeluaran_id)
        PengeluaranRepository.delete(db, db_pengeluaran)
