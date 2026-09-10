"""
Schemas: Dashboard Executive Summary

Model Pydantic untuk serialisasi dan validasi respons API ringkasan eksekutif dashboard.
"""

from datetime import date
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class HDPHariIniResponse(BaseModel):
    """
    Schema metrik performa Hen-Day Production (HDP) hari ini.
    """
    persentase: float = Field(
        ...,
        description="Persentase HDP kumulatif seluruh peternakan (%)"
    )
    total_butir_normal: int = Field(
        ...,
        description="Total butir telur normal yang dipanen"
    )
    total_populasi_efektif: int = Field(
        ...,
        description="Total populasi ayam hidup efektif pada kandang aktif"
    )
    status_performa: str = Field(
        ...,
        description="Status evaluasi performa: 'prima' (>=85%), 'standar' (75-84.99%), 'rendah' (<75%)"
    )
    is_today_recorded: bool = Field(
        ...,
        description="Flag apakah panen hari ini sudah dicatat oleh operator"
    )
    tanggal_referensi_produksi: Optional[date] = Field(
        None,
        description="Tanggal referensi data panen yang digunakan (bisa fallback ke tanggal terakhir)"
    )

    model_config = ConfigDict(from_attributes=True)


class KeuanganBulanIniResponse(BaseModel):
    """
    Schema agregasi finansial Month-to-Date (MTD) kalender berjalan.
    """
    total_pendapatan: Decimal = Field(
        ...,
        description="Total penerimaan kas dari penjualan telur (Rp)"
    )
    total_pengeluaran: Decimal = Field(
        ...,
        description="Total beban pengeluaran operasional peternakan (Rp)"
    )
    laba_rugi_bersih: Decimal = Field(
        ...,
        description="Laba bersih (jika positif) atau rugi bersih (jika negatif) (Rp)"
    )
    margin_persen: float = Field(
        ...,
        description="Persentase margin keuntungan terhadap pendapatan (%)"
    )
    status: str = Field(
        ...,
        description="Status keuangan: 'untung', 'rugi', atau 'impas'"
    )

    model_config = ConfigDict(from_attributes=True)


class StokGudangResponse(BaseModel):
    """
    Schema ringkasan inventori stok telur gudang siap jual on-the-fly.
    """
    stok_tersedia: int = Field(
        ...,
        description="Saldo fisik butir telur layak jual tersedia di gudang"
    )
    format_tray: str = Field(
        ...,
        description="Format konversi rak komersial, misal: 'X tray + Y butir'"
    )
    estimasi_kg: float = Field(
        ...,
        description="Estimasi total bobot telur gudang dalam kilogram"
    )
    status_gudang: str = Field(
        ...,
        description="Indikator kesehatan stok: 'aman', 'tipis', 'habis', atau 'defisit'"
    )
    is_underflow: bool = Field(
        ...,
        description="Flag peringatan apakah stok mengalami defisit / anomali minus"
    )

    model_config = ConfigDict(from_attributes=True)


class TrenHarianResponse(BaseModel):
    """
    Schema data point deret waktu harian untuk grafik tren perbandingan produksi vs penjualan.
    """
    tanggal: date = Field(..., description="Tanggal transaksi / panen")
    butir_produksi: int = Field(..., description="Total butir telur normal dipanen")
    butir_terjual: int = Field(..., description="Total butir telur fisik terjual")

    model_config = ConfigDict(from_attributes=True)


class DashboardSummaryResponse(BaseModel):
    """
    Schema terpadu ringkasan eksekutif dashboard (API Aggregation Pattern).
    """
    tanggal_referensi: date = Field(
        ...,
        description="Tanggal acuan dashboard (default: hari ini)"
    )
    hdp_hari_ini: HDPHariIniResponse = Field(
        ...,
        description="Ringkasan metrik HDP dan populasi ayam hari ini"
    )
    keuangan_bulan_ini: KeuanganBulanIniResponse = Field(
        ...,
        description="Ringkasan performa finansial laba/rugi MTD"
    )
    stok_gudang: StokGudangResponse = Field(
        ...,
        description="Ringkasan stok telur siap jual di gudang"
    )
    tren_7_hari: List[TrenHarianResponse] = Field(
        default_factory=list,
        description="Deret data tren perbandingan produksi vs penjualan 7 hari terakhir"
    )

    model_config = ConfigDict(from_attributes=True)
