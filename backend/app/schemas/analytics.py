"""
Schemas: Performance Analytics & FCR

Pydantic models untuk validasi dan serialisasi respons analitik performa peternakan (FCR & Tren 30 Hari).
"""

from datetime import date
from typing import Optional
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
