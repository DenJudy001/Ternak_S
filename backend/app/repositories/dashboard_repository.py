"""
Repository Layer: Dashboard Repository

Mengisolasi seluruh agregasi query database untuk ringkasan eksekutif dashboard.
Mengoptimalkan batch query untuk mengurangi jumlah database round-trip.
"""

from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.pengeluaran import Pengeluaran
from app.models.penjualan import Penjualan
from app.models.produksi_telur import ProduksiTelur


class DashboardRepository:
    """
    Data Access Layer untuk agregasi dashboard lintas modul (Produksi, Keuangan, Tren).
    """

    @staticmethod
    def get_production_aggregate_by_date(
        db: Session, target_date: date
    ) -> Tuple[int, int, int, int]:
        """
        Mengambil agregasi produksi telur pada tanggal tertentu dalam 1 query:
        Returns: (record_count, total_normal, total_retak, total_pecah)
        """
        row = (
            db.query(
                func.count(ProduksiTelur.id),
                func.coalesce(func.sum(ProduksiTelur.jumlah_butir_normal), 0),
                func.coalesce(func.sum(ProduksiTelur.jumlah_butir_retak), 0),
                func.coalesce(func.sum(ProduksiTelur.jumlah_butir_pecah), 0),
            )
            .filter(ProduksiTelur.tanggal == target_date)
            .first()
        )

        if not row:
            return 0, 0, 0, 0

        count_rec, normal, retak, pecah = row
        return int(count_rec or 0), int(normal or 0), int(retak or 0), int(pecah or 0)

    @staticmethod
    def get_latest_production_date_before(
        db: Session, target_date: date
    ) -> Optional[date]:
        """
        Mencari tanggal pencatatan produksi telur terakhir sebelum target_date.
        Digunakan sebagai fallback kontekstual jika panen hari ini belum dicatat.
        """
        return (
            db.query(func.max(ProduksiTelur.tanggal))
            .filter(ProduksiTelur.tanggal < target_date)
            .scalar()
        )

    @staticmethod
    def get_monthly_financial_aggregates(
        db: Session, start_date: date, end_date: date
    ) -> Tuple[Decimal, Decimal]:
        """
        Mengambil agregasi finansial (total pendapatan penjualan dan total pengeluaran operasional)
        dalam rentang tanggal kalender berjalan (Month-to-Date / MTD).
        Returns: (total_pendapatan, total_pengeluaran)
        """
        total_penjualan = (
            db.query(func.coalesce(func.sum(Penjualan.total), 0))
            .filter(Penjualan.tanggal >= start_date, Penjualan.tanggal <= end_date)
            .scalar()
        )

        total_pengeluaran = (
            db.query(func.coalesce(func.sum(Pengeluaran.nominal), 0))
            .filter(Pengeluaran.tanggal >= start_date, Pengeluaran.tanggal <= end_date)
            .scalar()
        )

        return (
            Decimal(str(total_penjualan or 0)),
            Decimal(str(total_pengeluaran or 0)),
        )

    @staticmethod
    def get_recent_production_and_sales_trend(
        db: Session, start_date: date, end_date: date
    ) -> List[Dict[str, Any]]:
        """
        Mengambil deret waktu harian untuk produksi telur normal dan butir telur terjual
        selama rentang tanggal (default 7 hari terakhir).
        Menjamin seluruh tanggal dalam rentang memiliki data point meskipun bernilai 0.
        """
        # 1. Query agregasi produksi normal per tanggal
        prod_rows = (
            db.query(
                ProduksiTelur.tanggal,
                func.coalesce(func.sum(ProduksiTelur.jumlah_butir_normal), 0),
            )
            .filter(ProduksiTelur.tanggal >= start_date, ProduksiTelur.tanggal <= end_date)
            .group_by(ProduksiTelur.tanggal)
            .all()
        )
        prod_map = {row[0]: int(row[1]) for row in prod_rows}

        # 2. Query agregasi penjualan butir per tanggal
        sales_rows = (
            db.query(
                Penjualan.tanggal,
                func.coalesce(func.sum(Penjualan.jumlah_butir), 0),
            )
            .filter(Penjualan.tanggal >= start_date, Penjualan.tanggal <= end_date)
            .group_by(Penjualan.tanggal)
            .all()
        )
        sales_map = {row[0]: int(row[1]) for row in sales_rows}

        # 3. Susun deret kronologis terurut menaik (ASC)
        trend: List[Dict[str, Any]] = []
        current = start_date
        while current <= end_date:
            trend.append({
                "tanggal": current,
                "butir_produksi": prod_map.get(current, 0),
                "butir_terjual": sales_map.get(current, 0),
            })
            current += timedelta(days=1)

        return trend
