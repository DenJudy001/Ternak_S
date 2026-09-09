from datetime import date
from typing import Any, Dict, List, Optional
from sqlalchemy import func, case
from sqlalchemy.orm import Session, joinedload
from app.models.pengeluaran import Pengeluaran, KategoriPengeluaran


class PengeluaranRepository:
    """
    Data Access Layer (Repository Pattern) untuk entitas Pengeluaran.
    Mengisolasi seluruh query dan mutasi basis data tabel pengeluaran.
    """

    @staticmethod
    def create(db: Session, obj_in_data: dict) -> Pengeluaran:
        """
        Menyimpan record pengeluaran baru ke dalam basis data.
        """
        db_pengeluaran = Pengeluaran(**obj_in_data)
        db.add(db_pengeluaran)
        db.commit()
        db.refresh(db_pengeluaran)
        return db_pengeluaran

    @staticmethod
    def get_by_id(db: Session, pengeluaran_id: int) -> Optional[Pengeluaran]:
        """
        Mengambil 1 entitas pengeluaran berdasarkan ID dengan eager loading relasi kandang.
        """
        return (
            db.query(Pengeluaran)
            .options(joinedload(Pengeluaran.kandang))
            .filter(Pengeluaran.id == pengeluaran_id)
            .first()
        )

    @staticmethod
    def get_all(
        db: Session,
        kategori: Optional[KategoriPengeluaran] = None,
        kandang_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Pengeluaran]:
        """
        Mengambil daftar riwayat pengeluaran dengan filter fleksibel (kategori, alokasi kandang, rentang tanggal).
        Menggunakan eager loading (joinedload) untuk relasi kandang dan diurutkan secara kronologis terbalik (DESC).
        """
        query = db.query(Pengeluaran).options(joinedload(Pengeluaran.kandang))

        if kategori is not None:
            query = query.filter(Pengeluaran.kategori == kategori)

        if kandang_id is not None:
            if kandang_id == 0:
                # kandang_id = 0 diformulasikan sebagai filter khusus biaya umum peternakan (IS NULL)
                query = query.filter(Pengeluaran.kandang_id.is_(None))
            else:
                query = query.filter(Pengeluaran.kandang_id == kandang_id)

        if start_date is not None:
            query = query.filter(Pengeluaran.tanggal >= start_date)

        if end_date is not None:
            query = query.filter(Pengeluaran.tanggal <= end_date)

        return (
            query.order_by(Pengeluaran.tanggal.desc(), Pengeluaran.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_summary(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        kandang_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Menghitung agregasi ringkasan pengeluaran peternakan langsung di level database:
        - Total nominal pengeluaran via SUM(nominal).
        - Breakdown per kategori via GROUP BY kategori.
        """
        filters = []
        if kandang_id is not None:
            if kandang_id == 0:
                filters.append(Pengeluaran.kandang_id.is_(None))
            else:
                filters.append(Pengeluaran.kandang_id == kandang_id)

        if start_date is not None:
            filters.append(Pengeluaran.tanggal >= start_date)

        if end_date is not None:
            filters.append(Pengeluaran.tanggal <= end_date)

        # 1. Total Akumulasi Nominal & Total Kg Pakan
        aggregate_query = db.query(
            func.coalesce(func.sum(Pengeluaran.nominal), 0),
            func.coalesce(
                func.sum(
                    case(
                        (Pengeluaran.kategori == KategoriPengeluaran.pakan, Pengeluaran.jumlah_kg),
                        else_=0,
                    )
                ),
                0,
            ),
        )
        if filters:
            aggregate_query = aggregate_query.filter(*filters)
        total_nominal, total_kg = aggregate_query.first()
        total_nominal = float(total_nominal or 0.0)
        total_kg_pakan = float(total_kg or 0.0)

        # 2. Agregasi per Kategori (GROUP BY)
        breakdown_query = db.query(
            Pengeluaran.kategori,
            func.coalesce(func.sum(Pengeluaran.nominal), 0),
        )
        if filters:
            breakdown_query = breakdown_query.filter(*filters)
        grouped_results = breakdown_query.group_by(Pengeluaran.kategori).all()

        # Inisialisasi seluruh kategori agar key selalu tersedia di dictionary output
        breakdown_dict = {kat.value: 0.0 for kat in KategoriPengeluaran}
        for kat, sum_val in grouped_results:
            kat_key = kat.value if hasattr(kat, "value") else str(kat)
            breakdown_dict[kat_key] = float(sum_val or 0.0)

        return {
            "total_pengeluaran": total_nominal,
            "total_kg_pakan": total_kg_pakan,
            "breakdown_per_kategori": breakdown_dict,
        }

    @staticmethod
    def update(
        db: Session,
        db_pengeluaran: Pengeluaran,
        update_dict: dict,
    ) -> Pengeluaran:
        """
        Memperbarui record pengeluaran yang sudah ada di database.
        """
        for field, value in update_dict.items():
            setattr(db_pengeluaran, field, value)
        db.add(db_pengeluaran)
        db.commit()
        db.refresh(db_pengeluaran)
        return db_pengeluaran

    @staticmethod
    def delete(db: Session, db_pengeluaran: Pengeluaran) -> None:
        """
        Menghapus record fisik pengeluaran dari basis data.
        """
        db.delete(db_pengeluaran)
        db.commit()
