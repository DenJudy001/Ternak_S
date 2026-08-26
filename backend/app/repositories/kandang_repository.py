from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.kandang import Kandang, StatusKandang


class KandangRepository:
    """
    Data Access Layer (Repository Pattern) untuk entitas Kandang.
    Mengisolasi seluruh query dan operasi database SQLAlchemy.
    """

    @staticmethod
    def get_all(db: Session, status: Optional[StatusKandang] = None) -> List[Kandang]:
        """
        Mengambil seluruh daftar kandang, dengan filter status opsional.
        Diurutkan berdasarkan ID secara ascending.
        """
        query = db.query(Kandang)
        if status is not None:
            query = query.filter(Kandang.status == status)
        return query.order_by(Kandang.id.asc()).all()

    @staticmethod
    def get_by_id(db: Session, kandang_id: int) -> Optional[Kandang]:
        """
        Mengambil detail kandang berdasarkan ID.
        """
        return db.query(Kandang).filter(Kandang.id == kandang_id).first()

    @staticmethod
    def create(db: Session, obj_in_data: dict) -> Kandang:
        """
        Membuat record kandang baru ke database.
        """
        db_kandang = Kandang(**obj_in_data)
        db.add(db_kandang)
        db.commit()
        db.refresh(db_kandang)
        return db_kandang

    @staticmethod
    def update(db: Session, db_kandang: Kandang, update_data: dict) -> Kandang:
        """
        Memperbarui record kandang yang sudah ada di database.
        """
        for field, value in update_data.items():
            setattr(db_kandang, field, value)
        db.add(db_kandang)
        db.commit()
        db.refresh(db_kandang)
        return db_kandang
