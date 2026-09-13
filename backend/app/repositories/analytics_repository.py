"""
Repository Layer: Analytics Repository

Mengisolasi seluruh query agregasi database untuk modul analitik FCR dan tren produksi 30 hari.
"""

from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.kandang import Kandang, StatusKandang
from app.models.pengeluaran import Pengeluaran, KategoriPengeluaran
from app.models.produksi_telur import ProduksiTelur
from app.repositories.kandang_repository import KandangRepository
from app.services.kandang_service import KandangService
from app.services.population_calculator import get_effective_population


class AnalyticsRepository:
    """
    Data Access Layer untuk kueri agregasi konsumsi pakan, produksi telur, dan timeline populasi.
    """

    @staticmethod
    def get_feed_consumption_kg(
        db: Session,
        start_date: date,
        end_date: date,
        kandang_id: Optional[int] = None,
    ) -> float:
        """
        Menghitung total konsumsi pakan dalam kilogram (jumlah_kg) pada rentang tanggal.
        Filter kategori 'pakan' dan filter kandang opsional.
        """
        query = db.query(func.coalesce(func.sum(Pengeluaran.jumlah_kg), 0)).filter(
            Pengeluaran.kategori == KategoriPengeluaran.pakan,
            Pengeluaran.tanggal >= start_date,
            Pengeluaran.tanggal <= end_date,
        )

        if kandang_id is not None:
            query = query.filter(Pengeluaran.kandang_id == kandang_id)

        result = query.scalar()
        return float(result or 0.0)

    @staticmethod
    def get_egg_production_aggregate(
        db: Session,
        start_date: date,
        end_date: date,
        kandang_id: Optional[int] = None,
    ) -> Tuple[int, int, int]:
        """
        Mengambil akumulasi butir telur (normal, retak, pecah) dalam rentang tanggal.
        Returns: (total_normal, total_retak, total_pecah)
        """
        query = db.query(
            func.coalesce(func.sum(ProduksiTelur.jumlah_butir_normal), 0),
            func.coalesce(func.sum(ProduksiTelur.jumlah_butir_retak), 0),
            func.coalesce(func.sum(ProduksiTelur.jumlah_butir_pecah), 0),
        ).filter(
            ProduksiTelur.tanggal >= start_date,
            ProduksiTelur.tanggal <= end_date,
        )

        if kandang_id is not None:
            query = query.filter(ProduksiTelur.kandang_id == kandang_id)

        row = query.first()
        if not row:
            return 0, 0, 0
        return int(row[0] or 0), int(row[1] or 0), int(row[2] or 0)

    @staticmethod
    def get_egg_production_by_date_range(
        db: Session,
        start_date: date,
        end_date: date,
        kandang_id: Optional[int] = None,
    ) -> List[Tuple[date, int, int, int]]:
        """
        Mengambil data produksi telur harian terurut tanggal ASC.
        Returns: List of (tanggal, normal, retak, pecah)
        """
        query = (
            db.query(
                ProduksiTelur.tanggal,
                func.coalesce(func.sum(ProduksiTelur.jumlah_butir_normal), 0),
                func.coalesce(func.sum(ProduksiTelur.jumlah_butir_retak), 0),
                func.coalesce(func.sum(ProduksiTelur.jumlah_butir_pecah), 0),
            )
            .filter(
                ProduksiTelur.tanggal >= start_date,
                ProduksiTelur.tanggal <= end_date,
            )
            .group_by(ProduksiTelur.tanggal)
            .order_by(ProduksiTelur.tanggal.asc())
        )

        if kandang_id is not None:
            query = query.filter(ProduksiTelur.kandang_id == kandang_id)

        rows = query.all()
        return [
            (r[0], int(r[1] or 0), int(r[2] or 0), int(r[3] or 0))
            for r in rows
        ]

    @staticmethod
    def get_active_coops_population_timeline(
        db: Session,
        start_date: date,
        end_date: date,
        kandang_id: Optional[int] = None,
    ) -> Dict[date, int]:
        """
        Menghitung timeline populasi ayam aktif per hari dari start_date hingga end_date.
        Menggunakan batch prefix sums terpusat (Anti N+1) dari KandangService.
        """
        population_map: Dict[date, int] = {}

        if kandang_id is not None:
            kandang = KandangRepository.get_by_id(db, kandang_id)
            if not kandang:
                return {}
            kandangs = [kandang]
            kandang_ids = [kandang_id]
        else:
            kandangs = KandangRepository.get_all(db, status=StatusKandang.aktif)
            kandang_ids = [k.id for k in kandangs]

        if not kandangs:
            curr = start_date
            while curr <= end_date:
                population_map[curr] = 0
                curr += timedelta(days=1)
            return population_map

        # Batch prefix sums mortalitas
        prefix_sums = KandangService.get_kandang_prefix_sums(db, kandang_ids)

        # Hitung populasi efektif harian
        curr = start_date
        while curr <= end_date:
            total_pop = 0
            for k in kandangs:
                # Jika spesifik kandang atau kandang aktif, hitung time-travel populasinya
                eff_pop = get_effective_population(
                    k.jumlah_awal, prefix_sums.get(k.id, []), curr
                )
                total_pop += eff_pop
            population_map[curr] = total_pop
            curr += timedelta(days=1)

        return population_map
