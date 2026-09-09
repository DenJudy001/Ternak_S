"""
Domain Logic Layer: Stok Telur Calculator (Pure Functions)

Modul ini murni berisi logika matematika & domain untuk menghitung stok telur
secara dinamis (on-the-fly) serta merangkai deret ledger mutasi harian.
Bebas dari dependensi database, ORM, framework HTTP, dan I/O eksternal.
"""

from datetime import date
from typing import Any, Dict, List, Union


def calculate_stok_summary(
    total_normal: int,
    total_retak: int,
    total_pecah: int,
    total_terjual: int,
    bobot_butir_kg: float = 0.06,
) -> Dict[str, Any]:
    """
    Menghitung ringkasan stok telur on-the-fly dari agregat panen dan penjualan.

    Formula:
    - total_produksi = normal + retak + pecah
    - total_rusak = pecah (afkir panen)
    - total_layak_jual = total_produksi - total_rusak = normal + retak
    - stok_tersedia = total_layak_jual - total_terjual
    - tray = stok // 30, butir_eceran = stok % 30
    - estimasi_kg = round(stok * bobot_butir_kg, 2)
    - status_stok = 'aman' (>100) | 'tipis' (1..100) | 'habis' (==0) | 'defisit' (<0)
    """
    n_normal = max(0, int(total_normal or 0))
    n_retak = max(0, int(total_retak or 0))
    n_pecah = max(0, int(total_pecah or 0))
    n_terjual = max(0, int(total_terjual or 0))

    total_produksi = n_normal + n_retak + n_pecah
    total_rusak = n_pecah
    total_layak_jual = n_normal + n_retak
    stok_tersedia = total_layak_jual - n_terjual

    # Konversi fisik (tray & butir eceran)
    if stok_tersedia >= 0:
        tray = stok_tersedia // 30
        butir_eceran = stok_tersedia % 30
    else:
        abs_stok = abs(stok_tersedia)
        tray = -(abs_stok // 30)
        butir_eceran = -(abs_stok % 30)

    estimasi_kg = round(float(stok_tersedia) * float(bobot_butir_kg), 2)

    # Indikator kesehatan stok
    if stok_tersedia > 100:
        status_stok = "aman"
    elif stok_tersedia >= 1:
        status_stok = "tipis"
    elif stok_tersedia == 0:
        status_stok = "habis"
    else:
        status_stok = "defisit"

    return {
        "total_produksi": total_produksi,
        "total_normal": n_normal,
        "total_retak": n_retak,
        "total_pecah": n_pecah,
        "total_rusak": total_rusak,
        "total_layak_jual": total_layak_jual,
        "total_terjual": n_terjual,
        "stok_tersedia": stok_tersedia,
        "tray": tray,
        "butir_eceran": butir_eceran,
        "estimasi_kg": estimasi_kg,
        "status_stok": status_stok,
    }


def build_stok_ledger(
    harian_produksi: List[Dict[str, Any]],
    harian_penjualan: List[Dict[str, Any]],
    saldo_awal: int = 0,
) -> List[Dict[str, Any]]:
    """
    Menggabungkan aliran produksi harian dan penjualan harian ke dalam ledger
    mutasi gudang dengan running balance kumulatif.

    :param harian_produksi: List dict [{'tanggal': date, 'normal': int, 'retak': int, 'pecah': int}]
    :param harian_penjualan: List dict [{'tanggal': date, 'terjual': int}]
    :param saldo_awal: Saldo kumulatif sebelum tanggal pertama dalam rentang filter.
    :return: List dict ledger berurutan kronologis menaik (ascending).
    """
    prod_map: Dict[Union[date, str], Dict[str, int]] = {}
    for p in harian_produksi:
        d = p["tanggal"]
        prod_map[d] = {
            "normal": int(p.get("normal", 0) or 0),
            "retak": int(p.get("retak", 0) or 0),
            "pecah": int(p.get("pecah", 0) or 0),
        }

    sales_map: Dict[Union[date, str], int] = {}
    for s in harian_penjualan:
        d = s["tanggal"]
        sales_map[d] = int(s.get("terjual", 0) or 0)

    # Gabungkan semua tanggal unik dan urutkan secara kronologis (ascending)
    all_dates = sorted(list(set(list(prod_map.keys()) + list(sales_map.keys()))))

    ledger: List[Dict[str, Any]] = []
    current_balance = int(saldo_awal)

    for d in all_dates:
        p_data = prod_map.get(d, {"normal": 0, "retak": 0, "pecah": 0})
        masuk_normal = p_data["normal"]
        masuk_retak = p_data["retak"]
        masuk_layak = masuk_normal + masuk_retak
        rusak_pecah = p_data["pecah"]
        keluar_terjual = sales_map.get(d, 0)

        perubahan_netto = masuk_layak - keluar_terjual
        saldo_akhir = current_balance + perubahan_netto

        if saldo_akhir > 100:
            status_harian = "aman"
        elif saldo_akhir >= 1:
            status_harian = "tipis"
        elif saldo_akhir == 0:
            status_harian = "habis"
        else:
            status_harian = "defisit"

        ledger.append({
            "tanggal": d,
            "masuk_normal": masuk_normal,
            "masuk_retak": masuk_retak,
            "masuk_layak": masuk_layak,
            "rusak_pecah": rusak_pecah,
            "keluar_terjual": keluar_terjual,
            "perubahan_netto": perubahan_netto,
            "saldo_akhir": saldo_akhir,
            "status_harian": status_harian,
        })

        current_balance = saldo_akhir

    return ledger
