"""
Domain Logic Layer: Analytics Calculator (Pure Functions)

Modul kalkulasi murni terisolasi dari database, ORM, framework HTTP, dan I/O eksternal.
Menyediakan fungsi deterministik untuk:
1. Perhitungan Feed Conversion Ratio (FCR) dan evaluasi efisiensi pakan peternakan layer komersial.
2. Normalisasi deret waktu kalender 30 hari tanpa jeda (zero-filling date sequence).
"""

from datetime import date
from typing import Any, Dict


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
