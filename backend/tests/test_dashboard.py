"""
Tests for Dashboard Executive Summary (Ticket T4.1)

Meliputi:
1. Unit Tests pure domain logic: calculate_pnl, evaluate_hdp_status, aggregate_farm_hdp
2. Integration Tests endpoint GET /api/v1/dashboard/summary:
   - Database kosong (zero safe)
   - Isolasi transaksi finansial bulanan MTD (anti-bocor)
   - Isolasi populasi multi-kandang & pengabaian kandang afkir
   - Keselarasan saldo stok telur dengan service T3.3
   - Penanganan fallback data panen saat pagi hari (belum ada entri hari ini)
"""

from datetime import date, timedelta
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.core.database import Base, get_db
from app.core.deps import get_current_user
from app.models.kandang import Kandang, StatusKandang
from app.models.mortalitas import Mortalitas
from app.models.pengeluaran import Pengeluaran, KategoriPengeluaran
from app.models.penjualan import Penjualan, SatuanJual
from app.models.produksi_telur import ProduksiTelur
from app.models.user import User
from app.services.dashboard_calculator import (
    aggregate_farm_hdp,
    calculate_pnl,
    evaluate_hdp_status,
)
from app.services.stok_service import StokService


# Setup SQLite In-Memory Database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    dummy_user = User(
        id=1,
        username="admin_test",
        hashed_password="hashed_secret",
        is_active=True,
    )

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_get_current_user():
        return dummy_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# =====================================================================
# 1. UNIT TESTS: PURE DOMAIN CALCULATOR
# =====================================================================

def test_calculate_pnl_surplus():
    res = calculate_pnl(Decimal("10000000"), Decimal("6000000"))
    assert res["laba_rugi_bersih"] == Decimal("4000000")
    assert res["margin_persen"] == 40.0
    assert res["status"] == "untung"


def test_calculate_pnl_deficit():
    res = calculate_pnl(Decimal("5000000"), Decimal("7000000"))
    assert res["laba_rugi_bersih"] == Decimal("-2000000")
    assert res["margin_persen"] == -40.0
    assert res["status"] == "rugi"


def test_calculate_pnl_break_even():
    res = calculate_pnl(Decimal("5000000"), Decimal("5000000"))
    assert res["laba_rugi_bersih"] == Decimal("0")
    assert res["margin_persen"] == 0.0
    assert res["status"] == "impas"


def test_calculate_pnl_zero_revenue_safe():
    # Menghindari ZeroDivisionError saat belum ada pendapatan sama sekali
    res = calculate_pnl(Decimal("0"), Decimal("2500000"))
    assert res["laba_rugi_bersih"] == Decimal("-2500000")
    assert res["margin_persen"] == 0.0
    assert res["status"] == "rugi"


def test_evaluate_hdp_status():
    assert evaluate_hdp_status(85.0) == "prima"
    assert evaluate_hdp_status(92.4) == "prima"
    assert evaluate_hdp_status(84.99) == "standar"
    assert evaluate_hdp_status(75.0) == "standar"
    assert evaluate_hdp_status(74.9) == "rendah"
    assert evaluate_hdp_status(0.0) == "rendah"


def test_aggregate_farm_hdp():
    # Normal: 850 butir dari 1000 ekor = 85.0%
    assert aggregate_farm_hdp(850, 1000) == 85.0
    # Zero population safe: populasi 0 -> 0.0%
    assert aggregate_farm_hdp(100, 0) == 0.0
    # Zero eggs: 0 butir -> 0.0%
    assert aggregate_farm_hdp(0, 1000) == 0.0


# =====================================================================
# 2. INTEGRATION TESTS: GET /api/v1/dashboard/summary
# =====================================================================

