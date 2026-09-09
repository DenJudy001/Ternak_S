"""
Repository Layer: Stok Telur Repository

Menangani agregasi data tingkat basis data untuk produksi telur dan penjualan,
memungkinkan kalkulasi stok secara efisien tanpa menarik seluruh row ke memori.
"""

from datetime import date
from typing import List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.produksi_telur import ProduksiTelur
from app.models.penjualan import Penjualan


class StokRepository:
    """
    Data Access Layer untuk agregasi stok telur dan riwayat mutasi masuk/keluar.
    """

    @staticmethod
    def get_aggregate_produksi(
        db: Session, up_to_date: Optional[date] = None
    ) -> Tuple[int, int, int]:
        """
        Menghitung total butir normal, retak, dan pecah hingga tanggal up_to_date.
        Jika up_to_date None, menghitung total keseluruhan.
        """
        query = db.query(
            func.coalesce(func.sum(ProduksiTelur.jumlah_butir_normal), 0).label("normal"),
            func.coalesce(func.sum(ProduksiTelur.jumlah_butir_retak), 0).label("retak"),
            func.coalesce(func.sum(ProduksiTelur.jumlah_butir_pecah), 0).label("pecah"),
        )
        if up_to_date is not None:
            query = query.filter(ProduksiTelur.tanggal <= up_to_date)

        result = query.first()
        if result:
            return int(result[0] or 0), int(result[1] or 0), int(result[2] or 0)
        return 0, 0, 0

    @staticmethod
    def get_aggregate_penjualan(
        db: Session, up_to_date: Optional[date] = None
    ) -> int:
        """
        Menghitung total butir terjual hingga tanggal up_to_date.
        Jika up_to_date None, menghitung total keseluruhan.
        """
        query = db.query(
            func.coalesce(func.sum(Penjualan.jumlah_butir), 0).label("terjual")
        )
        if up_to_date is not None:
            query = query.filter(Penjualan.tanggal <= up_to_date)

        result = query.scalar()
        return int(result or 0)

    @staticmethod
    def get_daily_production_flow(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Tuple[date, int, int, int]]:
        """
        Menarik agregat panen harian (GROUP BY tanggal) dalam rentang start_date s/d end_date.
        Diurutkan secara kronologis menaik (tanggal ASC).
        """
        query = db.query(
            ProduksiTelur.tanggal,
            func.coalesce(func.sum(ProduksiTelur.jumlah_butir_normal), 0).label("normal"),
            func.coalesce(func.sum(ProduksiTelur.jumlah_butir_retak), 0).label("retak"),
            func.coalesce(func.sum(ProduksiTelur.jumlah_butir_pecah), 0).label("pecah"),
        )

        if start_date is not None:
            query = query.filter(ProduksiTelur.tanggal >= start_date)
        if end_date is not None:
            query = query.filter(ProduksiTelur.tanggal <= end_date)

        query = query.group_by(ProduksiTelur.tanggal).order_by(ProduksiTelur.tanggal.asc())
        rows = query.all()
        return [(r[0], int(r[1] or 0), int(r[2] or 0), int(r[3] or 0)) for r in rows]

    @staticmethod
    def get_daily_sales_flow(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Tuple[date, int]]:
        """
        Menarik agregat penjualan harian (GROUP BY tanggal) dalam rentang start_date s/d end_date.
        Diurutkan secara kronologis menaik (tanggal ASC).
        """
        query = db.query(
            Penjualan.tanggal,
            func.coalesce(func.sum(Penjualan.jumlah_butir), 0).label("terjual"),
        )

        if start_date is not None:
            query = query.filter(Penjualan.tanggal >= start_date)
        if end_date is not None:
            query = query.filter(Penjualan.tanggal <= end_date)

        query = query.group_by(Penjualan.tanggal).order_by(Penjualan.tanggal.asc())
        rows = query.all()
        return [(r[0], int(r[1] or 0)) for r in rows]
