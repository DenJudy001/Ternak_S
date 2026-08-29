import bisect
from datetime import date
from typing import List, Tuple, Dict, Optional


def build_mortality_prefix_sum(mortalities: List[Tuple[date, int]]) -> List[Tuple[date, int]]:
    """
    Membangun deret prefix sum kumulatif kematian ayam yang terurut kronologis menaik.
    Menggabungkan multiple record jika terdapat lebih dari satu pencatatan kematian pada tanggal yang sama.

    Args:
        mortalities: List tuple (tanggal_kematian, jumlah_kematian).

    Returns:
        List tuple (tanggal, total_kumulatif_kematian_sampai_tanggal_ini) terurut tanggal ASC.
    """
    if not mortalities:
        return []

    # 1. Agregasi kematian pada tanggal yang sama
    daily_counts: Dict[date, int] = {}
    for tgl, jumlah in mortalities:
        if jumlah and jumlah > 0:
            daily_counts[tgl] = daily_counts.get(tgl, 0) + jumlah

    if not daily_counts:
        return []

    # 2. Bangun deret prefix sum kumulatif terurut kronologis menaik
    sorted_dates = sorted(daily_counts.keys())
    prefix_sum: List[Tuple[date, int]] = []
    running_total = 0

    for tgl in sorted_dates:
        running_total += daily_counts[tgl]
        prefix_sum.append((tgl, running_total))

    return prefix_sum


def get_effective_population(
    jumlah_awal: int,
    prefix_sum: List[Tuple[date, int]],
    target_date: date
) -> int:
    """
    Menghitung populasi ayam hidup efektif pada tanggal target tertentu (Time-Travel).
    Menggunakan binary search O(log M) untuk mencari akumulasi kematian sampai target_date (tanggal <= target_date).

    Formula:
        Populasi Efektif = max(0, jumlah_awal - total_kumulatif_kematian_sampai_target_date)

    Args:
        jumlah_awal: Populasi awal bibit saat kandang pertama kali disetup.
        prefix_sum: Deret prefix sum kumulatif kematian dari build_mortality_prefix_sum.
        target_date: Tanggal pencatatan produksi telur yang ingin dihitung populasinya.

    Returns:
        Jumlah populasi ayam hidup pada tanggal target (>= 0).
    """
    if jumlah_awal is None or jumlah_awal <= 0:
        return 0

    if not prefix_sum or target_date is None:
        return max(0, jumlah_awal)

    # Ekstrak daftar tanggal untuk binary search
    dates = [item[0] for item in prefix_sum]

    # bisect_right menemukan posisi elemen pertama yang > target_date
    idx = bisect.bisect_right(dates, target_date)

    if idx == 0:
        # target_date terjadi sebelum peristiwa kematian pertama
        accumulated_mortality = 0
    else:
        # idx - 1 adalah peristiwa kematian terakhir yang tanggalnya <= target_date
        accumulated_mortality = prefix_sum[idx - 1][1]

    effective_pop = jumlah_awal - accumulated_mortality
    return max(0, effective_pop)


def calculate_hdp(jumlah_butir_normal: int, populasi_efektif: int) -> float:
    """
    Menghitung persentase Hen Day Production (HDP%):
    HDP% = (jumlah_butir_normal / populasi_efektif) * 100

    Menangani proteksi ZeroDivisionError jika populasi_efektif <= 0 dan membulatkan ke 2 desimal.

    Args:
        jumlah_butir_normal: Jumlah butir telur berkualitas normal.
        populasi_efektif: Populasi ayam hidup pada tanggal terkait.

    Returns:
        Persentase HDP (float) dibulatkan 2 desimal.
    """
    if (
        populasi_efektif is None
        or populasi_efektif <= 0
        or jumlah_butir_normal is None
        or jumlah_butir_normal <= 0
    ):
        return 0.0

    return round((jumlah_butir_normal / populasi_efektif) * 100, 2)