def test_dashboard_summary_empty_database(client):
    """
    Pada basis data yang belum memiliki data sama sekali, endpoint harus
    mengembalikan status 200 tanpa galat 500 dan nilai default yang aman.
    """
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200
    data = response.json()

    assert "tanggal_referensi" in data
    # HDP default
    hdp = data["hdp_hari_ini"]
    assert hdp["persentase"] == 0.0
    assert hdp["total_butir_normal"] == 0
    assert hdp["total_populasi_efektif"] == 0
    assert hdp["status_performa"] == "rendah"
    assert hdp["is_today_recorded"] is False
    assert hdp["tanggal_referensi_produksi"] is None

    # Keuangan default
    fin = data["keuangan_bulan_ini"]
    assert float(fin["total_pendapatan"]) == 0.0
    assert float(fin["total_pengeluaran"]) == 0.0
    assert float(fin["laba_rugi_bersih"]) == 0.0
    assert fin["margin_persen"] == 0.0
    assert fin["status"] == "impas"

    # Stok default
    stok = data["stok_gudang"]
    assert stok["stok_tersedia"] == 0
    assert stok["status_gudang"] == "habis"
    assert stok["is_underflow"] is False

    # Tren 7 hari default
    tren = data["tren_7_hari"]
    assert len(tren) == 7
    for item in tren:
        assert item["butir_produksi"] == 0
        assert item["butir_terjual"] == 0


def test_dashboard_summary_monthly_financial_isolation(client, db_session):
    """
    Uji isolasi periode bulanan: transaksi pada bulan lalu tidak boleh
    dihitung ke dalam kartu Laba/Rugi bulan ini (MTD).
    """
    today = date(2026, 3, 15)
    last_month = date(2026, 2, 20)

    # 1. Transaksi bulan lalu (Februari 2026)
    db_session.add(Penjualan(
        tanggal=last_month,
        jumlah_butir=1000,
        satuan_jual=SatuanJual.butir,
        harga_satuan=Decimal("2000.00"),
        total=Decimal("2000000.00"),
    ))
    db_session.add(Pengeluaran(
        tanggal=last_month,
        kategori=KategoriPengeluaran.pakan,
        nominal=Decimal("1500000.00"),
        keterangan="Pakan bulan lalu",
    ))

    # 2. Transaksi bulan ini (Maret 2026)
    db_session.add(Penjualan(
        tanggal=today,
        jumlah_butir=500,
        satuan_jual=SatuanJual.butir,
        harga_satuan=Decimal("2000.00"),
        total=Decimal("1000000.00"),
    ))
    db_session.add(Pengeluaran(
        tanggal=today,
        kategori=KategoriPengeluaran.operasional,
        nominal=Decimal("400000.00"),
        keterangan="Listrik bulan ini",
    ))
    db_session.commit()

    response = client.get(f"/api/v1/dashboard/summary?target_date={today}")
    assert response.status_code == 200
    data = response.json()

    fin = data["keuangan_bulan_ini"]
    # Hanya transaksi Maret: Pendapatan 1.000.000, Pengeluaran 400.000, Laba 600.000
    assert float(fin["total_pendapatan"]) == 1000000.0
    assert float(fin["total_pengeluaran"]) == 400000.0
    assert float(fin["laba_rugi_bersih"]) == 600000.0
    assert fin["margin_persen"] == 60.0
    assert fin["status"] == "untung"


def test_dashboard_summary_multi_kandang_and_afkir_isolation(client, db_session):
    """
    Uji integrasi populasi multi-kandang:
    - Kandang A (aktif, jumlah_awal 1000, mati 50 -> populasi 950)
    - Kandang B (afkir, jumlah_awal 500, mati 10 -> harus diabaikan)
    Populasi efektif dashboard harus 950 (bukan 950 + 490 = 1440).
    """
    target = date(2026, 3, 10)

    # Kandang Aktif
    kA = Kandang(
        nama_kandang="Kandang Alpha",
        tanggal_mulai=date(2026, 1, 1),
        jumlah_awal=1000,
        jumlah_saat_ini=1000,
        status=StatusKandang.aktif,
    )
    # Kandang Afkir
    kB = Kandang(
        nama_kandang="Kandang Beta Afkir",
        tanggal_mulai=date(2026, 1, 1),
        jumlah_awal=500,
        jumlah_saat_ini=500,
        status=StatusKandang.afkir,
    )
    db_session.add_all([kA, kB])
    db_session.commit()

    # Kematian pada kA dan kB
    db_session.add(Mortalitas(kandang_id=kA.id, tanggal=date(2026, 3, 5), jumlah=50))
    db_session.add(Mortalitas(kandang_id=kB.id, tanggal=date(2026, 3, 5), jumlah=10))

    # Produksi pada kA
    db_session.add(ProduksiTelur(
        kandang_id=kA.id,
        tanggal=target,
        jumlah_butir_normal=800,
        jumlah_butir_retak=10,
        jumlah_butir_pecah=5,
    ))
    db_session.commit()

    response = client.get(f"/api/v1/dashboard/summary?target_date={target}")
    assert response.status_code == 200
    data = response.json()

    hdp = data["hdp_hari_ini"]
    assert hdp["total_populasi_efektif"] == 950  # Kandang B tidak dihitung
    assert hdp["total_butir_normal"] == 800
    # 800 / 950 * 100 = 84.21% -> standar
    assert hdp["persentase"] == 84.21
    assert hdp["status_performa"] == "standar"
    assert hdp["is_today_recorded"] is True


