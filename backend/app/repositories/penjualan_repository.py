from datetime import date
from typing import Any, Dict, List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.penjualan import Penjualan, SatuanJual


class PenjualanRepository:
    """
    Data Access Layer (Repository Pattern) untuk entitas Penjualan.
    Mengisolasi seluruh query dan mutasi basis data tabel penjualan.
    """

    @staticmethod
    def create(db: Session, obj_in_data: dict) -> Penjualan:
        """
        Menyimpan transaksi penjualan baru ke dalam basis data.
        """
        db_penjualan = Penjualan(**obj_in_data)
        db.add(db_penjualan)
        db.commit()
        db.refresh(db_penjualan)
        return db_penjualan

    @staticmethod
    def get_by_id(db: Session, penjualan_id: int) -> Optional[Penjualan]:
        """
        Mengambil 1 entitas penjualan berdasarkan ID.
        """
        return db.query(Penjualan).filter(Penjualan.id == penjualan_id).first()

    @staticmethod
    def get_all(
        db: Session,
        satuan_jual: Optional[SatuanJual] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        search_pembeli: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Penjualan]:
        """
        Mengambil daftar riwayat penjualan dengan filter fleksibel (satuan jual, rentang tanggal, search pembeli).
        Diurutkan secara kronologis terbalik (tanggal DESC, id DESC).
        """
        query = db.query(Penjualan)

        if satuan_jual is not None:
            query = query.filter(Penjualan.satuan_jual == satuan_jual)

        if start_date is not None:
            query = query.filter(Penjualan.tanggal >= start_date)

        if end_date is not None:
            query = query.filter(Penjualan.tanggal <= end_date)

        if search_pembeli is not None and search_pembeli.strip():
            keyword = f"%{search_pembeli.strip()}%"
            query = query.filter(Penjualan.pembeli.ilike(keyword))

        return (
            query.order_by(Penjualan.tanggal.desc(), Penjualan.id.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_summary(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Menghitung agregasi ringkasan penjualan langsung di level database:
        - Total nominal pendapatan via SUM(total)
        - Total butir fisik terjual via SUM(jumlah_butir)
        - Total transaksi via COUNT(id)
        - Subtotal pendapatan per satuan_jual via GROUP BY satuan_jual
        """
        filters = []
        if start_date is not None:
            filters.append(Penjualan.tanggal >= start_date)
        if end_date is not None:
            filters.append(Penjualan.tanggal <= end_date)

        # 1. Total Pendapatan, Butir, dan Transaksi
        aggregates_query = db.query(
            func.coalesce(func.sum(Penjualan.total), 0),
            func.coalesce(func.sum(Penjualan.jumlah_butir), 0),
            func.count(Penjualan.id),
        )
        if filters:
            aggregates_query = aggregates_query.filter(*filters)
        tot_pendapatan, tot_butir, tot_trx = aggregates_query.first() or (0, 0, 0)

        # 2. Subtotal per Satuan Jual (GROUP BY)
        breakdown_query = db.query(
            Penjualan.satuan_jual,
            func.coalesce(func.sum(Penjualan.total), 0),
        )
        if filters:
            breakdown_query = breakdown_query.filter(*filters)
        grouped_results = breakdown_query.group_by(Penjualan.satuan_jual).all()

        breakdown_dict = {s.value: 0.0 for s in SatuanJual}
        for sat, sum_val in grouped_results:
            sat_key = sat.value if hasattr(sat, "value") else str(sat)
            breakdown_dict[sat_key] = float(sum_val or 0.0)

        return {
            "total_pendapatan": float(tot_pendapatan or 0.0),
            "total_butir_terjual": int(tot_butir or 0),
            "total_transaksi": int(tot_trx or 0),
            "breakdown_per_satuan": breakdown_dict,
        }

    @staticmethod
    def update(
        db: Session,
        db_penjualan: Penjualan,
        update_dict: dict,
    ) -> Penjualan:
        """
        Memperbarui record penjualan yang sudah ada di database.
        """
        for field, value in update_dict.items():
            setattr(db_penjualan, field, value)
        db.add(db_penjualan)
        db.commit()
        db.refresh(db_penjualan)
        return db_penjualan

    @staticmethod
    def delete(db: Session, db_penjualan: Penjualan) -> None:
        """
        Menghapus record fisik penjualan dari database.
        """
        db.delete(db_penjualan)
        db.commit()
