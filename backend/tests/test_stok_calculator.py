"""
Unit tests for pure domain logic layer: Stok Calculator (T3.3)
"""

from datetime import date
import pytest
from app.services.stok_calculator import (
    calculate_stok_summary,
    build_stok_ledger,
)


def test_calculate_stok_summary_standard_formula():
    """
    Uji formula standar:
    total_produksi = normal + retak + pecah
    total_rusak = pecah
    total_layak_jual = normal + retak
    stok_tersedia = total_layak_jual - total_terjual
    """
    res = calculate_stok_summary(
        total_normal=200,
        total_retak=20,
        total_pecah=10,
        total_terjual=80,
        bobot_butir_kg=0.06,
    )

    assert res["total_produksi"] == 230
    assert res["total_rusak"] == 10
    assert res["total_pecah"] == 10
    assert res["total_normal"] == 200
    assert res["total_retak"] == 20
    assert res["total_layak_jual"] == 220
    assert res["total_terjual"] == 80
    assert res["stok_tersedia"] == 140
    assert res["status_stok"] == "aman"
    # 140 butir = 4 tray (120) + 20 butir
    assert res["tray"] == 4
    assert res["butir_eceran"] == 20
    assert res["estimasi_kg"] == 8.4  # 140 * 0.06


def test_calculate_stok_tray_and_eceran_conversion():
    """
    Uji konversi tray dan sisa butir eceran:
    65 butir -> 2 tray + 5 butir
    30 butir -> 1 tray + 0 butir
    29 butir -> 0 tray + 29 butir
    """
    res_65 = calculate_stok_summary(
        total_normal=65, total_retak=0, total_pecah=0, total_terjual=0
    )
    assert res_65["tray"] == 2
    assert res_65["butir_eceran"] == 5

    res_30 = calculate_stok_summary(
        total_normal=30, total_retak=0, total_pecah=0, total_terjual=0
    )
    assert res_30["tray"] == 1
    assert res_30["butir_eceran"] == 0

    res_29 = calculate_stok_summary(
        total_normal=29, total_retak=0, total_pecah=0, total_terjual=0
    )
    assert res_29["tray"] == 0
    assert res_29["butir_eceran"] == 29


def test_calculate_stok_zero_boundary():
    """
    Uji batas: stok tepat 0 (semua telur layak habis terjual)
    """
    res = calculate_stok_summary(
        total_normal=100,
        total_retak=0,
        total_pecah=5,
        total_terjual=100,
        bobot_butir_kg=0.06,
    )
    assert res["total_layak_jual"] == 100
    assert res["stok_tersedia"] == 0
    assert res["tray"] == 0
    assert res["butir_eceran"] == 0
    assert res["estimasi_kg"] == 0.0
    assert res["status_stok"] == "habis"


def test_calculate_stok_status_tipis():
    """
    Uji status tipis: stok antara 1 dan 100 butir.
    """
    res_1 = calculate_stok_summary(
        total_normal=1, total_retak=0, total_pecah=0, total_terjual=0
    )
    assert res_1["status_stok"] == "tipis"

    res_100 = calculate_stok_summary(
        total_normal=100, total_retak=0, total_pecah=0, total_terjual=0
    )
    assert res_100["status_stok"] == "tipis"

    res_101 = calculate_stok_summary(
        total_normal=101, total_retak=0, total_pecah=0, total_terjual=0
    )
    assert res_101["status_stok"] == "aman"


