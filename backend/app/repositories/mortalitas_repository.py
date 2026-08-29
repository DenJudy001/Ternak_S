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
    def get_by_id(db: Session, mortalitas_id: int) -> Optional[Mortalitas]:
        """
        Mengambil 1 entitas mortalitas berdasarkan ID.
        """
        return db.query(Mortalitas).filter(Mortalitas.id == mortalitas_id).first()

    @staticmethod
    def update(db: Session, db_mortalitas: Mortalitas, update_dict: dict) -> Mortalitas:
        """
        Memperbarui atribut record mortalitas di database session.
        """
        for field, value in update_dict.items():
            setattr(db_mortalitas, field, value)
        db.add(db_mortalitas)
        return db_mortalitas

    @staticmethod
    def delete(db: Session, db_mortalitas: Mortalitas) -> None:
        """
        Menghapus record fisik mortalitas dari database session.
        """
        db.delete(db_mortalitas)

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
    def get_mortalitas_by_kandang_ids(
        db: Session,
        kandang_ids: List[int]
    ) -> List[Mortalitas]:
        """
        Mengambil seluruh record mortalitas untuk sekumpulan ID kandang dalam 1 query batch (Anti N+1).
        Diurutkan secara kronologis menaik (ASC) berdasarkan tanggal.
        """
        if not kandang_ids:
            return []
        return (
            db.query(Mortalitas)
            .filter(Mortalitas.kandang_id.in_(kandang_ids))
            .order_by(Mortalitas.tanggal.asc(), Mortalitas.id.asc())
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
