"""
Domain Logic Layer: Dashboard Calculator (Pure Functions)

Modul kalkulasi murni terisolasi dari database, ORM, framework HTTP, dan I/O eksternal.
Menyediakan fungsi deterministik untuk kalkulasi finansial PnL, evaluasi status performa HDP,
dan persentase agregasi HDP kumulatif farm.
"""

from decimal import Decimal
from typing import Any, Dict


def calculate_pnl(
    total_pendapatan: Decimal,
    total_pengeluaran: Decimal,
) -> Dict[str, Any]:
    """
    Menghitung Laba/Rugi Bersih dan Margin Keuntungan peternakan.

    Formula:
    - Laba/Rugi Bersih = total_pendapatan - total_pengeluaran
    - Margin Keuntungan (%) = (Laba/Rugi Bersih / total_pendapatan) * 100 jika total_pendapatan > 0, else 0.0
    - Status:
      - 'untung' jika laba_rugi_bersih > 0
      - 'rugi' jika laba_rugi_bersih < 0
      - 'impas' jika laba_rugi_bersih == 0
    """
    pendapatan = Decimal(str(total_pendapatan or 0))
    pengeluaran = Decimal(str(total_pengeluaran or 0))

    laba_rugi_bersih = pendapatan - pengeluaran

    if pendapatan > Decimal("0"):
        margin_persen = float(round((laba_rugi_bersih / pendapatan) * Decimal("100"), 2))
    else:
        margin_persen = 0.0

    if laba_rugi_bersih > Decimal("0"):
        status = "untung"
    elif laba_rugi_bersih < Decimal("0"):
        status = "rugi"
    else:
        status = "impas"

    return {
        "total_pendapatan": pendapatan,
        "total_pengeluaran": pengeluaran,
        "laba_rugi_bersih": laba_rugi_bersih,
        "margin_persen": margin_persen,
        "status": status,
    }


def evaluate_hdp_status(hdp_percentage: float) -> str:
    """
    Mengevaluasi status performa Hen-Day Production (HDP) peternakan.

    Kategori:
    - 'prima'   : HDP >= 85.0%
    - 'standar' : 75.0% <= HDP < 85.0%
    - 'rendah'  : HDP < 75.0%
    """
    val = float(hdp_percentage or 0.0)
    if val >= 85.0:
        return "prima"
    elif val >= 75.0:
        return "standar"
    else:
        return "rendah"


def aggregate_farm_hdp(
    total_butir_normal: int,
    total_populasi_efektif: int,
) -> float:
    """
    Menghitung agregat persentase Hen-Day Production (HDP) kumulatif seluruh peternakan.
    Memiliki proteksi pembagian nol (zero-division safe).

    Formula:
    - HDP% = (total_butir_normal / total_populasi_efektif) * 100.0 jika total_populasi_efektif > 0, else 0.0
    """
    populasi = int(total_populasi_efektif or 0)
    butir = int(total_butir_normal or 0)

    if populasi <= 0 or butir <= 0:
        return 0.0

    hdp = (float(butir) / float(populasi)) * 100.0
    return round(hdp, 2)
