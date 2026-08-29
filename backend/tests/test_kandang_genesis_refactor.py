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


class TestKandangGenesisRefactor:
    """
    Test suite untuk pengujian koreksi Genesis Fact jumlah_awal dan
    kalkulasi deterministik jumlah_saat_ini (Anti Phantom State).
    """

    def test_normal_update_jumlah_awal(self, client, db_session):
        """
        Uji Normal Update jumlah_awal:
        Kandang awal 120 ekor, ada kematian 20 ekor (populasi live = 100).
        User update jumlah_awal jadi 130 -> Pastikan jumlah_saat_ini otomatis menjadi 110.
        """
        # 1. Setup Kandang
        kandang = Kandang(
            nama_kandang="Kandang Layer A",
            tanggal_mulai=date(2026, 8, 1),
            jumlah_awal=120,
            jumlah_saat_ini=120,
            status=StatusKandang.aktif
        )
        db_session.add(kandang)
        db_session.commit()
        db_session.refresh(kandang)

        # 2. Catat mortalitas 20 ekor via API
        res_m = client.post("/api/v1/mortalitas/", json={
            "kandang_id": kandang.id,
            "tanggal": "2026-08-05",
            "jumlah": 20,
            "keterangan": "Sakit"
        })
        assert res_m.status_code == 201

        # Verifikasi jumlah_saat_ini berkurang jadi 100
        db_session.refresh(kandang)
        assert kandang.jumlah_saat_ini == 100

        # 3. Update jumlah_awal dari 120 menjadi 130
        res_update = client.patch(f"/api/v1/kandang/{kandang.id}", json={
            "jumlah_awal": 130
        })
        assert res_update.status_code == 200
        data = res_update.json()

        # Pastikan jumlah_awal = 130 dan jumlah_saat_ini otomatis dihitung ulang jadi 110
        assert data["jumlah_awal"] == 130
        assert data["jumlah_saat_ini"] == 110

    def test_underflow_error_guard(self, client, db_session):
        """
        Uji Underflow Error:
        Total kematian 20 ekor, user mencoba update jumlah_awal menjadi 15 ->
        Pastikan server merespons 400 Bad Request dengan pesan error yang jelas.
        """
        kandang = Kandang(
            nama_kandang="Kandang Layer B",
            tanggal_mulai=date(2026, 8, 1),
            jumlah_awal=100,
            jumlah_saat_ini=100,
            status=StatusKandang.aktif
        )
        db_session.add(kandang)
        db_session.commit()
        db_session.refresh(kandang)

        # Catat mortalitas 20 ekor
        client.post("/api/v1/mortalitas/", json={
            "kandang_id": kandang.id,
            "tanggal": "2026-08-05",
            "jumlah": 20,
            "keterangan": "Sakit"
        })

        # Coba update jumlah_awal menjadi 15 (< 20 kematian)
        res_fail = client.patch(f"/api/v1/kandang/{kandang.id}", json={
            "jumlah_awal": 15
        })
        assert res_fail.status_code == 400
        assert "tidak boleh lebih kecil dari total akumulasi kematian" in res_fail.json()["detail"]
        assert "20 ekor" in res_fail.json()["detail"]

    def test_boundary_condition_exact_zero_population(self, client, db_session):
        """
        Uji Boundary Condition (Populasi Tepat 0):
        Total kematian 20 ekor, user mengoreksi jumlah_awal menjadi tepat 20 ekor.
        Pastikan request berhasil (HTTP 200 OK), jumlah_saat_ini menjadi 0,
        dan guard >= tidak melempar false positive.
        """
        kandang = Kandang(
            nama_kandang="Kandang Layer C",
            tanggal_mulai=date(2026, 8, 1),
            jumlah_awal=100,
            jumlah_saat_ini=100,
            status=StatusKandang.aktif
        )
        db_session.add(kandang)
        db_session.commit()
        db_session.refresh(kandang)

        # Catat mortalitas 20 ekor
        client.post("/api/v1/mortalitas/", json={
            "kandang_id": kandang.id,
            "tanggal": "2026-08-05",
            "jumlah": 20,
            "keterangan": "Sakit"
        })

        # Update jumlah_awal menjadi tepat 20
        res_exact = client.patch(f"/api/v1/kandang/{kandang.id}", json={
            "jumlah_awal": 20
        })
        assert res_exact.status_code == 200
        data = res_exact.json()
        assert data["jumlah_awal"] == 20
        assert data["jumlah_saat_ini"] == 0

    def test_ignored_jumlah_saat_ini_in_payload(self, client, db_session):
        """
        Uji Ignored / Rejected jumlah_saat_ini:
        Kirim payload yang mencoba mengubah jumlah_saat_ini secara manual,
        pastikan field tersebut diabaikan oleh schema/service dan tidak merusak saldo.
        """
        kandang = Kandang(
            nama_kandang="Kandang Layer D",
            tanggal_mulai=date(2026, 8, 1),
            jumlah_awal=100,
            jumlah_saat_ini=100,
            status=StatusKandang.aktif
        )
        db_session.add(kandang)
        db_session.commit()
        db_session.refresh(kandang)

        # Kirim update nama_kandang dengan field injeksi jumlah_saat_ini = 999
        res = client.patch(f"/api/v1/kandang/{kandang.id}", json={
            "nama_kandang": "Kandang Layer D Baru",
            "jumlah_saat_ini": 999
        })
        assert res.status_code == 200
        data = res.json()
        assert data["nama_kandang"] == "Kandang Layer D Baru"
        # Nilai jumlah_saat_ini tetap 100 (tidak termodifikasi menjadi 999)
        assert data["jumlah_saat_ini"] == 100

    def test_time_travel_compatibility_after_jumlah_awal_update(self, client, db_session):
        """
        Uji Konsistensi Time-Travel (T2.5 Compatibility):
        Verifikasi bahwa setelah jumlah_awal diubah, endpoint GET /api/v1/produksi-telur/
        dan GET /api/v1/produksi-telur/analytics/performance secara retroaktif
        menggunakan jumlah_awal baru untuk seluruh riwayat.
        """
        # 1. Setup Kandang awal 100 ekor
        kandang = Kandang(
            nama_kandang="Kandang Layer E",
            tanggal_mulai=date(2026, 8, 1),
            jumlah_awal=100,
            jumlah_saat_ini=100,
            status=StatusKandang.aktif
        )
        db_session.add(kandang)
        db_session.commit()
        db_session.refresh(kandang)

        # 2. Catat produksi Tgl 2: 90 butir normal (pada 100 ekor -> HDP = 90.00%)
        client.post("/api/v1/produksi-telur/", json={
            "kandang_id": kandang.id,
            "tanggal": "2026-08-02",
            "jumlah_butir_normal": 90,
            "jumlah_butir_retak": 0,
            "jumlah_butir_pecah": 0
        })

        # 3. Catat kematian Tgl 5: 10 ekor
        client.post("/api/v1/mortalitas/", json={
            "kandang_id": kandang.id,
            "tanggal": "2026-08-05",
            "jumlah": 10,
            "keterangan": "Sakit"
        })

        # 4. Catat produksi Tgl 10: 72 butir normal (pada 90 ekor -> HDP = 80.00%)
        client.post("/api/v1/produksi-telur/", json={
            "kandang_id": kandang.id,
            "tanggal": "2026-08-10",
            "jumlah_butir_normal": 72,
            "jumlah_butir_retak": 0,
            "jumlah_butir_pecah": 0
        })

        # Verifikasi awal riwayat
        res_hist_1 = client.get(f"/api/v1/produksi-telur/?kandang_id={kandang.id}")
        assert res_hist_1.status_code == 200
        items_1 = res_hist_1.json()
        item_tgl2 = next(i for i in items_1 if i["tanggal"] == "2026-08-02")
        item_tgl10 = next(i for i in items_1 if i["tanggal"] == "2026-08-10")
        assert item_tgl2["populasi_ayam"] == 100
        assert item_tgl2["hdp_percentage"] == 90.0
        assert item_tgl10["populasi_ayam"] == 90
        assert item_tgl10["hdp_percentage"] == 80.0

        # 5. KOREKSI GENESIS FACT: User mengoreksi jumlah_awal dari 100 menjadi 120 ekor
        res_koreksi = client.patch(f"/api/v1/kandang/{kandang.id}", json={
            "jumlah_awal": 120
        })
        assert res_koreksi.status_code == 200
        assert res_koreksi.json()["jumlah_awal"] == 120
        assert res_koreksi.json()["jumlah_saat_ini"] == 110  # 120 - 10 kematian = 110

        # 6. Verifikasi Riwayat Produksi Otomatis Terkoreksi Retroaktif:
        # Tgl 2 (sebelum kematian): populasi harus 120, HDP = (90 / 120) * 100 = 75.00%
        # Tgl 10 (setelah kematian 10 ekor): populasi harus 110, HDP = (72 / 110) * 100 = 65.45%
        res_hist_2 = client.get(f"/api/v1/produksi-telur/?kandang_id={kandang.id}")
        assert res_hist_2.status_code == 200
        items_2 = res_hist_2.json()
        item_tgl2_new = next(i for i in items_2 if i["tanggal"] == "2026-08-02")
        item_tgl10_new = next(i for i in items_2 if i["tanggal"] == "2026-08-10")
        assert item_tgl2_new["populasi_ayam"] == 120
        assert item_tgl2_new["hdp_percentage"] == 75.0
        assert item_tgl10_new["populasi_ayam"] == 110
        assert item_tgl10_new["hdp_percentage"] == 65.45

        # 7. Verifikasi Endpoint Analytics Performance
        res_analytics = client.get(f"/api/v1/produksi-telur/analytics/performance?kandang_id={kandang.id}")
        assert res_analytics.status_code == 200
        dps = res_analytics.json()["data_points"]
        assert dps[0]["populasi_ayam"] == 120
        assert dps[0]["hdp_percentage"] == 75.0
        assert dps[1]["populasi_ayam"] == 110
        assert dps[1]["hdp_percentage"] == 65.45