def test_dashboard_summary_today_unrecorded_fallback(client, db_session):
    """
    Uji skenario pagi hari:
    Operator belum memasukkan entri panen untuk hari ini (2026-03-10).
    Sistem harus menandai is_today_recorded = False dan menampilkan data produksi
    terakhir (2026-03-09) sebagai referensi kontekstual.
    """
    today = date(2026, 3, 10)
    yesterday = date(2026, 3, 9)

    k = Kandang(
        nama_kandang="Kandang Utama",
        tanggal_mulai=date(2026, 1, 1),
        jumlah_awal=1000,
        jumlah_saat_ini=1000,
        status=StatusKandang.aktif,
    )
    db_session.add(k)
    db_session.commit()

    # Produksi kemarin
    db_session.add(ProduksiTelur(
        kandang_id=k.id,
        tanggal=yesterday,
        jumlah_butir_normal=890,
        jumlah_butir_retak=10,
        jumlah_butir_pecah=5,
    ))
    db_session.commit()

    response = client.get(f"/api/v1/dashboard/summary?target_date={today}")
    assert response.status_code == 200
    data = response.json()

    hdp = data["hdp_hari_ini"]
    assert hdp["is_today_recorded"] is False
    assert hdp["tanggal_referensi_produksi"] == str(yesterday)
    assert hdp["total_butir_normal"] == 890
    assert hdp["persentase"] == 89.0
    assert hdp["status_performa"] == "prima"


def test_dashboard_summary_stock_consistency(client, db_session):
    """
    Uji keselarasan stok:
    Pastikan metrik stok gudang pada dashboard identik dengan output dari layanan StokService (T3.3).
    """
    tgl = date(2026, 3, 5)

    k = Kandang(
        nama_kandang="Kandang Stok",
        tanggal_mulai=date(2026, 1, 1),
        jumlah_awal=1000,
        jumlah_saat_ini=1000,
        status=StatusKandang.aktif,
    )
    db_session.add(k)
    db_session.commit()

    # Produksi: normal 500, retak 20, pecah 10 -> layak jual 520
    db_session.add(ProduksiTelur(
        kandang_id=k.id,
        tanggal=tgl,
        jumlah_butir_normal=500,
        jumlah_butir_retak=20,
        jumlah_butir_pecah=10,
    ))
    # Penjualan: 120 butir
    db_session.add(Penjualan(
        tanggal=tgl,
        jumlah_butir=120,
        satuan_jual=SatuanJual.butir,
        harga_satuan=Decimal("2000.00"),
        total=Decimal("240000.00"),
    ))
    db_session.commit()

    # Hitung via StokService
    expected_stok = StokService.get_stok_ringkasan(db_session, target_date=tgl)

    response = client.get(f"/api/v1/dashboard/summary?target_date={tgl}")
    assert response.status_code == 200
    data = response.json()

    stok = data["stok_gudang"]
    assert stok["stok_tersedia"] == expected_stok["stok_tersedia"]  # 400 butir
    assert stok["status_gudang"] == expected_stok["status_stok"]      # aman
    assert stok["estimasi_kg"] == float(expected_stok["estimasi_kg"]) # 24.0 kg
    assert "tray" in stok["format_tray"]
