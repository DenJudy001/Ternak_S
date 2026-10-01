"""
Unit Tests for Analytics Calculator Pure Functions (Ticket T4.2 & T4.3)
"""

from app.services.analytics_calculator import calculate_fcr


def test_calculate_fcr_sangat_efisien():
    # 100 kg pakan, 800 butir * 0.06 kg = 48.0 kg telur -> FCR = 100 / 48 = 2.08
    res = calculate_fcr(total_kg_pakan=100.0, total_butir_telur=800, bobot_per_butir_kg=0.06)
    assert res["fcr"] == 2.08
    assert res["total_kg_pakan"] == 100.0
    assert res["total_butir_telur"] == 800
    assert res["total_kg_telur"] == 48.0
    assert res["status_efisiensi"] == "sangat_efisien"
    assert res["benchmark_standar"] == "2.10 - 2.35"


def test_calculate_fcr_standar():
    # 110 kg pakan, 800 butir * 0.06 = 48.0 kg telur -> FCR = 110 / 48 = 2.29
    res = calculate_fcr(total_kg_pakan=110.0, total_butir_telur=800, bobot_per_butir_kg=0.06)
    assert res["fcr"] == 2.29
    assert res["status_efisiensi"] == "standar"


def test_calculate_fcr_boros():
    # 120 kg pakan, 800 butir * 0.06 = 48.0 kg telur -> FCR = 120 / 48 = 2.50
    res = calculate_fcr(total_kg_pakan=120.0, total_butir_telur=800, bobot_per_butir_kg=0.06)
    assert res["fcr"] == 2.50
    assert res["status_efisiensi"] == "boros"


def test_calculate_fcr_zero_division_safety():
    # Pakan 0
    res_zero_feed = calculate_fcr(total_kg_pakan=0.0, total_butir_telur=800)
    assert res_zero_feed["fcr"] == 0.0
    assert res_zero_feed["status_efisiensi"] == "tidak_tersedia"

    # Telur 0
    res_zero_eggs = calculate_fcr(total_kg_pakan=100.0, total_butir_telur=0)
    assert res_zero_eggs["fcr"] == 0.0
    assert res_zero_eggs["status_efisiensi"] == "tidak_tersedia"

    # Negatif atau None safe
    res_none = calculate_fcr(total_kg_pakan=-10.0, total_butir_telur=0)
    assert res_none["fcr"] == 0.0
    assert res_none["status_efisiensi"] == "tidak_tersedia"


def test_calculate_fcr_custom_egg_weight():
    # 100 kg pakan, 1000 butir * 0.05 kg = 50 kg telur -> FCR = 100 / 50 = 2.0
    res = calculate_fcr(total_kg_pakan=100.0, total_butir_telur=1000, bobot_per_butir_kg=0.05)
    assert res["fcr"] == 2.0
    assert res["total_kg_telur"] == 50.0
    assert res["status_efisiensi"] == "sangat_efisien"
