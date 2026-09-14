"""
Tests for Monthly Report Export (Ticket T4.4)

Menguji:
1. Validasi input parameter (HTTP 422 untuk bulan tidak valid: bulan=13, bulan=0).
2. Fungsi aggregator assemble_monthly_report_data pada database kosong (graceful default, no ZeroDivisionError).
3. Endpoint GET /api/v1/reports/monthly/excel (HTTP 200, Content-Type, loadable openpyxl workbook, sheet names).
4. Endpoint GET /api/v1/reports/monthly/pdf (HTTP 200, Content-Type application/pdf, magic bytes %PDF-).
"""

from datetime import date
from decimal import Decimal
from io import BytesIO
import openpyxl
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
from app.models.penjualan import Penjualan, SatuanJual
from app.models.produksi_telur import ProduksiTelur
from app.models.user import User
from app.services.report_assembler import assemble_monthly_report_data


# Setup In-Memory SQLite Database
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
        username="owner_test",
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


def test_invalid_parameters_rejected_422(client):
    """
    Uji validasi parameter query tahun dan bulan:
    Bulan = 13 atau Bulan = 0 harus ditolak dengan HTTP 422 Unprocessable Entity.
    """
    # Bulan 13
    res_13 = client.get("/api/v1/reports/monthly/excel?tahun=2026&bulan=13")
    assert res_13.status_code == 422

    # Bulan 0
    res_0 = client.get("/api/v1/reports/monthly/excel?tahun=2026&bulan=0")
    assert res_0.status_code == 422

    # Tahun di luar rentang
    res_yr = client.get("/api/v1/reports/monthly/pdf?tahun=2019&bulan=5")
    assert res_yr.status_code == 422


def test_assemble_monthly_report_data_empty_db(db_session):
    """
    Uji agregasi data bulanan pada basis data kosong:
    Memastikan tidak terjadi ZeroDivisionError dan mengembalikan struktur data lengkap.
    """
    data = assemble_monthly_report_data(db=db_session, tahun=2026, bulan=9)

    assert data["tahun"] == 2026
    assert data["bulan"] == 9
    assert data["nama_bulan"] == "September"
    assert data["periode_label"] == "September 2026"
    assert data["finansial"]["total_pendapatan"] == 0.0
    assert data["finansial"]["total_pengeluaran"] == 0.0
    assert data["finansial"]["laba_rugi_bersih"] == 0.0
    assert data["finansial"]["margin_persen"] == 0.0
    assert data["produksi"]["total_panen"] == 0
    assert data["produksi"]["rata_rata_hdp"] == 0.0
    assert len(data["produksi"]["harian_produksi"]) == 30
    assert data["fcr"]["total_kg_pakan"] == 0.0
    assert data["fcr"]["fcr"] == 0.0
    assert data["fcr"]["status_efisiensi"] == "tidak_tersedia"
    assert data["stok"]["saldo_awal"] == 0
    assert data["stok"]["saldo_akhir"] == 0
    assert data["detail_penjualan"] == []
    assert data["detail_pengeluaran"] == []


def test_export_monthly_excel_endpoint(client, db_session):
    """
    Uji endpoint GET /api/v1/reports/monthly/excel dengan seed data komprehensif:
    - Status HTTP 200 OK
    - Content-Type tepat (openxmlformats)
    - File binary dapat dibuka oleh openpyxl
    - Terdapat tepat 4 tab dengan nama yang sesuai spesifikasi
    """
    # 1. Seed Kandang & Produksi Telur
    kandang = Kandang(
        nama_kandang="Kandang Alfa",
        tanggal_mulai=date(2026, 1, 1),
        jumlah_awal=800,
        jumlah_saat_ini=800,
        status=StatusKandang.aktif,
    )
    db_session.add(kandang)
    db_session.commit()
    db_session.refresh(kandang)

    prod1 = ProduksiTelur(
        kandang_id=kandang.id,
        tanggal=date(2026, 9, 10),
        jumlah_butir_normal=700,
        jumlah_butir_retak=20,
        jumlah_butir_pecah=5,
    )
    prod2 = ProduksiTelur(
        kandang_id=kandang.id,
        tanggal=date(2026, 9, 11),
        jumlah_butir_normal=720,
        jumlah_butir_retak=15,
        jumlah_butir_pecah=8,
    )
    db_session.add_all([prod1, prod2])

    # 2. Seed Pengeluaran (Pakan & Operasional)
    exp1 = Pengeluaran(
        tanggal=date(2026, 9, 5),
        kategori=KategoriPengeluaran.pakan,
        keterangan="Konsentrat Layer 50kg",
        jumlah_kg=Decimal("150.0"),
        nominal=Decimal("1200000.0"),
        kandang_id=kandang.id,
    )
    exp2 = Pengeluaran(
        tanggal=date(2026, 9, 12),
        kategori=KategoriPengeluaran.operasional,
        keterangan="Listrik & Pompa Air",
        jumlah_kg=None,
        nominal=Decimal("350000.0"),
        kandang_id=None,
    )
    db_session.add_all([exp1, exp2])

    # 3. Seed Penjualan
    sale1 = Penjualan(
        tanggal=date(2026, 9, 12),
        pembeli="Toko Sembako Makmur",
        satuan_jual=SatuanJual.tray,
        harga_satuan=Decimal("55000.0"),
        total=Decimal("1100000.0"),
        jumlah_butir=600,
    )
    db_session.add(sale1)
    db_session.commit()

    # Request Excel
    response = client.get("/api/v1/reports/monthly/excel?tahun=2026&bulan=9")
    assert response.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers["content-type"]
    assert 'filename="Laporan_Bulanan_SiTernak_2026_09.xlsx"' in response.headers.get("content-disposition", "")

    # Validasi pembukaan file binary oleh openpyxl
    wb = openpyxl.load_workbook(BytesIO(response.content))
    expected_sheets = [
        "Ringkasan Eksekutif",
        "Produksi & HDP Harian",
        "Rincian Penjualan",
        "Rincian Pengeluaran",
    ]
    assert wb.sheetnames == expected_sheets

    ws_exec = wb["Ringkasan Eksekutif"]
    assert "SITERNAK" in str(ws_exec["A1"].value)
    assert "SEPTEMBER 2026" in str(ws_exec["A2"].value)

    ws_prod = wb["Produksi & HDP Harian"]
    # Header baris 4, data 30 hari -> baris 5 s.d 34
    assert ws_prod["A5"].value == "2026-09-01"
    assert ws_prod["A34"].value == "2026-09-30"


def test_export_monthly_pdf_endpoint(client, db_session):
    """
    Uji endpoint GET /api/v1/reports/monthly/pdf:
    - Status HTTP 200 OK
    - Content-Type application/pdf
    - Validasi magic byte binary %PDF-
    - Header Content-Disposition tepat
    """
    response = client.get("/api/v1/reports/monthly/pdf?tahun=2026&bulan=9")
    assert response.status_code == 200
    assert "application/pdf" in response.headers["content-type"]
    assert 'filename="Laporan_Bulanan_SiTernak_2026_09.pdf"' in response.headers.get("content-disposition", "")

    content = response.content
    assert len(content) > 1000
    assert content.startswith(b"%PDF-")