def test_calculate_stok_deficit_underflow():
    """
    Uji underflow: penjualan tercatat lebih banyak dari akumulasi produksi
    layak jual (misal karena salah input kuantitas di lapangan).
    """
    res = calculate_stok_summary(
        total_normal=50,
        total_retak=10,
        total_pecah=5,
        total_terjual=80,  # Layak 60, terjual 80 -> minus 20
        bobot_butir_kg=0.06,
    )
    assert res["total_layak_jual"] == 60
    assert res["total_terjual"] == 80
    assert res["stok_tersedia"] == -20
    assert res["status_stok"] == "defisit"
    assert res["estimasi_kg"] == -1.2
    assert res["tray"] == 0
    assert res["butir_eceran"] == -20

    # Defisit lebih besar dari 1 tray (misal -65 butir)
    res_minus_65 = calculate_stok_summary(
        total_normal=0, total_retak=0, total_pecah=0, total_terjual=65
    )
    assert res_minus_65["stok_tersedia"] == -65
    assert res_minus_65["status_stok"] == "defisit"
    assert res_minus_65["tray"] == -2
    assert res_minus_65["butir_eceran"] == -5


def test_build_stok_ledger_empty():
    """
    Ledger kosong jika tidak ada data produksi maupun penjualan.
    """
    ledger = build_stok_ledger([], [], saldo_awal=0)
    assert ledger == []


def test_build_stok_ledger_chronological_flow_and_running_balance():
    """
    Uji rangkaian ledger kronologis dan running balance:
    - Hari 1 (2026-03-01): Panen 100 normal, 10 retak, 5 pecah (layak 110). Saldo akhir: 110.
    - Hari 2 (2026-03-02): Terjual 50 butir. Saldo akhir: 110 - 50 = 60.
    - Hari 3 (2026-03-03): Panen 90 normal, 5 retak (layak 95) DAN Terjual 40 butir.
      Perubahan netto: 95 - 40 = +55. Saldo akhir: 60 + 55 = 115.
    """
    harian_prod = [
        {"tanggal": date(2026, 3, 1), "normal": 100, "retak": 10, "pecah": 5},
        {"tanggal": date(2026, 3, 3), "normal": 90, "retak": 5, "pecah": 2},
    ]
    harian_sales = [
        {"tanggal": date(2026, 3, 2), "terjual": 50},
        {"tanggal": date(2026, 3, 3), "terjual": 40},
    ]

    ledger = build_stok_ledger(harian_prod, harian_sales, saldo_awal=0)

    assert len(ledger) == 3

    # Hari 1
    row1 = ledger[0]
    assert row1["tanggal"] == date(2026, 3, 1)
    assert row1["masuk_layak"] == 110
    assert row1["rusak_pecah"] == 5
    assert row1["keluar_terjual"] == 0
    assert row1["perubahan_netto"] == 110
    assert row1["saldo_akhir"] == 110
    assert row1["status_harian"] == "aman"

    # Hari 2
    row2 = ledger[1]
    assert row2["tanggal"] == date(2026, 3, 2)
    assert row2["masuk_layak"] == 0
    assert row2["keluar_terjual"] == 50
    assert row2["perubahan_netto"] == -50
    assert row2["saldo_akhir"] == 60
    assert row2["status_harian"] == "tipis"

    # Hari 3
    row3 = ledger[2]
    assert row3["tanggal"] == date(2026, 3, 3)
    assert row3["masuk_layak"] == 95
    assert row3["rusak_pecah"] == 2
    assert row3["keluar_terjual"] == 40
    assert row3["perubahan_netto"] == 55
    assert row3["saldo_akhir"] == 115
    assert row3["status_harian"] == "aman"


def test_build_stok_ledger_with_saldo_awal():
    """
    Uji ledger saat ada filter tanggal dan membawa saldo_awal dari periode sebelumnya.
    """
    harian_prod = [
        {"tanggal": date(2026, 3, 10), "normal": 50, "retak": 0, "pecah": 0},
    ]
    harian_sales = [
        {"tanggal": date(2026, 3, 10), "terjual": 80},
    ]

    # Dimulai dengan saldo awal 100 butir dari Februari
    ledger = build_stok_ledger(harian_prod, harian_sales, saldo_awal=100)

    assert len(ledger) == 1
    row = ledger[0]
    # saldo awal 100 + 50 - 80 = 70
    assert row["perubahan_netto"] == -30
    assert row["saldo_akhir"] == 70
    assert row["status_harian"] == "tipis"
