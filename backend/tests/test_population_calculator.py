from datetime import date
import pytest

from app.services.population_calculator import (
    build_mortality_prefix_sum,
    get_effective_population,
    calculate_hdp,
)


class TestPopulationCalculator:
    """
    Fast, pure in-memory unit tests untuk kalkulator prefix sum mortalitas dan populasi historis efektif.
    Tidak memerlukan I/O, database, atau mocking.
    """

    def test_build_prefix_sum_empty(self):
        """Uji prefix sum dengan input kosong ([])."""
        result = build_mortality_prefix_sum([])
        assert result == []

    def test_build_prefix_sum_single_entry(self):
        """Uji prefix sum dengan 1 record kematian tunggal."""
        mortalities = [(date(2026, 8, 10), 15)]
        result = build_mortality_prefix_sum(mortalities)
        assert result == [(date(2026, 8, 10), 15)]

    def test_build_prefix_sum_merge_same_date(self):
        """Uji penggabungan multiple kematian pada tanggal yang sama."""
        mortalities = [
            (date(2026, 8, 10), 5),
            (date(2026, 8, 10), 10),
            (date(2026, 8, 15), 20),
            (date(2026, 8, 10), 3),
        ]
        result = build_mortality_prefix_sum(mortalities)
        # Tanggal 10: 5 + 10 + 3 = 18; Tanggal 15: 18 + 20 = 38
        assert result == [
            (date(2026, 8, 10), 18),
            (date(2026, 8, 15), 38),
        ]

    def test_build_prefix_sum_out_of_order_input(self):
        """Uji list yang belum terurut agar otomatis terurut tanggal kronologis menaik."""
        mortalities = [
            (date(2026, 8, 20), 10),
            (date(2026, 8, 5), 5),
            (date(2026, 8, 12), 8),
        ]
        result = build_mortality_prefix_sum(mortalities)
        assert result == [
            (date(2026, 8, 5), 5),
            (date(2026, 8, 12), 13),
            (date(2026, 8, 20), 23),
        ]

    def test_get_effective_population_empty_prefix_sum(self):
        """Uji jika belum ada kematian sama sekali, populasi sama dengan jumlah_awal."""
        jumlah_awal = 1000
        prefix_sum = []
        pop = get_effective_population(jumlah_awal, prefix_sum, date(2026, 8, 15))
        assert pop == 1000

    def test_get_effective_population_before_first_mortality(self):
        """Uji query tanggal sebelum tanggal kematian pertama (populasi = jumlah_awal)."""
        jumlah_awal = 500
        prefix_sum = [
            (date(2026, 8, 10), 20),
            (date(2026, 8, 20), 50),
        ]
        # Query tanggal 5 (sebelum 10)
        pop = get_effective_population(jumlah_awal, prefix_sum, date(2026, 8, 5))
        assert pop == 500

    def test_get_effective_population_exact_mortality_date(self):
        """Uji query tanggal tepat di hari kematian (mortalitas.tanggal <= target_date)."""
        jumlah_awal = 500
        prefix_sum = [
            (date(2026, 8, 10), 20),
            (date(2026, 8, 20), 50),
        ]
        # Tepat tanggal 10: 500 - 20 = 480
        pop = get_effective_population(jumlah_awal, prefix_sum, date(2026, 8, 10))
        assert pop == 480

        # Tepat tanggal 20: 500 - 50 = 450
        pop = get_effective_population(jumlah_awal, prefix_sum, date(2026, 8, 20))
        assert pop == 450

    def test_get_effective_population_between_mortality_dates(self):
        """Uji query tanggal di antara dua tanggal peristiwa kematian."""
        jumlah_awal = 500
        prefix_sum = [
            (date(2026, 8, 10), 20),
            (date(2026, 8, 20), 50),
        ]
        # Tanggal 15 (di antara 10 dan 20): masih 500 - 20 = 480
        pop = get_effective_population(jumlah_awal, prefix_sum, date(2026, 8, 15))
        assert pop == 480

    def test_get_effective_population_after_all_mortalities(self):
        """Uji query tanggal jauh setelah seluruh rentetan peristiwa kematian."""
        jumlah_awal = 500
        prefix_sum = [
            (date(2026, 8, 10), 20),
            (date(2026, 8, 20), 50),
        ]
        # Tanggal 30: 500 - 50 = 450
        pop = get_effective_population(jumlah_awal, prefix_sum, date(2026, 8, 30))
        assert pop == 450

    def test_get_effective_population_exhausted_to_zero(self):
        """Uji batas jika kematian akumulatif melebihi jumlah awal (tidak boleh minus)."""
        jumlah_awal = 50
        prefix_sum = [
            (date(2026, 8, 10), 30),
            (date(2026, 8, 20), 60),  # Akumulasi 60 > 50
        ]
        pop = get_effective_population(jumlah_awal, prefix_sum, date(2026, 8, 25))
        assert pop == 0

    def test_calculate_hdp_normal(self):
        """Uji kalkulasi HDP normal dan pembulatan desimal."""
        # 850 butir / 1000 ekor = 85.0%
        assert calculate_hdp(850, 1000) == 85.0
        # 110 butir / 120 ekor = 91.6666... -> 91.67%
        assert calculate_hdp(110, 120) == 91.67
        # 90 butir / 110 ekor = 81.8181... -> 81.82%
        assert calculate_hdp(90, 110) == 81.82

    def test_calculate_hdp_zero_division_protection(self):
        """Uji proteksi zero division jika populasi 0 atau negatif."""
        assert calculate_hdp(850, 0) == 0.0
        assert calculate_hdp(850, -10) == 0.0
        assert calculate_hdp(0, 1000) == 0.0
        assert calculate_hdp(None, 1000) == 0.0
        assert calculate_hdp(850, None) == 0.0
