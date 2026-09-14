"""
Service Layer: Report Data Assembler (FCIS Pattern)

Mengorkestrasikan dan mengagregasikan data bulanan komprehensif peternakan dari 4 pilar:
1. Finansial (Pendapatan, Pengeluaran, Laba/Rugi MTD, Margin %)
2. Performa Produksi (Panen, Normal, Retak, Pecah, Rata-rata HDP, Timeline Harian)
3. Efisiensi Pakan & FCR (Konsumsi Pakan kg, Estimasi Telur kg, Rasio FCR, Status)
4. Rekonsiliasi Stok Gudang (Saldo Awal, Masuk, Keluar, Rusak, Saldo Akhir, Status Defisit)
Serta detail stream transaksi harian untuk keperluan ekspor Excel & PDF.
"""

import calendar
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Dict, List
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.pengeluaran import Pengeluaran
from app.models.penjualan import Penjualan
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.pengeluaran_repository import PengeluaranRepository
from app.repositories.penjualan_repository import PenjualanRepository
from app.repositories.stok_repository import StokRepository
from app.services.analytics_calculator import calculate_fcr
from app.services.dashboard_calculator import calculate_pnl

NAMA_BULAN_INDONESIA = [
    "",
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
]


def assemble_monthly_report_data(db: Session, tahun: int, bulan: int) -> Dict[str, Any]:
    """
    Mengagregasikan seluruh pilar data bulanan peternakan untuk periode tahun dan bulan tertentu.
    Selalu menghasilkan struktur data yang lengkap dan deterministik, bahkan saat database kosong.
    """
    if not (1 <= bulan <= 12):
        raise ValueError(f"Bulan tidak valid: {bulan}. Harus bernilai 1 hingga 12.")

    # 1. Rentang Tanggal Kalender Bulan
    _, last_day = calendar.monthrange(tahun, bulan)
    start_date = date(tahun, bulan, 1)
    end_date = date(tahun, bulan, last_day)
    nama_bulan = NAMA_BULAN_INDONESIA[bulan]

    # 2. Pilar Finansial
    penjualan_summary = PenjualanRepository.get_summary(db, start_date=start_date, end_date=end_date)
    pengeluaran_summary = PengeluaranRepository.get_summary(db, start_date=start_date, end_date=end_date)

    tot_pendapatan_num = float(penjualan_summary.get("total_pendapatan") or 0.0)
    tot_pengeluaran_num = float(pengeluaran_summary.get("total_pengeluaran") or 0.0)

    pnl_data = calculate_pnl(
        total_pendapatan=Decimal(str(tot_pendapatan_num)),
        total_pengeluaran=Decimal(str(tot_pengeluaran_num)),
    )

    kategori_breakdown = pengeluaran_summary.get("breakdown_kategori") or {}

    finansial = {
        "total_pendapatan": tot_pendapatan_num,
        "total_pengeluaran": tot_pengeluaran_num,
        "laba_rugi_bersih": float(pnl_data["laba_rugi_bersih"]),
        "margin_persen": float(pnl_data["margin_persen"]),
        "status_pnl": pnl_data["status"],
        "breakdown_kategori": kategori_breakdown,
    }

    # 3. Pilar Produksi Telur & HDP
    normal, retak, pecah = AnalyticsRepository.get_egg_production_aggregate(
        db, start_date=start_date, end_date=end_date
    )
    total_panen = normal + retak + pecah

    raw_prod = AnalyticsRepository.get_egg_production_by_date_range(
        db, start_date=start_date, end_date=end_date
    )
    prod_map = {r[0]: (r[1], r[2], r[3]) for r in raw_prod}
    pop_map = AnalyticsRepository.get_active_coops_population_timeline(
        db, start_date=start_date, end_date=end_date
    )

    harian_produksi: List[Dict[str, Any]] = []
    hdp_sum = 0.0
    recorded_days_count = 0

    cur = start_date
    while cur <= end_date:
        pop_aktif = pop_map.get(cur, 0)
        if cur in prod_map:
            d_norm, d_ret, d_pec = prod_map[cur]
            d_tot = d_norm + d_ret + d_pec
            d_hdp = round((d_norm / pop_aktif) * 100, 2) if pop_aktif > 0 else 0.0
            harian_produksi.append({
                "tanggal": cur,
                "normal": d_norm,
                "retak": d_ret,
                "pecah": d_pec,
                "total": d_tot,
                "populasi_aktif": pop_aktif,
                "hdp_persen": d_hdp,
                "is_recorded": True,
                "keterangan": "Tercatat",
            })
            hdp_sum += d_hdp
            recorded_days_count += 1
        else:
            harian_produksi.append({
                "tanggal": cur,
                "normal": 0,
                "retak": 0,
                "pecah": 0,
                "total": 0,
                "populasi_aktif": pop_aktif,
                "hdp_persen": 0.0,
                "is_recorded": False,
                "keterangan": "Tidak Ada Data",
            })
        cur += timedelta(days=1)

    rata_rata_hdp = round(hdp_sum / recorded_days_count, 2) if recorded_days_count > 0 else 0.0

    produksi = {
        "total_normal": normal,
        "total_retak": retak,
        "total_pecah": pecah,
        "total_panen": total_panen,
        "rata_rata_hdp": rata_rata_hdp,
        "recorded_days": recorded_days_count,
        "total_days": last_day,
        "harian_produksi": harian_produksi,
    }

    # 4. Pilar Efisiensi Pakan & FCR
    total_kg_pakan = AnalyticsRepository.get_feed_consumption_kg(
        db, start_date=start_date, end_date=end_date
    )
    total_butir_layak = normal + retak
    fcr_data = calculate_fcr(
        total_kg_pakan=total_kg_pakan,
        total_butir_telur=total_butir_layak,
        bobot_per_butir_kg=settings.DEFAULT_BOBOT_BUTIR_KG,
    )

    fcr_analytics = {
        "total_kg_pakan": fcr_data["total_kg_pakan"],
        "total_butir_telur": fcr_data["total_butir_telur"],
        "total_kg_telur": fcr_data["total_kg_telur"],
        "fcr": fcr_data["fcr"],
        "status_efisiensi": fcr_data["status_efisiensi"],
        "benchmark_standar": "2.10 - 2.35",
    }

    # 5. Pilar Rekonsiliasi Stok Gudang
    # Saldo awal = kumulatif layak jual sebelum start_date dikurangi kumulatif penjualan sebelum start_date
    day_before = start_date - timedelta(days=1)
    p_norm_prev, p_ret_prev, _ = StokRepository.get_aggregate_produksi(db, up_to_date=day_before)
    s_terjual_prev = StokRepository.get_aggregate_penjualan(db, up_to_date=day_before)
    saldo_awal = (p_norm_prev + p_ret_prev) - s_terjual_prev

    masuk_layak = normal + retak
    keluar_terjual = int(penjualan_summary.get("total_butir") or 0)
    rusak_pecah = pecah
    saldo_akhir = saldo_awal + masuk_layak - keluar_terjual

    stok_reconciliation = {
        "saldo_awal": saldo_awal,
        "total_masuk_layak": masuk_layak,
        "total_keluar_terjual": keluar_terjual,
        "total_rusak_pecah": rusak_pecah,
        "saldo_akhir": saldo_akhir,
        "is_defisit": saldo_akhir < 0,
        "status": "defisit" if saldo_akhir < 0 else ("aman" if saldo_akhir >= 300 else "tipis"),
    }

    # 6. Stream Detail Transaksi (Penjualan & Pengeluaran)
    penjualan_models = (
        db.query(Penjualan)
        .filter(Penjualan.tanggal >= start_date, Penjualan.tanggal <= end_date)
        .order_by(Penjualan.tanggal.asc(), Penjualan.id.asc())
        .all()
    )
    detail_penjualan = [
        {
            "tanggal": p.tanggal,
            "pembeli": p.pembeli,
            "satuan": p.satuan_jual.value if hasattr(p.satuan_jual, "value") else str(p.satuan_jual),
            "kuantitas": p.kuantitas,
            "harga_satuan": float(p.harga_satuan),
            "total": float(p.total),
            "jumlah_butir": p.jumlah_butir,
        }
        for p in penjualan_models
    ]

    pengeluaran_models = (
        db.query(Pengeluaran)
        .filter(Pengeluaran.tanggal >= start_date, Pengeluaran.tanggal <= end_date)
        .order_by(Pengeluaran.tanggal.asc(), Pengeluaran.id.asc())
        .all()
    )
    detail_pengeluaran = [
        {
            "tanggal": exp.tanggal,
            "kategori": exp.kategori.value if hasattr(exp.kategori, "value") else str(exp.kategori),
            "deskripsi": exp.keterangan or "-",
            "jumlah_kg": float(exp.jumlah_kg) if exp.jumlah_kg is not None else None,
            "nominal": float(exp.nominal),
        }
        for exp in pengeluaran_models
    ]

    return {
        "tahun": tahun,
        "bulan": bulan,
        "nama_bulan": nama_bulan,
        "periode_label": f"{nama_bulan} {tahun}",
        "start_date": start_date,
        "end_date": end_date,
        "tanggal_cetak": date.today(),
        "finansial": finansial,
        "produksi": produksi,
        "fcr": fcr_analytics,
        "stok": stok_reconciliation,
        "detail_penjualan": detail_penjualan,
        "detail_pengeluaran": detail_pengeluaran,
    }
