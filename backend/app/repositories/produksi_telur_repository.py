from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.produksi_telur import ProduksiTelur


class ProduksiTelurRepository:
    """
    Data Access Layer (Repository Pattern) untuk entitas ProduksiTelur.
    Mengisolasi seluruh query dan operasi basis data tabel produksi_telur.
    """

    @staticmethod
    def create(db: Session, obj_in_data: dict) -> ProduksiTelur:
        """
        Menambahkan record produksi telur baru ke dalam session database.
        """
        db_produksi = ProduksiTelur(**obj_in_data)
        db.add(db_produksi)
        return db_produksi

    @staticmethod
    def get_by_id(db: Session, produksi_id: int) -> Optional[ProduksiTelur]:
        """
        Mengambil 1 entitas produksi telur berdasarkan ID.
        """
        return db.query(ProduksiTelur).filter(ProduksiTelur.id == produksi_id).first()

    @staticmethod
    def get_by_kandang_and_date(
        db: Session,
        kandang_id: int,
        tanggal: date
    ) -> Optional[ProduksiTelur]:
        """
        Mencari data produksi telur berdasarkan kandang dan tanggal tertentu.
        Digunakan untuk deteksi duplikasi sebelum insert / update.
        """
        return (
            db.query(ProduksiTelur)
            .filter(
                ProduksiTelur.kandang_id == kandang_id,
                ProduksiTelur.tanggal == tanggal
            )
            .first()
        )

    @staticmethod
    def update(
        db: Session,
        db_produksi: ProduksiTelur,
        update_dict: dict
    ) -> ProduksiTelur:
        """
        Memperbarui atribut record produksi telur.
        """
        for field, value in update_dict.items():
            setattr(db_produksi, field, value)
        db.add(db_produksi)
        return db_produksi

    @staticmethod
    def delete(db: Session, db_produksi: ProduksiTelur) -> None:
        """
        Menghapus record fisik produksi telur dari database.
        """
        db.delete(db_produksi)

    @staticmethod
    def get_by_kandang(
        db: Session,
        kandang_id: int,
        limit: int = 100,
        offset: int = 0
    ) -> List[ProduksiTelur]:
        """
        Mengambil riwayat produksi telur untuk satu kandang spesifik.
        Diurutkan berdasarkan tanggal secara descending (terbaru ke terlama).
        """
        return (
            db.query(ProduksiTelur)
            .filter(ProduksiTelur.kandang_id == kandang_id)
            .order_by(ProduksiTelur.tanggal.desc(), ProduksiTelur.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_all(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[ProduksiTelur]:
        """
        Mengambil seluruh catatan produksi telur lintas kandang dengan filter rentang tanggal.
        """
        query = db.query(ProduksiTelur)
        if start_date is not None:
            query = query.filter(ProduksiTelur.tanggal >= start_date)
        if end_date is not None:
            query = query.filter(ProduksiTelur.tanggal <= end_date)
        return (
            query.order_by(ProduksiTelur.tanggal.desc(), ProduksiTelur.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
