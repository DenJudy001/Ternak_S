"""
Service Layer: Dashboard Service (Imperative Shell)

Menghubungkan domain logic murni (dashboard_calculator, population_calculator, stok_calculator)
dengan data access layer (DashboardRepository, KandangRepository, StokService).
Mengimplementasikan API Aggregator Pattern untuk menyediakan ringkasan eksekutif
dalam satu round-trip response.
"""

import calendar
from datetime import date, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.kandang import StatusKandang
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.kandang_repository import KandangRepository
from app.repositories.mortalitas_repository import MortalitasRepository
from app.services.dashboard_calculator import (
    aggregate_farm_hdp,
    calculate_pnl,
    evaluate_hdp_status,
)
from app.services.population_calculator import (
    build_mortality_prefix_sum,
    get_effective_population,
)
from app.services.stok_service import StokService


class DashboardService:
    """
    Service orchestration untuk ringkasan eksekutif dashboard peternakan.
    """

    @staticmethod
    def get_dashboard_summary(
        db: Session, target_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Menyusun data ringkasan eksekutif terpadu untuk dashboard:
        1. HDP Hari Ini (atau data panen terakhir jika hari ini belum tercatat)
        2. Laba / Rugi Bulan Ini (Month-to-Date / MTD)
        3. Saldo Stok Telur Gudang Siap Jual
        4. Deret Waktu Tren 7 Hari Terakhir (Produksi vs Penjualan)
        """
        ref_date = target_date or date.today()

        # -------------------------------------------------------------
        # 1. METRIK 1: HDP HARI INI & POPULASI EFEKTIF KANDANG AKTIF
        # -------------------------------------------------------------
        active_kandangs = KandangRepository.get_all(db, status=StatusKandang.aktif)
        kandang_ids = [k.id for k in active_kandangs]

        total_populasi_efektif = 0
        if kandang_ids:
            # Batch query mortalitas untuk seluruh kandang aktif (Anti N+1)
            mortalitas_records = MortalitasRepository.get_mortalitas_by_kandang_ids(
                db, kandang_ids
            )
            partitioned: Dict[int, List[Any]] = {kid: [] for kid in kandang_ids}
            for m in mortalitas_records:
                if m.kandang_id in partitioned:
                    partitioned[m.kandang_id].append((m.tanggal, m.jumlah))

            prefix_sums = {
                kid: build_mortality_prefix_sum(m_list)
                for kid, m_list in partitioned.items()
            }

            # Hitung populasi efektif seluruh kandang aktif pada ref_date
            for k in active_kandangs:
                eff_pop = get_effective_population(
                    k.jumlah_awal, prefix_sums.get(k.id, []), ref_date
                )
                total_populasi_efektif += eff_pop

        # Cek produksi telur pada tanggal referensi
        count_rec, sum_normal, _, _ = (
            DashboardRepository.get_production_aggregate_by_date(db, ref_date)
        )

        if count_rec > 0:
            is_today_recorded = True
            total_butir_normal = sum_normal
            tanggal_referensi_produksi: Optional[date] = ref_date
        else:
            is_today_recorded = False
            fallback_date = DashboardRepository.get_latest_production_date_before(
                db, ref_date
            )
            if fallback_date:
                _, fb_normal, _, _ = (
                    DashboardRepository.get_production_aggregate_by_date(
                        db, fallback_date
                    )
                )
                total_butir_normal = fb_normal
                tanggal_referensi_produksi = fallback_date
            else:
                total_butir_normal = 0
                tanggal_referensi_produksi = None

        persentase_hdp = aggregate_farm_hdp(
            total_butir_normal, total_populasi_efektif
        )
        status_performa = evaluate_hdp_status(persentase_hdp)

        hdp_data = {
            "persentase": persentase_hdp,
            "total_butir_normal": total_butir_normal,
            "total_populasi_efektif": total_populasi_efektif,
            "status_performa": status_performa,
            "is_today_recorded": is_today_recorded,
            "tanggal_referensi_produksi": tanggal_referensi_produksi,
        }

        # -------------------------------------------------------------
        # 2. METRIK 2: KEUANGAN BULAN INI (LABA / RUGI MTD)
        # -------------------------------------------------------------
        start_of_month = ref_date.replace(day=1)
        _, last_day = calendar.monthrange(ref_date.year, ref_date.month)
        end_of_month = ref_date.replace(day=last_day)

        pendapatan, pengeluaran = DashboardRepository.get_monthly_financial_aggregates(
            db, start_date=start_of_month, end_date=end_of_month
        )

        pnl = calculate_pnl(total_pendapatan=pendapatan, total_pengeluaran=pengeluaran)

        keuangan_data = {
            "total_pendapatan": pnl["total_pendapatan"],
            "total_pengeluaran": pnl["total_pengeluaran"],
            "laba_rugi_bersih": pnl["laba_rugi_bersih"],
            "margin_persen": pnl["margin_persen"],
            "status": pnl["status"],
        }

        # -------------------------------------------------------------
        # 3. METRIK 3: STOK TELUR SIAP JUAL (ON-THE-FLY)
        # -------------------------------------------------------------
        stok_summary = StokService.get_stok_ringkasan(db, target_date=ref_date)
        stok_tersedia = int(stok_summary["stok_tersedia"])
        tray = int(stok_summary["tray"])
        butir_eceran = int(stok_summary["butir_eceran"])

        stok_data = {
            "stok_tersedia": stok_tersedia,
            "format_tray": f"{tray} tray + {butir_eceran} butir",
            "estimasi_kg": float(stok_summary["estimasi_kg"]),
            "status_gudang": str(stok_summary["status_stok"]),
            "is_underflow": bool(stok_tersedia < 0),
        }

        # -------------------------------------------------------------
        # 4. METRIK 4: TREN 7 HARI TERAKHIR (PRODUKSI VS PENJUALAN)
        # -------------------------------------------------------------
        trend_end = ref_date
        trend_start = ref_date - timedelta(days=6)
        trend_data = DashboardRepository.get_recent_production_and_sales_trend(
            db, start_date=trend_start, end_date=trend_end
        )

        return {
            "tanggal_referensi": ref_date,
            "hdp_hari_ini": hdp_data,
            "keuangan_bulan_ini": keuangan_data,
            "stok_gudang": stok_data,
            "tren_7_hari": trend_data,
        }
