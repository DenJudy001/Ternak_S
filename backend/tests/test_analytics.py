"""
Integration Tests for Analytics Endpoints (Ticket T4.2 & T4.3)

Menguji:
1. Endpoint GET /api/v1/analytics/fcr
2. Endpoint GET /api/v1/analytics/production-trend
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
from app.models.pengeluaran import Pengeluaran, KategoriPengeluaran
from app.models.produksi_telur import ProduksiTelur
from app.models.user import User


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
# 1. INTEGRATION TESTS: GET /api/v1/analytics/fcr
# =====================================================================

def test_get_fcr_analytics_success(client, db_session):
    # Setup Kandang
    kandang = Kandang(
        nama_kandang="Kandang Broiler Layer",
        tanggal_mulai=date(2026, 1, 1),
        jumlah_awal=1000,
        jumlah_saat_ini=1000,
        status=StatusKandang.aktif,
    )
    db_session.add(kandang)
    db_session.commit()

    # Setup Pengeluaran Pakan: 100 kg
    db_session.add(Pengeluaran(
        tanggal=date(2026, 3, 5),
        kategori=KategoriPengeluaran.pakan,
        nominal=Decimal("1200000.00"),
        jumlah_kg=Decimal("100.00"),
        keterangan="Konsentrat Layer 100kg",
        kandang_id=kandang.id,
    ))

    # Setup Produksi Telur: normal 780, retak 20 -> layak jual 800 butir (* 0.06 = 48 kg)
    db_session.add(ProduksiTelur(
        kandang_id=kandang.id,
        tanggal=date(2026, 3, 5),
        jumlah_butir_normal=780,
        jumlah_butir_retak=20,
        jumlah_butir_pecah=5,
    ))
    db_session.commit()

    response = client.get(
        "/api/v1/analytics/fcr?start_date=2026-03-01&end_date=2026-03-31"
    )
    assert response.status_code == 200
    data = response.json()

    assert data["total_kg_pakan"] == 100.0
    assert data["total_butir_telur"] == 800
    assert data["total_kg_telur"] == 48.0
    assert data["fcr"] == 2.08
    assert data["status_efisiensi"] == "sangat_efisien"
    assert data["benchmark_standar"] == "2.10 - 2.35"
    assert "prima" in data["keterangan"].lower()


def test_get_fcr_analytics_with_kandang_filter(client, db_session):
    kA = Kandang(
        nama_kandang="Kandang A",
        tanggal_mulai=date(2026, 1, 1),
        jumlah_awal=1000,
        jumlah_saat_ini=1000,
        status=StatusKandang.aktif,
    )
    kB = Kandang(
        nama_kandang="Kandang B",
        tanggal_mulai=date(2026, 1, 1),
        jumlah_awal=1000,
        jumlah_saat_ini=1000,
        status=StatusKandang.aktif,
    )
    db_session.add_all([kA, kB])
    db_session.commit()

    # Pakan: kA 60 kg, kB 100 kg
    db_session.add(Pengeluaran(
        tanggal=date(2026, 3, 10),
        kategori=KategoriPengeluaran.pakan,
        nominal=Decimal("600000.00"),
        jumlah_kg=Decimal("60.00"),
        kandang_id=kA.id,
    ))
    db_session.add(Pengeluaran(
        tanggal=date(2026, 3, 10),
        kategori=KategoriPengeluaran.pakan,
        nominal=Decimal("1000000.00"),
        jumlah_kg=Decimal("100.00"),
        kandang_id=kB.id,
    ))

    # Produksi: kA 500 butir, kB 500 butir
    db_session.add(ProduksiTelur(
        kandang_id=kA.id,
        tanggal=date(2026, 3, 10),
        jumlah_butir_normal=500,
        jumlah_butir_retak=0,
        jumlah_butir_pecah=0,
    ))
    db_session.add(ProduksiTelur(
        kandang_id=kB.id,
        tanggal=date(2026, 3, 10),
        jumlah_butir_normal=500,
        jumlah_butir_retak=0,
        jumlah_butir_pecah=0,
    ))
    db_session.commit()

    # Query spesifik kandang A -> hanya pakan kA (60 kg) dan telur kA (500 butir * 0.06 = 30 kg)
    # FCR = 60 / 30 = 2.0
    resA = client.get(
        f"/api/v1/analytics/fcr?start_date=2026-03-01&end_date=2026-03-31&kandang_id={kA.id}"
    )
    assert resA.status_code == 200
    dataA = resA.json()
    assert dataA["total_kg_pakan"] == 60.0
    assert dataA["total_butir_telur"] == 500
    assert dataA["fcr"] == 2.0


def test_get_fcr_analytics_invalid_date_range_throws_400(client):
    res = client.get(
        "/api/v1/analytics/fcr?start_date=2026-03-31&end_date=2026-03-01"
    )
    assert res.status_code == 400
    assert "tidak boleh lebih besar" in res.json()["detail"]


def test_get_fcr_analytics_kandang_not_found_throws_404(client):
    res = client.get(
        "/api/v1/analytics/fcr?start_date=2026-03-01&end_date=2026-03-31&kandang_id=9999"
    )
    assert res.status_code == 404
    assert "tidak ditemukan" in res.json()["detail"]


# =====================================================================
# 2. INTEGRATION TESTS: GET /api/v1/analytics/production-trend
# =====================================================================

def test_get_production_trend_success(client, db_session):
    kandang = Kandang(
        nama_kandang="Kandang Petelur 1",
        tanggal_mulai=date(2026, 1, 1),
        jumlah_awal=1000,
        jumlah_saat_ini=1000,
        status=StatusKandang.aktif,
    )
    db_session.add(kandang)
    db_session.commit()

    # Tambah entri panen pada 2 tanggal
    db_session.add(ProduksiTelur(
        kandang_id=kandang.id,
        tanggal=date(2026, 3, 10),
        jumlah_butir_normal=850,
        jumlah_butir_retak=20,
        jumlah_butir_pecah=5,
    ))
    db_session.add(ProduksiTelur(
        kandang_id=kandang.id,
        tanggal=date(2026, 3, 20),
        jumlah_butir_normal=920,
        jumlah_butir_retak=10,
        jumlah_butir_pecah=5,
    ))
    db_session.commit()

    end_d = date(2026, 3, 30)
    response = client.get(
        f"/api/v1/analytics/production-trend?days=30&end_date={end_d}"
    )
    assert response.status_code == 200
    data = response.json()

    # Validasi rentang dan jumlah titik kontinu
    assert data["start_date"] == str(end_d - timedelta(days=29))
    assert data["end_date"] == str(end_d)
    assert len(data["points"]) == 30

    # Validasi urutan tanggal kronologis menaik (ASC)
    dates = [p["tanggal"] for p in data["points"]]
    assert dates == sorted(dates)

    # Validasi metrik ringkasan
    assert data["total_butir_normal_30d"] == 850 + 920
    assert data["peak_hdp_persen"] == 92.0
    assert data["peak_hdp_tanggal"] == "2026-03-20"
    # Rata-rata dari 2 hari tercatat: (85.0 + 92.0) / 2 = 88.5%
    assert data["rata_rata_hdp"] == 88.5
