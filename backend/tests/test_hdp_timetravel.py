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
from app.models.kandang import Kandang, StatusKandang
from app.models.mortalitas import Mortalitas
from app.models.produksi_telur import ProduksiTelur


# Setup in-memory SQLite database for fast integration tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Membuat schema database baru untuk setiap test function dan teardown setelah selesai."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """TestClient dengan override dependency get_db dan get_current_user."""
    dummy_user = User(
        id=1,
        username="admin_test",
        hashed_password="hashed_secret",
        is_active=True
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


class TestHDPTimetravelIntegration:
    """
    End-to-End HTTP Integration Tests untuk validasi kalkulasi populasi historis (Time-Travel)
    dan mitigasi Time-Travel Bias pada metrik Hen Day Production (HDP%).
    """

    def test_multi_kandang_partitioning(self, client, db_session):
        """
        Multi-Kandang Partitioning:
        Pastikan mortalitas di Kandang A tidak mengurangi populasi atau mendistorsi HDP Kandang B
        saat endpoint dipanggil tanpa filter kandang (Semua Kandang).
        """
        # 1. Setup Kandang A (100 ekor) dan Kandang B (200 ekor)
        kandang_a = Kandang(
            nama_kandang="Kandang Alpha",
            tanggal_mulai=date(2026, 8, 1),
            jumlah_awal=100,
            jumlah_saat_ini=90,
            status=StatusKandang.aktif
        )
        kandang_b = Kandang(
            nama_kandang="Kandang Beta",
            tanggal_mulai=date(2026, 8, 1),
            jumlah_awal=200,
            jumlah_saat_ini=200,
            status=StatusKandang.aktif
        )
        db_session.add_all([kandang_a, kandang_b])
        db_session.commit()
        db_session.refresh(kandang_a)
        db_session.refresh(kandang_b)

        # 2. Tambah mortalitas 10 ekor HANYA di Kandang A pada Tgl 5
        mort_a = Mortalitas(
            kandang_id=kandang_a.id,
            tanggal=date(2026, 8, 5),
            jumlah=10,
            keterangan="Sakit"
        )
        db_session.add(mort_a)
        db_session.commit()

        # 3. Tambah produksi Tgl 10 untuk Kandang A (80 butir) dan Kandang B (180 butir)
        prod_a = ProduksiTelur(
            kandang_id=kandang_a.id,
            tanggal=date(2026, 8, 10),
            jumlah_butir_normal=80,
            jumlah_butir_retak=0,
            jumlah_butir_pecah=0
        )
        prod_b = ProduksiTelur(
            kandang_id=kandang_b.id,
            tanggal=date(2026, 8, 10),
            jumlah_butir_normal=180,
            jumlah_butir_retak=0,
            jumlah_butir_pecah=0
        )
        db_session.add_all([prod_a, prod_b])
        db_session.commit()

        # 4. Panggil GET /api/v1/produksi-telur/ (Semua Kandang)
        res = client.get("/api/v1/produksi-telur/")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 2

        # Temukan record masing-masing
        rec_a = next(item for item in data if item["kandang_id"] == kandang_a.id)
        rec_b = next(item for item in data if item["kandang_id"] == kandang_b.id)

        # Kandang A: populasi efektif 100 - 10 = 90. HDP = (80 / 90) * 100 = 88.89%
        assert rec_a["populasi_ayam"] == 90
        assert rec_a["hdp_percentage"] == 88.89

        # Kandang B: populasi efektif tetap 200 (TIDAK terpengaruh mortalitas Kandang A). HDP = (180 / 200) * 100 = 90.00%
        assert rec_b["populasi_ayam"] == 200
        assert rec_b["hdp_percentage"] == 90.0

    def test_timetravel_history_and_retroactive_mutations(self, client, db_session):
        """
        Skenario Komprehensif:
        1. Time-Travel History: Kandang 120 ekor. Tgl 1 prod 110 (HDP 91.67%). Tgl 5 mort 20 ekor. Tgl 10 prod 90 (HDP 90.00%).
        2. Retroactive Mutation: PATCH mort Tgl 5 dari 20 jadi 10 ekor -> prod Tgl 10 otomatis jadi populasi 110 & HDP 81.82%.
        3. Retroactive Deletion: DELETE mort Tgl 5 -> prod Tgl 10 otomatis pulih jadi populasi 120 & HDP 75.00%.
        4. Single Detail View: GET /api/v1/produksi-telur/{id_tgl_1} menghasilkan populasi_ayam 120 & HDP 91.67%.
        """
        # 1. Setup Kandang awal 120 ekor
        kandang = Kandang(
            nama_kandang="Kandang Layer Utama",
            tanggal_mulai=date(2026, 8, 1),
            jumlah_awal=120,
            jumlah_saat_ini=120,
            status=StatusKandang.aktif
        )
        db_session.add(kandang)
        db_session.commit()
        db_session.refresh(kandang)

        # 2. Catat Produksi Tgl 1 (110 butir normal)
        res_p1 = client.post("/api/v1/produksi-telur/", json={
            "kandang_id": kandang.id,
            "tanggal": "2026-08-01",
            "jumlah_butir_normal": 110,
            "jumlah_butir_retak": 0,
            "jumlah_butir_pecah": 0
        })
        assert res_p1.status_code == 201
        p1_id = res_p1.json()["id"]

        # 3. Catat Mortalitas Tgl 5 (20 ekor)
        res_m = client.post("/api/v1/mortalitas/", json={
            "kandang_id": kandang.id,
            "tanggal": "2026-08-05",
            "jumlah": 20,
            "keterangan": "Suhu panas"
        })
        assert res_m.status_code == 201
        m_id = res_m.json()["id"]

        # 4. Catat Produksi Tgl 10 (90 butir normal)
        res_p2 = client.post("/api/v1/produksi-telur/", json={
            "kandang_id": kandang.id,
            "tanggal": "2026-08-10",
            "jumlah_butir_normal": 90,
            "jumlah_butir_retak": 0,
            "jumlah_butir_pecah": 0
        })
        assert res_p2.status_code == 201
        p2_id = res_p2.json()["id"]

        # --- Verifikasi 1: Time-Travel History ---
        res_list = client.get(f"/api/v1/produksi-telur/?kandang_id={kandang.id}")
        assert res_list.status_code == 200
        list_data = res_list.json()
        assert len(list_data) == 2

        # Entri Tgl 1 (terjadi sebelum kematian Tgl 5): populasi harus 120, HDP 91.67%
        item_tgl1 = next(item for item in list_data if item["id"] == p1_id)
        assert item_tgl1["populasi_ayam"] == 120
        assert item_tgl1["hdp_percentage"] == 91.67
        assert item_tgl1["is_hdp_anomaly"] is False

        # Entri Tgl 10 (terjadi setelah kematian 20 ekor Tgl 5): populasi harus 100, HDP 90.00%
        item_tgl10 = next(item for item in list_data if item["id"] == p2_id)
        assert item_tgl10["populasi_ayam"] == 100
        assert item_tgl10["hdp_percentage"] == 90.0
        assert item_tgl10["is_hdp_anomaly"] is False

        # --- Verifikasi 2: Single Detail View Tgl 1 ---
        res_detail = client.get(f"/api/v1/produksi-telur/{p1_id}")
        assert res_detail.status_code == 200
        detail_data = res_detail.json()
        assert detail_data["populasi_ayam"] == 120
        assert detail_data["hdp_percentage"] == 91.67

        # --- Verifikasi 3: Retroactive Mutation (PATCH mortalitas 20 -> 10 ekor) ---
        res_patch_m = client.patch(f"/api/v1/mortalitas/{m_id}", json={
            "jumlah": 10
        })
        assert res_patch_m.status_code == 200

        # Baca ulang riwayat produksi Tgl 10: populasi otomatis menjadi 120 - 10 = 110, HDP = 90 / 110 = 81.82%
        res_list_after_patch = client.get(f"/api/v1/produksi-telur/?kandang_id={kandang.id}")
        assert res_list_after_patch.status_code == 200
        patched_tgl10 = next(item for item in res_list_after_patch.json() if item["id"] == p2_id)
        assert patched_tgl10["populasi_ayam"] == 110
        assert patched_tgl10["hdp_percentage"] == 81.82

        # --- Verifikasi 4: Retroactive Deletion (DELETE mortalitas) ---
        res_del_m = client.delete(f"/api/v1/mortalitas/{m_id}")
        assert res_del_m.status_code == 200

        # Baca ulang riwayat produksi Tgl 10: populasi otomatis pulih menjadi 120, HDP = 90 / 120 = 75.00%
        res_list_after_delete = client.get(f"/api/v1/produksi-telur/?kandang_id={kandang.id}")
        assert res_list_after_delete.status_code == 200
        restored_tgl10 = next(item for item in res_list_after_delete.json() if item["id"] == p2_id)
        assert restored_tgl10["populasi_ayam"] == 120
        assert restored_tgl10["hdp_percentage"] == 75.0

    def test_performance_analytics_timetravel(self, client, db_session):
        """
        Uji endpoint GET /api/v1/produksi-telur/analytics/performance
        memastikan deret waktu data_points dan summary menggunakan populasi historis.
        """
        kandang = Kandang(
            nama_kandang="Kandang Layer Analitik",
            tanggal_mulai=date(2026, 8, 1),
            jumlah_awal=1000,
            jumlah_saat_ini=900,
            status=StatusKandang.aktif
        )
        db_session.add(kandang)
        db_session.commit()
        db_session.refresh(kandang)

        # Kematian 100 ekor pada Tgl 15
        db_session.add(Mortalitas(
            kandang_id=kandang.id,
            tanggal=date(2026, 8, 15),
            jumlah=100,
            keterangan="Afkir"
        ))
        db_session.commit()

        # Produksi Tgl 10 (850 butir) -> pop 1000, HDP = 85.0%
        # Produksi Tgl 20 (810 butir) -> pop 900, HDP = 90.0%
        db_session.add_all([
            ProduksiTelur(
                kandang_id=kandang.id,
                tanggal=date(2026, 8, 10),
                jumlah_butir_normal=850,
                jumlah_butir_retak=0,
                jumlah_butir_pecah=0
            ),
            ProduksiTelur(
                kandang_id=kandang.id,
                tanggal=date(2026, 8, 20),
                jumlah_butir_normal=810,
                jumlah_butir_retak=0,
                jumlah_butir_pecah=0
            ),
        ])
        db_session.commit()

        res = client.get(f"/api/v1/produksi-telur/analytics/performance?kandang_id={kandang.id}")
        assert res.status_code == 200
        data = res.json()

        dps = data["data_points"]
        assert len(dps) == 2
        assert dps[0]["populasi_ayam"] == 1000
        assert dps[0]["hdp_percentage"] == 85.0
        assert dps[1]["populasi_ayam"] == 900
        assert dps[1]["hdp_percentage"] == 90.0

        # Rata-rata HDP: (85.0 + 90.0) / 2 = 87.5%
        assert data["summary"]["rata_rata_hdp"] == 87.5
        assert data["summary"]["total_anomali_hdp"] == 0
