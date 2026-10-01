"""
Service Layer: Analytics Service (Imperative Shell)

Menghubungkan domain logic murni (analytics_calculator) dengan data access repository (AnalyticsRepository).
Mengelola validasi bisnis dan mengorkestrasi analitik FCR serta tren produksi 30 hari kontinu.
"""

from datetime import date
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.repositories.analytics_repository import AnalyticsRepository
from app.repositories.kandang_repository import KandangRepository
from app.services.analytics_calculator import calculate_fcr


class AnalyticsService:
    """
    Service orchestration untuk analitik performa peternakan (FCR).
    """

    @staticmethod
    def get_fcr_analytics(
        db: Session,
        start_date: date,
        end_date: date,
        kandang_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Menghitung dan mengevaluasi Feed Conversion Ratio (FCR) peternakan.
        Rasio: Total Kg Pakan / Total Kg Telur Layak Jual (Normal + Retak).
        """
        if start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tanggal mulai (start_date) tidak boleh lebih besar dari tanggal akhir (end_date).",
            )

        if kandang_id is not None:
            kandang = KandangRepository.get_by_id(db, kandang_id)
            if not kandang:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Kandang dengan ID {kandang_id} tidak ditemukan.",
                )

        # 1. Ambil konsumsi pakan dalam kg
        total_kg_pakan = AnalyticsRepository.get_feed_consumption_kg(
            db, start_date=start_date, end_date=end_date, kandang_id=kandang_id
        )

        # 2. Ambil agregat butir telur layak jual (normal + retak)
        normal, retak, _ = AnalyticsRepository.get_egg_production_aggregate(
            db, start_date=start_date, end_date=end_date, kandang_id=kandang_id
        )
        total_butir_telur = normal + retak

        # 3. Hitung FCR via pure domain calculator
        fcr_calc = calculate_fcr(
            total_kg_pakan=total_kg_pakan,
            total_butir_telur=total_butir_telur,
            bobot_per_butir_kg=settings.DEFAULT_BOBOT_BUTIR_KG,
        )

        status_efisiensi = fcr_calc["status_efisiensi"]
        if status_efisiensi == "sangat_efisien":
            keterangan = (
                "Konversi pakan sangat efisien (FCR <= 2.10). "
                "Manajemen pakan dan performa bertelur berada pada level prima."
            )
        elif status_efisiensi == "standar":
            keterangan = (
                "Konversi pakan berada pada standar industri layer komersial (2.11 - 2.35). "
                "Pertahankan kecukupan nutrisi dan manajemen kandang."
            )
        elif status_efisiensi == "boros":
            keterangan = (
                "Konversi pakan di atas ambang wajar (FCR > 2.35). "
                "Periksa potensi pakan tumpah/tercecer, infestasi hama pakan, atau penurunan kesehatan ayam."
            )
        else:
            keterangan = (
                "Data konsumsi pakan atau produksi telur pada periode terpilih belum mencukupi "
                "untuk menghitung rasio FCR."
            )

        return {
            "start_date": start_date,
            "end_date": end_date,
            "kandang_id": kandang_id,
            "total_kg_pakan": fcr_calc["total_kg_pakan"],
            "total_butir_telur": fcr_calc["total_butir_telur"],
            "total_kg_telur": fcr_calc["total_kg_telur"],
            "fcr": fcr_calc["fcr"],
            "status_efisiensi": status_efisiensi,
            "benchmark_standar": fcr_calc["benchmark_standar"],
            "keterangan": keterangan,
        }
