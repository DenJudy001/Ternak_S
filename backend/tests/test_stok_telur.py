"""
Integration tests for Stok Telur API endpoints (T3.3)
"""

from datetime import date
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.core.database import Base, get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.kandang import Kandang
from app.models.produksi_telur import ProduksiTelur
from app.models.penjualan import Penjualan, SatuanJual


# Setup in-memory SQLite database
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


def test_stok_summary_empty_database(client):
    """
    Jika belum ada data produksi dan penjualan sama sekali,
    stok_tersedia = 0 dan status_stok = 'habis'.
    """
    response = client.get("/api/v1/stok-telur/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_produksi"] == 0
    assert data["total_normal"] == 0
    assert data["total_retak"] == 0
    assert data["total_pecah"] == 0
    assert data["total_rusak"] == 0
    assert data["total_layak_jual"] == 0
    assert data["total_terjual"] == 0
    assert data["stok_tersedia"] == 0
    assert data["tray"] == 0
    assert data["butir_eceran"] == 0
    assert data["estimasi_kg"] == 0.0
    assert data["status_stok"] == "habis"


def test_stok_summary_and_mutasi_full_flow(client, db_session):
    """
    Alur lengkap:
    - Buat kandang
    - Input produksi hari ke-1 (2026-03-01): 100 normal, 10 retak, 5 pecah
    - Input produksi hari ke-2 (2026-03-02): 80 normal, 5 retak, 2 pecah
    - Input penjualan hari ke-3 (2026-03-03): 50 butir
    - Verifikasi GET /api/v1/stok-telur/summary
    - Verifikasi GET /api/v1/stok-telur/mutasi
    """
    # 1. Setup Master Kandang
    kandang = Kandang(
        nama_kandang="Kandang Layer A",
        tanggal_mulai=date(2026, 1, 1),
        jumlah_awal=500,
        jumlah_saat_ini=500,
    )
    db_session.add(kandang)
    db_session.commit()
    db_session.refresh(kandang)

    # 2. Input Produksi 2 hari berbeda
    p1 = ProduksiTelur(
        kandang_id=kandang.id,
        tanggal=date(2026, 3, 1),
        jumlah_butir_normal=100,
        jumlah_butir_retak=10,
        jumlah_butir_pecah=5,
    )
    p2 = ProduksiTelur(
        kandang_id=kandang.id,
        tanggal=date(2026, 3, 2),
        jumlah_butir_normal=80,
        jumlah_butir_retak=5,
        jumlah_butir_pecah=2,
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    # 3. Input Penjualan
    penjualan = Penjualan(
        tanggal=date(2026, 3, 3),
        jumlah_butir=50,
        satuan_jual=SatuanJual.butir,
        harga_satuan=Decimal("2000.00"),
        total=Decimal("100000.00"),
        pembeli="Pak Joko",
    )
    db_session.add(penjualan)
    db_session.commit()

    # 4. Tembak Endpoint Summary
    res_summary = client.get("/api/v1/stok-telur/summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()

    # Total normal = 180, retak = 15, pecah = 7 -> total_produksi = 202
    assert summary["total_produksi"] == 202
    assert summary["total_normal"] == 180
    assert summary["total_retak"] == 15
    assert summary["total_pecah"] == 7
    assert summary["total_rusak"] == 7
    # Total layak jual = 180 + 15 = 195
    assert summary["total_layak_jual"] == 195
    assert summary["total_terjual"] == 50
    # Stok tersedia = 195 - 50 = 145
    assert summary["stok_tersedia"] == 145
    # 145 butir = 4 tray (120) + 25 butir
    assert summary["tray"] == 4
    assert summary["butir_eceran"] == 25
    # 145 * 0.06 = 8.7 kg
    assert summary["estimasi_kg"] == 8.7
    assert summary["status_stok"] == "aman"

    # 5. Tembak Endpoint Mutasi (Default: urutan terbaru di atas)
    res_mutasi = client.get("/api/v1/stok-telur/mutasi")
    assert res_mutasi.status_code == 200
    mutasi = res_mutasi.json()

    assert mutasi["total_records"] == 3
    items = mutasi["items"]

    # Record 0 (terbaru, 2026-03-03): Penjualan 50 butir
    assert items[0]["tanggal"] == "2026-03-03"
    assert items[0]["masuk_layak"] == 0
    assert items[0]["keluar_terjual"] == 50
    assert items[0]["saldo_akhir"] == 145
    assert items[0]["status_harian"] == "aman"

    # Record 1 (2026-03-02): Panen 85 layak (80 normal + 5 retak)
    assert items[1]["tanggal"] == "2026-03-02"
    assert items[1]["masuk_normal"] == 80
    assert items[1]["masuk_retak"] == 5
    assert items[1]["masuk_layak"] == 85
    assert items[1]["rusak_pecah"] == 2
    assert items[1]["keluar_terjual"] == 0
    assert items[1]["saldo_akhir"] == 195  # 110 + 85
    assert items[1]["status_harian"] == "aman"

    # Record 2 (tertua, 2026-03-01): Panen 110 layak (100 normal + 10 retak)
    assert items[2]["tanggal"] == "2026-03-01"
    assert items[2]["masuk_normal"] == 100
    assert items[2]["masuk_retak"] == 10
    assert items[2]["masuk_layak"] == 110
    assert items[2]["rusak_pecah"] == 5
    assert items[2]["keluar_terjual"] == 0
    assert items[2]["saldo_akhir"] == 110
    assert items[2]["status_harian"] == "aman"


def test_stok_mutasi_date_filter_with_saldo_awal(client, db_session):
    """
    Uji filter rentang tanggal pada mutasi:
    Memastikan saldo awal dari transaksi sebelumnya dihitung secara akurat.
    """
    kandang = Kandang(
        nama_kandang="Kandang B",
        tanggal_mulai=date(2026, 1, 1),
        jumlah_awal=200,
        jumlah_saat_ini=200,
    )
    db_session.add(kandang)
    db_session.commit()

    # Transaksi 2026-02-28 (sebelum filter rentang): Panen 100 normal
    p_old = ProduksiTelur(
        kandang_id=kandang.id,
        tanggal=date(2026, 2, 28),
        jumlah_butir_normal=100,
        jumlah_butir_retak=0,
        jumlah_butir_pecah=0,
    )
    # Transaksi 2026-03-05 (dalam filter): Panen 50 normal
    p_new = ProduksiTelur(
        kandang_id=kandang.id,
        tanggal=date(2026, 3, 5),
        jumlah_butir_normal=50,
        jumlah_butir_retak=0,
        jumlah_butir_pecah=0,
    )
    db_session.add_all([p_old, p_new])
    db_session.commit()

    # Filter dari 2026-03-01 s/d 2026-03-10
    res = client.get("/api/v1/stok-telur/mutasi?start_date=2026-03-01&end_date=2026-03-10")
    assert res.status_code == 200
    data = res.json()

    assert data["saldo_awal"] == 100
    assert data["total_records"] == 1
    item = data["items"][0]
    assert item["tanggal"] == "2026-03-05"
    assert item["masuk_layak"] == 50
    # Saldo akhir = saldo_awal 100 + masuk 50 = 150
    assert item["saldo_akhir"] == 150


def test_stok_mutasi_invalid_date_range(client):
    """
    Uji validasi jika start_date > end_date -> 400 Bad Request.
    """
    res = client.get("/api/v1/stok-telur/mutasi?start_date=2026-03-10&end_date=2026-03-01")
    assert res.status_code == 400
    assert "tidak boleh lebih besar" in res.json()["detail"]


def test_stok_summary_target_date_filter(client, db_session):
    """
    Uji filter target_date pada summary:
    Hanya mengakumulasikan produksi dan penjualan s/d target_date.
    """
    kandang = Kandang(
        nama_kandang="Kandang C",
        tanggal_mulai=date(2026, 1, 1),
        jumlah_awal=200,
        jumlah_saat_ini=200,
    )
    db_session.add(kandang)
    db_session.commit()

    # Hari 1: 50 butir
    p1 = ProduksiTelur(
        kandang_id=kandang.id,
        tanggal=date(2026, 3, 1),
        jumlah_butir_normal=50,
        jumlah_butir_retak=0,
        jumlah_butir_pecah=0,
    )
    # Hari 2: 70 butir
    p2 = ProduksiTelur(
        kandang_id=kandang.id,
        tanggal=date(2026, 3, 5),
        jumlah_butir_normal=70,
        jumlah_butir_retak=0,
        jumlah_butir_pecah=0,
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    # Query target_date = 2026-03-02 (hanya mencakup Hari 1)
    res = client.get("/api/v1/stok-telur/summary?target_date=2026-03-02")
    assert res.status_code == 200
    data = res.json()
    assert data["total_layak_jual"] == 50
    assert data["stok_tersedia"] == 50


def test_stok_deficit_detection(client, db_session):
    """
    Uji kondisi defisit di database:
    Penjualan 120 butir padahal panen hanya 100 butir layak -> stok -20 butir (defisit).
    """
    kandang = Kandang(
        nama_kandang="Kandang D",
        tanggal_mulai=date(2026, 1, 1),
        jumlah_awal=200,
        jumlah_saat_ini=200,
    )
    db_session.add(kandang)
    db_session.commit()

    p = ProduksiTelur(
        kandang_id=kandang.id,
        tanggal=date(2026, 3, 1),
        jumlah_butir_normal=100,
        jumlah_butir_retak=0,
        jumlah_butir_pecah=5,
    )
    jual = Penjualan(
        tanggal=date(2026, 3, 2),
        jumlah_butir=120,
        satuan_jual=SatuanJual.butir,
        harga_satuan=Decimal("2000.00"),
        total=Decimal("240000.00"),
    )
    db_session.add_all([p, jual])
    db_session.commit()

    res = client.get("/api/v1/stok-telur/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_layak_jual"] == 100
    assert data["total_terjual"] == 120
    assert data["stok_tersedia"] == -20
    assert data["status_stok"] == "defisit"
