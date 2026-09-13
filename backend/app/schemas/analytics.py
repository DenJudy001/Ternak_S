"""
Schemas: Performance Analytics & FCR

Pydantic models untuk validasi dan serialisasi respons analitik performa peternakan (FCR & Tren 30 Hari).
"""

from datetime import date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class FCRAnalyticsResponse(BaseModel):
    """
    Schema respons analitik Feed Conversion Ratio (FCR).
    """
    start_date: date = Field(..., description="Tanggal awal evaluasi periode FCR")
    end_date: date = Field(..., description="Tanggal akhir evaluasi periode FCR")
    kandang_id: Optional[int] = Field(None, description="ID kandang spesifik atau null jika seluruh peternakan")
    total_kg_pakan: float = Field(..., description="Total akumulasi konsumsi pakan (kg)")
    total_butir_telur: int = Field(..., description="Total panen butir telur layak jual (normal + retak)")
    total_kg_telur: float = Field(..., description="Estimasi total bobot telur yang dihasilkan (kg)")
    fcr: float = Field(..., description="Nilai Feed Conversion Ratio (kg pakan / kg telur)")
    status_efisiensi: str = Field(
        ...,
        description="Klasifikasi efisiensi pakan: 'sangat_efisien', 'standar', 'boros', 'tidak_tersedia'"
    )
    benchmark_standar: str = Field(..., description="Rentang acuan FCR standar industri (2.10 - 2.35)")
    keterangan: str = Field(..., description="Catatan rekomendasi kontekstual berdasarkan capaian FCR")

    model_config = ConfigDict(from_attributes=True)


class DailyTrendPoint(BaseModel):
    """
    Schema data point harian pada grafik tren produksi 30 hari kontinu.
    """
    tanggal: date = Field(..., description="Tanggal kalender")
    butir_normal: int = Field(..., description="Jumlah butir telur normal")
    butir_retak: int = Field(..., description="Jumlah butir telur retak")
    butir_pecah: int = Field(..., description="Jumlah butir telur pecah")
    total_butir: int = Field(..., description="Total panen seluruh butir (normal + retak + pecah)")
    populasi_aktif: int = Field(..., description="Populasi ayam hidup efektif pada tanggal ini")
    hdp_persen: float = Field(..., description="Persentase Hen-Day Production (%)")
    is_recorded: bool = Field(..., description="Flag apakah ada catatan panen riil pada tanggal ini")

    model_config = ConfigDict(from_attributes=True)


class ProductionTrendResponse(BaseModel):
    """
    Schema respons grafik tren produksi 30 hari kontinu beserta metrik ringkasannya.
    """
    start_date: date = Field(..., description="Tanggal awal deret 30 hari")
    end_date: date = Field(..., description="Tanggal akhir deret 30 hari")
    kandang_id: Optional[int] = Field(None, description="ID kandang spesifik atau null jika seluruh peternakan")
    rata_rata_hdp: float = Field(..., description="Rata-rata persentase HDP dari hari-hari yang tercatat panen (%)")
    total_butir_normal_30d: int = Field(..., description="Total akumulasi telur normal selama rentang waktu 30 hari")
    peak_hdp_persen: float = Field(..., description="Capaian rekor persentase HDP tertinggi pada periode ini (%)")
    peak_hdp_tanggal: Optional[date] = Field(None, description="Tanggal saat rekor HDP tertinggi tercapai")
    points: List[DailyTrendPoint] = Field(default_factory=list, description="Deret 30 titik kalender berurutan ASC")

    model_config = ConfigDict(from_attributes=True)
