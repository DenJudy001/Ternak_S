"""
Domain Logic Layer: Analytics Calculator (Pure Functions)

Modul kalkulasi murni terisolasi dari database, ORM, framework HTTP, dan I/O eksternal.
Menyediakan fungsi deterministik untuk:
1. Perhitungan Feed Conversion Ratio (FCR) dan evaluasi efisiensi pakan peternakan layer komersial.
2. Normalisasi deret waktu kalender 30 hari tanpa jeda (zero-filling date sequence).
"""

from datetime import date, timedelta
from typing import Any, Dict, List


def calculate_fcr(
    total_kg_pakan: float,
    total_butir_telur: int,
    bobot_per_butir_kg: float = 0.06,
) -> Dict[str, Any]:
    """
    Menghitung Feed Conversion Ratio (FCR) peternakan ayam petelur.

    Formula:
    - total_kg_telur = total_butir_telur * bobot_per_butir_kg
    - FCR = round(total_kg_pakan / total_kg_telur, 2) jika total_kg_telur > 0 dan total_kg_pakan > 0, else 0.0
    - Evaluasi Efisiensi:
      - 'tidak_tersedia': jika total_kg_pakan <= 0 atau total_kg_telur <= 0
      - 'sangat_efisien': FCR <= 2.10
      - 'standar'       : 2.11 <= FCR <= 2.35
      - 'boros'         : FCR > 2.35
    """
    kg_pakan = max(0.0, float(total_kg_pakan or 0.0))
    butir_telur = max(0, int(total_butir_telur or 0))
    bobot_kg = float(bobot_per_butir_kg or 0.06)

    total_kg_telur = round(float(butir_telur) * bobot_kg, 2)

    if kg_pakan <= 0.0 or total_kg_telur <= 0.0:
        fcr = 0.0
        status_efisiensi = "tidak_tersedia"
    else:
        fcr = round(kg_pakan / total_kg_telur, 2)
        if fcr <= 2.10:
            status_efisiensi = "sangat_efisien"
        elif fcr <= 2.35:
            status_efisiensi = "standar"
        else:
            status_efisiensi = "boros"

    return {
        "fcr": fcr,
        "total_kg_pakan": round(kg_pakan, 2),
        "total_butir_telur": butir_telur,
        "total_kg_telur": total_kg_telur,
        "status_efisiensi": status_efisiensi,
        "benchmark_standar": "2.10 - 2.35",
    }


def generate_continuous_30d_series(
    start_date: date,
    end_date: date,
    production_map: Dict[date, Dict[str, int]],
    population_map: Dict[date, int],
) -> List[Dict[str, Any]]:
    """
    Menghasilkan deret kalender kontinu tanpa tanggal bolong (zero-filling date sequence)
    dari start_date sampai end_date (inklusif).

    Args:
        start_date: Tanggal awal deret.
        end_date: Tanggal akhir deret.
        production_map: Pemetaan tanggal -> dict {"normal": int, "retak": int, "pecah": int}.
        population_map: Pemetaan tanggal -> populasi aktif efektif (int).

    Returns:
        List of dict titik data harian berurutan tanggal ASC.
    """
    series: List[Dict[str, Any]] = []
    current_date = start_date

    while current_date <= end_date:
        populasi_aktif = max(0, int(population_map.get(current_date, 0)))

        if current_date in production_map:
            prod = production_map[current_date]
            normal = max(0, int(prod.get("normal", 0)))
            retak = max(0, int(prod.get("retak", 0)))
            pecah = max(0, int(prod.get("pecah", 0)))
            total_butir = normal + retak + pecah

            if populasi_aktif > 0:
                hdp_persen = round((float(normal) / float(populasi_aktif)) * 100.0, 2)
            else:
                hdp_persen = 0.0

            is_recorded = True
        else:
            normal = 0
            retak = 0
            pecah = 0
            total_butir = 0
            hdp_persen = 0.0
            is_recorded = False

        series.append({
            "tanggal": current_date,
            "butir_normal": normal,
            "butir_retak": retak,
            "butir_pecah": pecah,
            "total_butir": total_butir,
            "populasi_aktif": populasi_aktif,
            "hdp_persen": hdp_persen,
            "is_recorded": is_recorded,
        })

        current_date += timedelta(days=1)

    return series
