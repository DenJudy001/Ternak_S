import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.core.database import Base, get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.kandang import Kandang, StatusKandang
from app.models.pengeluaran import Pengeluaran, KategoriPengeluaran


# In-memory SQLite DB for clean, fast, isolated tests
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


@pytest.fixture
def seed_kandang(db_session):
    kandang_a = Kandang(
        nama_kandang="Kandang Alpha",
        tanggal_mulai=date(2026, 1, 1),
        jumlah_awal=1000,
        jumlah_saat_ini=1000,
        status=StatusKandang.aktif,
    )
    kandang_b = Kandang(
        nama_kandang="Kandang Beta",
        tanggal_mulai=date(2026, 1, 1),
        jumlah_awal=500,
        jumlah_saat_ini=500,
        status=StatusKandang.aktif,
    )
    db_session.add_all([kandang_a, kandang_b])
    db_session.commit()
    db_session.refresh(kandang_a)
    db_session.refresh(kandang_b)
    return kandang_a, kandang_b


def test_create_pengeluaran_valid_direct_cost(client, seed_kandang):
    kandang_a, _ = seed_kandang
    payload = {
        "tanggal": "2026-03-01",
        "kategori": "pakan",
        "nominal": 1500000.0,
        "jumlah_kg": 50.0,
        "keterangan": "Beli 5 sak pakan konsentrat",
        "kandang_id": kandang_a.id,
    }
    response = client.post("/api/v1/pengeluaran/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["kategori"] == "pakan"
    assert data["nominal"] == 1500000.0
    assert data["jumlah_kg"] == 50.0
    assert data["keterangan"] == "Beli 5 sak pakan konsentrat"
    assert data["kandang_id"] == kandang_a.id
    assert data["nama_kandang"] == "Kandang Alpha"


def test_create_pengeluaran_valid_shared_overhead(client):
    # Biaya umum peternakan (kandang_id is None)
    payload = {
        "tanggal": "2026-03-02",
        "kategori": "operasional",
        "nominal": 450000.0,
        "keterangan": "Tagihan listrik PLN induk",
        "kandang_id": None,
    }
    response = client.post("/api/v1/pengeluaran/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["kategori"] == "operasional"
    assert data["nominal"] == 450000.0
    assert data["kandang_id"] is None
    assert data["nama_kandang"] is None


def test_create_pengeluaran_negative_or_zero_nominal_rejected(client):
    # Zero nominal
    payload_zero = {
        "tanggal": "2026-03-01",
        "kategori": "gaji",
        "nominal": 0,
        "keterangan": "Upah nihil",
    }
    response_zero = client.post("/api/v1/pengeluaran/", json=payload_zero)
    assert response_zero.status_code == 422  # Pydantic validation gt=0

    # Negative nominal
    payload_neg = {
        "tanggal": "2026-03-01",
        "kategori": "gaji",
        "nominal": -50000,
        "keterangan": "Upah minus",
    }
    response_neg = client.post("/api/v1/pengeluaran/", json=payload_neg)
    assert response_neg.status_code == 422


def test_create_pengeluaran_invalid_kandang_id_returns_404(client):
    payload = {
        "tanggal": "2026-03-01",
        "kategori": "obat_vaksin",
        "nominal": 250000.0,
        "keterangan": "Vaksin ND-IB",
        "kandang_id": 99999,  # Non-existent ID
    }
    response = client.post("/api/v1/pengeluaran/", json=payload)
    assert response.status_code == 404
    assert "tidak ditemukan" in response.json()["detail"]


def test_get_pengeluaran_list_filter_and_sorting(client, seed_kandang):
    kandang_a, kandang_b = seed_kandang

    # Create multiple entries
    entries = [
        {"tanggal": "2026-03-01", "kategori": "pakan", "nominal": 1000000.0, "jumlah_kg": 100.0, "kandang_id": kandang_a.id},
        {"tanggal": "2026-03-02", "kategori": "obat_vaksin", "nominal": 200000.0, "kandang_id": kandang_b.id},
        {"tanggal": "2026-03-03", "kategori": "operasional", "nominal": 500000.0, "kandang_id": None},
        {"tanggal": "2026-03-04", "kategori": "pakan", "nominal": 1200000.0, "jumlah_kg": 120.0, "kandang_id": kandang_a.id},
    ]
    for item in entries:
        res = client.post("/api/v1/pengeluaran/", json=item)
        assert res.status_code == 201

    # Test all entries (should be ordered DESC by date)
    res_all = client.get("/api/v1/pengeluaran/")
    assert res_all.status_code == 200
    all_data = res_all.json()
    assert len(all_data) == 4
    assert all_data[0]["tanggal"] == "2026-03-04"
    assert all_data[3]["tanggal"] == "2026-03-01"

    # Test filter by kategori
    res_pakan = client.get("/api/v1/pengeluaran/?kategori=pakan")
    assert res_pakan.status_code == 200
    pakan_data = res_pakan.json()
    assert len(pakan_data) == 2
    assert all(item["kategori"] == "pakan" for item in pakan_data)

    # Test filter by specific kandang
    res_kandang_a = client.get(f"/api/v1/pengeluaran/?kandang_id={kandang_a.id}")
    assert res_kandang_a.status_code == 200
    kandang_a_data = res_kandang_a.json()
    assert len(kandang_a_data) == 2
    assert all(item["kandang_id"] == kandang_a.id for item in kandang_a_data)

    # Test filter by general/biaya umum (kandang_id=0)
    res_umum = client.get("/api/v1/pengeluaran/?kandang_id=0")
    assert res_umum.status_code == 200
    umum_data = res_umum.json()
    assert len(umum_data) == 1
    assert umum_data[0]["kategori"] == "operasional"
    assert umum_data[0]["kandang_id"] is None

    # Test filter by date range
    res_range = client.get("/api/v1/pengeluaran/?start_date=2026-03-02&end_date=2026-03-03")
    assert res_range.status_code == 200
    range_data = res_range.json()
    assert len(range_data) == 2
    assert [d["tanggal"] for d in range_data] == ["2026-03-03", "2026-03-02"]


def test_get_pengeluaran_summary_aggregation(client, seed_kandang):
    kandang_a, _ = seed_kandang

    entries = [
        {"tanggal": "2026-03-01", "kategori": "pakan", "nominal": 1000000.0, "jumlah_kg": 100.0, "kandang_id": kandang_a.id},
        {"tanggal": "2026-03-02", "kategori": "pakan", "nominal": 500000.0, "jumlah_kg": 50.0, "kandang_id": kandang_a.id},
        {"tanggal": "2026-03-03", "kategori": "gaji", "nominal": 2500000.0, "kandang_id": None},
        {"tanggal": "2026-03-04", "kategori": "peralatan", "nominal": 300000.0, "kandang_id": kandang_a.id},
    ]
    for item in entries:
        client.post("/api/v1/pengeluaran/", json=item)

    # Summary overall
    res_summary = client.get("/api/v1/pengeluaran/summary")
    assert res_summary.status_code == 200
    data = res_summary.json()
    assert data["total_pengeluaran"] == 4300000.0
    assert data["total_kg_pakan"] == 150.0
    breakdown = data["breakdown_per_kategori"]
    assert breakdown["pakan"] == 1500000.0
    assert breakdown["gaji"] == 2500000.0
    assert breakdown["peralatan"] == 300000.0
    assert breakdown["obat_vaksin"] == 0.0
    assert breakdown["operasional"] == 0.0
    assert breakdown["lain_lain"] == 0.0

    # Summary with kandang filter
    res_kandang_summary = client.get(f"/api/v1/pengeluaran/summary?kandang_id={kandang_a.id}")
    assert res_kandang_summary.status_code == 200
    kandang_data = res_kandang_summary.json()
    assert kandang_data["total_pengeluaran"] == 1800000.0
    assert kandang_data["total_kg_pakan"] == 150.0
    assert kandang_data["breakdown_per_kategori"]["pakan"] == 1500000.0
    assert kandang_data["breakdown_per_kategori"]["peralatan"] == 300000.0
    assert kandang_data["breakdown_per_kategori"]["gaji"] == 0.0


def test_update_pengeluaran_success_and_validation(client, seed_kandang):
    kandang_a, kandang_b = seed_kandang

    create_res = client.post("/api/v1/pengeluaran/", json={
        "tanggal": "2026-03-01",
        "kategori": "pakan",
        "nominal": 1000000.0,
        "jumlah_kg": 100.0,
        "keterangan": "Pakan starter",
        "kandang_id": kandang_a.id,
    })
    entry_id = create_res.json()["id"]

    # Patch partial
    update_res = client.patch(f"/api/v1/pengeluaran/{entry_id}", json={
        "nominal": 1250000.0,
        "keterangan": "Pakan finisher revisi",
        "kandang_id": kandang_b.id,
    })
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["nominal"] == 1250000.0
    assert updated["keterangan"] == "Pakan finisher revisi"
    assert updated["kandang_id"] == kandang_b.id
    assert updated["nama_kandang"] == "Kandang Beta"

    # Patch with invalid kandang_id -> 404
    bad_kandang_res = client.patch(f"/api/v1/pengeluaran/{entry_id}", json={"kandang_id": 88888})
    assert bad_kandang_res.status_code == 404

    # Patch non-existent entry -> 404
    not_found_res = client.patch("/api/v1/pengeluaran/99999", json={"nominal": 50000.0})
    assert not_found_res.status_code == 404


def test_delete_pengeluaran_success(client):
    create_res = client.post("/api/v1/pengeluaran/", json={
        "tanggal": "2026-03-01",
        "kategori": "lain_lain",
        "nominal": 50000.0,
        "keterangan": "Uang parkir kirim telur",
    })
    entry_id = create_res.json()["id"]

    # Delete
    del_res = client.delete(f"/api/v1/pengeluaran/{entry_id}")
    assert del_res.status_code == 200
    assert "berhasil dihapus" in del_res.json()["message"]

    # Verify deleted
    get_res = client.get(f"/api/v1/pengeluaran/{entry_id}")
    assert get_res.status_code == 404


def test_invalid_date_range_throws_400(client):
    # start_date > end_date in list
    res_list = client.get("/api/v1/pengeluaran/?start_date=2026-03-10&end_date=2026-03-01")
    assert res_list.status_code == 400
    assert "tidak boleh lebih besar" in res_list.json()["detail"]

    # start_date > end_date in summary
    res_summary = client.get("/api/v1/pengeluaran/summary?start_date=2026-03-10&end_date=2026-03-01")
    assert res_summary.status_code == 400
    assert "tidak boleh lebih besar" in res_summary.json()["detail"]


# ==========================================
# Tests for Ticket T3.1.1 (jumlah_kg & FCR)
# ==========================================

def test_create_pengeluaran_pakan_without_jumlah_kg_rejected_422(client, seed_kandang):
    """
    Uji pembuatan pengeluaran pakan tanpa jumlah_kg ditolak dengan HTTP 422.
    """
    kandang_a, _ = seed_kandang

    # 1. Tanpa key jumlah_kg sama sekali
    payload_no_key = {
        "tanggal": "2026-03-01",
        "kategori": "pakan",
        "nominal": 750000.0,
        "kandang_id": kandang_a.id,
    }
    res_no_key = client.post("/api/v1/pengeluaran/", json=payload_no_key)
    assert res_no_key.status_code == 422
    assert "wajib diisi untuk kategori pakan" in str(res_no_key.json())

    # 2. Key jumlah_kg bernilai None
    payload_none = {
        "tanggal": "2026-03-01",
        "kategori": "pakan",
        "nominal": 750000.0,
        "jumlah_kg": None,
        "kandang_id": kandang_a.id,
    }
    res_none = client.post("/api/v1/pengeluaran/", json=payload_none)
    assert res_none.status_code == 422
    assert "wajib diisi untuk kategori pakan" in str(res_none.json())

    # 3. Key jumlah_kg bernilai 0
    payload_zero = {
        "tanggal": "2026-03-01",
        "kategori": "pakan",
        "nominal": 750000.0,
        "jumlah_kg": 0,
        "kandang_id": kandang_a.id,
    }
    res_zero = client.post("/api/v1/pengeluaran/", json=payload_zero)
    assert res_zero.status_code == 422


def test_create_pengeluaran_pakan_with_jumlah_kg_success(client, seed_kandang):
    """
    Uji pembuatan pengeluaran pakan dengan jumlah_kg > 0 berhasil (HTTP 201)
    dan nilai jumlah_kg tersimpan presisi di database.
    """
    kandang_a, _ = seed_kandang
    payload = {
        "tanggal": "2026-03-01",
        "kategori": "pakan",
        "nominal": 650000.0,
        "jumlah_kg": 75.5,
        "keterangan": "Beli konsentrat 75.5 kg",
        "kandang_id": kandang_a.id,
    }
    response = client.post("/api/v1/pengeluaran/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["kategori"] == "pakan"
    assert data["nominal"] == 650000.0
    assert data["jumlah_kg"] == 75.5

    # Verifikasi saat diambil via GET by ID
    get_res = client.get(f"/api/v1/pengeluaran/{data['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["jumlah_kg"] == 75.5


def test_create_pengeluaran_non_pakan_with_jumlah_kg_sanitized_to_none(client):
    """
    Uji pembuatan pengeluaran non-pakan (misal operasional) dengan menyertakan
    jumlah_kg -> berhasil (HTTP 201), namun server wajib membersihkan nilainya menjadi None.
    """
    payload = {
        "tanggal": "2026-03-02",
        "kategori": "operasional",
        "nominal": 350000.0,
        "jumlah_kg": 50.0,  # Payload tidak valid secara semantik non-pakan
        "keterangan": "Beli bensin genset",
    }
    response = client.post("/api/v1/pengeluaran/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["kategori"] == "operasional"
    assert data["nominal"] == 350000.0
    assert data["jumlah_kg"] is None

    # Verifikasi di database via GET by ID
    get_res = client.get(f"/api/v1/pengeluaran/{data['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["jumlah_kg"] is None


def test_patch_switch_category_from_pakan_to_non_pakan_resets_jumlah_kg_to_none(client, seed_kandang):
    """
    Uji pembaruan transaksi (PATCH): ubah kategori dari pakan ke obat_vaksin
    -> pastikan jumlah_kg otomatis ter-reset menjadi None di database.
    """
    kandang_a, _ = seed_kandang

    # 1. Buat transaksi awal kategori pakan dengan bobot 100 kg
    create_res = client.post("/api/v1/pengeluaran/", json={
        "tanggal": "2026-03-01",
        "kategori": "pakan",
        "nominal": 800000.0,
        "jumlah_kg": 100.0,
        "kandang_id": kandang_a.id,
    })
    assert create_res.status_code == 201
    entry_id = create_res.json()["id"]
    assert create_res.json()["jumlah_kg"] == 100.0

    # 2. PATCH kategori menjadi obat_vaksin (tanpa menyebutkan jumlah_kg)
    patch_res = client.patch(f"/api/v1/pengeluaran/{entry_id}", json={
        "kategori": "obat_vaksin",
    })
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["kategori"] == "obat_vaksin"
    assert updated["jumlah_kg"] is None

    # 3. Verifikasi konsistensi dari endpoint GET by ID
    get_res = client.get(f"/api/v1/pengeluaran/{entry_id}")
    assert get_res.status_code == 200
    assert get_res.json()["kategori"] == "obat_vaksin"
    assert get_res.json()["jumlah_kg"] is None


def test_get_summary_aggregates_total_kg_pakan_accurately(client, seed_kandang):
    """
    Uji agregasi GET /summary: pastikan total_kg_pakan terakumulasi akurat
    hanya dari kategori pakan.
    """
    kandang_a, kandang_b = seed_kandang

    entries = [
        {"tanggal": "2026-03-01", "kategori": "pakan", "nominal": 1200000.0, "jumlah_kg": 150.5, "kandang_id": kandang_a.id},
        {"tanggal": "2026-03-02", "kategori": "pakan", "nominal": 400000.0, "jumlah_kg": 49.5, "kandang_id": kandang_b.id},
        {"tanggal": "2026-03-03", "kategori": "operasional", "nominal": 300000.0, "kandang_id": None},
        {"tanggal": "2026-03-04", "kategori": "gaji", "nominal": 1000000.0, "kandang_id": None},
    ]
    for item in entries:
        res = client.post("/api/v1/pengeluaran/", json=item)
        assert res.status_code == 201

    # Cek summary global
    res_summary = client.get("/api/v1/pengeluaran/summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["total_pengeluaran"] == 2900000.0
    # 150.5 + 49.5 = 200.0
    assert summary["total_kg_pakan"] == 200.0

    # Cek summary per kandang A (hanya 150.5 kg)
    res_kandang_a = client.get(f"/api/v1/pengeluaran/summary?kandang_id={kandang_a.id}")
    assert res_kandang_a.status_code == 200
    kandang_summary = res_kandang_a.json()
    assert kandang_summary["total_kg_pakan"] == 150.5

