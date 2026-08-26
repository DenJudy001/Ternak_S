from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.mortalitas import Mortalitas


class MortalitasRepository:
    """
    Data Access Layer (Repository Pattern) untuk entitas Mortalitas.
    Mengisolasi seluruh query dan operasi basis data tabel mortalitas.
    """

    @staticmethod
    def create(db: Session, obj_in_data: dict) -> Mortalitas:
        """
        Menambahkan record mortalitas baru ke dalam session database.
        """
        db_mortalitas = Mortalitas(**obj_in_data)
        db.add(db_mortalitas)
        return db_mortalitas

    @staticmethod
    def get_by_kandang(
        db: Session,
        kandang_id: int,
        limit: int = 100,
        offset: int = 0
    ) -> List[Mortalitas]:
        """
        Mengambil riwayat mortalitas untuk satu kandang spesifik.
        Diurutkan berdasarkan tanggal secara descending (terbaru ke terlama).
        """
        return (
            db.query(Mortalitas)
            .filter(Mortalitas.kandang_id == kandang_id)
            .order_by(Mortalitas.tanggal.desc(), Mortalitas.id.desc())
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
    ) -> List[Mortalitas]:
        """
        Mengambil seluruh catatan riwayat mortalitas lintas kandang.
        Dapat difilter berdasarkan rentang tanggal (start_date & end_date).
        """
        query = db.query(Mortalitas)
        if start_date is not None:
            query = query.filter(Mortalitas.tanggal >= start_date)
        if end_date is not None:
            query = query.filter(Mortalitas.tanggal <= end_date)
        return (
            query.order_by(Mortalitas.tanggal.desc(), Mortalitas.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
