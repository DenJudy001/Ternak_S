"""
Service Layer: Stok Telur Service (Imperative Shell)

Menghubungkan data access repository dengan modul kalkulator murni stok_calculator.
Menjaga pemisahan tegas antara efek samping I/O (database) dan domain logic.
"""

from datetime import date, timedelta
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.repositories.stok_repository import StokRepository
from app.services.stok_calculator import (
    calculate_stok_summary,
    build_stok_ledger,
)


class StokService:
    """
    Service orchestration untuk kalkulasi stok telur dan pelacakan mutasi gudang.
    """

    @staticmethod
    def get_stok_ringkasan(
        db: Session, target_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Menghasilkan ringkasan stok telur on-the-fly hingga target_date (default keseluruhan).
        """
        normal, retak, pecah = StokRepository.get_aggregate_produksi(db, up_to_date=target_date)
        terjual = StokRepository.get_aggregate_penjualan(db, up_to_date=target_date)

        summary = calculate_stok_summary(
            total_normal=normal,
            total_retak=retak,
            total_pecah=pecah,
            total_terjual=terjual,
            bobot_butir_kg=settings.DEFAULT_BOBOT_BUTIR_KG,
        )
        summary["target_date"] = target_date
        return summary

    @staticmethod
    def get_stok_ledger_history(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Menyusun buku mutasi (ledger) aliran masuk/keluar stok telur dalam rentang tanggal.
        Menghitung saldo awal kumulatif sebelum start_date agar running balance akurat.
        Hasil dikembalikan dengan urutan kronologis terbalik (terbaru di atas).
        """
        if start_date and end_date and start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rentang tanggal tidak valid: start_date tidak boleh lebih besar dari end_date.",
            )

        # Hitung saldo awal terbawa sebelum start_date
        saldo_awal = 0
        if start_date:
            day_before = start_date - timedelta(days=1)
            p_normal, p_retak, _ = StokRepository.get_aggregate_produksi(db, up_to_date=day_before)
            s_terjual = StokRepository.get_aggregate_penjualan(db, up_to_date=day_before)
            saldo_awal = (p_normal + p_retak) - s_terjual

        raw_prod = StokRepository.get_daily_production_flow(
            db, start_date=start_date, end_date=end_date
        )
        raw_sales = StokRepository.get_daily_sales_flow(
            db, start_date=start_date, end_date=end_date
        )

        harian_produksi = [
            {"tanggal": r[0], "normal": r[1], "retak": r[2], "pecah": r[3]}
            for r in raw_prod
        ]
        harian_penjualan = [
            {"tanggal": r[0], "terjual": r[1]}
            for r in raw_sales
        ]

        # Bangun ledger kronologis menaik
        ledger_ascending = build_stok_ledger(
            harian_produksi=harian_produksi,
            harian_penjualan=harian_penjualan,
            saldo_awal=saldo_awal,
        )

        # Balik urutan: transaksi terbaru ditampilkan paling atas untuk kemudahan user audit
        ledger_descending = list(reversed(ledger_ascending))

        return {
            "start_date": start_date,
            "end_date": end_date,
            "saldo_awal": saldo_awal,
            "total_records": len(ledger_descending),
            "items": ledger_descending,
        }
