import pytest
from datetime import date
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.core.database import Base, get_db
from app.core.deps import get_current_user
from app.models.user import User
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


def test_create_penjualan_butir_unit(client):
    payload = {
        "tanggal": "2026-03-01",
        "satuan_jual": "butir",
        "kuantitas": 150,
        "harga_satuan": 2000.0,
        "pembeli": "Warung Bu Siti",
    }
    response = client.post("/api/v1/penjualan/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["satuan_jual"] == "butir"
    assert data["jumlah_butir"] == 150
    assert data["harga_satuan"] == 2000.0
    assert data["total"] == 300000.0
    assert data["pembeli"] == "Warung Bu Siti"
    assert data["created_at"] is not None


def test_create_penjualan_tray_conversion(client):
    # 5 tray * 30 butir = 150 butir fisik
    payload = {
        "tanggal": "2026-03-02",
        "satuan_jual": "tray",
        "kuantitas": 5,
        "harga_satuan": 55000.0,
        "pembeli": "Toko Berkah Telur",
    }
    response = client.post("/api/v1/penjualan/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["jumlah_butir"] == 150
    assert data["total"] == 275000.0


def test_create_penjualan_kg_conversion_default(client):
    # 6.0 kg / 0.06 kg per butir = 100 butir fisik
    payload = {
        "tanggal": "2026-03-03",
        "satuan_jual": "kg",
        "kuantitas": 6.0,
        "harga_satuan": 28000.0,
        "pembeli": "Agen Telur Jaya",
    }
    response = client.post("/api/v1/penjualan/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["jumlah_butir"] == 100
    assert data["total"] == 168000.0


def test_create_penjualan_kg_manual_override(client):
    # 6.0 kg tetapi ada override manual 98 butir
    payload = {
        "tanggal": "2026-03-03",
        "satuan_jual": "kg",
        "kuantitas": 6.0,
        "harga_satuan": 28000.0,
        "pembeli": "Agen Telur Jaya",
        "jumlah_butir_manual": 98,
    }
    response = client.post("/api/v1/penjualan/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["jumlah_butir"] == 98
    assert data["total"] == 168000.0


def test_create_penjualan_invalid_inputs(client):
    # Kuantitas <= 0
    res_kuantitas = client.post("/api/v1/penjualan/", json={
        "tanggal": "2026-03-01",
        "satuan_jual": "butir",
        "kuantitas": 0,
        "harga_satuan": 2000.0,
    })
    assert res_kuantitas.status_code == 422

    # Harga satuan <= 0
    res_harga = client.post("/api/v1/penjualan/", json={
        "tanggal": "2026-03-01",
        "satuan_jual": "butir",
        "kuantitas": 10,
        "harga_satuan": -1000.0,
    })
    assert res_harga.status_code == 422


def test_update_penjualan_recomputation(client):
    create_res = client.post("/api/v1/penjualan/", json={
        "tanggal": "2026-03-01",
        "satuan_jual": "butir",
        "kuantitas": 100,
        "harga_satuan": 2000.0,
        "pembeli": "Pak Budi",
    })
    entry_id = create_res.json()["id"]

    # Koreksi harga dan kuantitas (ganti ke 200 butir @ Rp 2.200)
    patch_res = client.patch(f"/api/v1/penjualan/{entry_id}", json={
        "kuantitas": 200,
        "harga_satuan": 2200.0,
        "pembeli": "Pak Budi Revisi",
    })
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["jumlah_butir"] == 200
    assert updated["harga_satuan"] == 2200.0
    assert updated["total"] == 440000.0
    assert updated["pembeli"] == "Pak Budi Revisi"

    # Koreksi satuan ke tray (2 tray @ Rp 60.000 = 60 butir, total Rp 120.000)
    patch_tray = client.patch(f"/api/v1/penjualan/{entry_id}", json={
        "satuan_jual": "tray",
        "kuantitas": 2,
        "harga_satuan": 60000.0,
    })
    assert patch_tray.status_code == 200
    tray_data = patch_tray.json()
    assert tray_data["satuan_jual"] == "tray"
    assert tray_data["jumlah_butir"] == 60
    assert tray_data["total"] == 120000.0


def test_get_penjualan_summary(client):
    # Buat 3 transaksi berbeda satuan
    client.post("/api/v1/penjualan/", json={
        "tanggal": "2026-03-01",
        "satuan_jual": "butir",
        "kuantitas": 100,
        "harga_satuan": 2000.0,
    })  # Total 200.000, 100 butir
    client.post("/api/v1/penjualan/", json={
        "tanggal": "2026-03-02",
        "satuan_jual": "tray",
        "kuantitas": 2,
        "harga_satuan": 50000.0,
    })  # Total 100.000, 60 butir
    client.post("/api/v1/penjualan/", json={
        "tanggal": "2026-03-03",
        "satuan_jual": "kg",
        "kuantitas": 3.0,
        "harga_satuan": 30000.0,
    })  # Total 90.000, 50 butir (3 / 0.06 = 50)

    res = client.get("/api/v1/penjualan/summary")
    assert res.status_code == 200
    summary = res.json()
    assert summary["total_pendapatan"] == 390000.0
    assert summary["total_butir_terjual"] == 210  # 100 + 60 + 50
    assert summary["total_transaksi"] == 3
    assert summary["breakdown_per_satuan"]["butir"] == 200000.0
    assert summary["breakdown_per_satuan"]["tray"] == 100000.0
    assert summary["breakdown_per_satuan"]["kg"] == 90000.0


def test_get_penjualan_list_filters(client):
    client.post("/api/v1/penjualan/", json={
        "tanggal": "2026-03-01",
        "satuan_jual": "butir",
        "kuantitas": 50,
        "harga_satuan": 2000.0,
        "pembeli": "Toko Barokah",
    })
    client.post("/api/v1/penjualan/", json={
        "tanggal": "2026-03-02",
        "satuan_jual": "kg",
        "kuantitas": 10.0,
        "harga_satuan": 27000.0,
        "pembeli": "Agen Makmur",
    })

    # Filter satuan
    res_satuan = client.get("/api/v1/penjualan/?satuan_jual=kg")
    assert res_satuan.status_code == 200
    data_satuan = res_satuan.json()
    assert len(data_satuan) == 1
    assert data_satuan[0]["satuan_jual"] == "kg"

    # Search pembeli
    res_search = client.get("/api/v1/penjualan/?search_pembeli=makmur")
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert len(data_search) == 1
    assert data_search[0]["pembeli"] == "Agen Makmur"

    # Filter tanggal
    res_date = client.get("/api/v1/penjualan/?start_date=2026-03-02&end_date=2026-03-02")
    assert res_date.status_code == 200
    assert len(res_date.json()) == 1


def test_delete_penjualan(client):
    create_res = client.post("/api/v1/penjualan/", json={
        "tanggal": "2026-03-01",
        "satuan_jual": "butir",
        "kuantitas": 10,
        "harga_satuan": 2000.0,
    })
    entry_id = create_res.json()["id"]

    del_res = client.delete(f"/api/v1/penjualan/{entry_id}")
    assert del_res.status_code == 200
    assert "berhasil dihapus" in del_res.json()["message"]

    # Verify not found
    get_res = client.get(f"/api/v1/penjualan/{entry_id}")
    assert get_res.status_code == 404


def test_invalid_date_range_throws_400(client):
    res = client.get("/api/v1/penjualan/?start_date=2026-03-10&end_date=2026-03-01")
    assert res.status_code == 400
    assert "tidak boleh lebih besar" in res.json()["detail"]
