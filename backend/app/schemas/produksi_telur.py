from datetime import date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field


class ProduksiTelurBase(BaseModel):
    tanggal: date = Field(
        default_factory=date.today,
        description="Tanggal pencatatan produksi telur"
    )
    jumlah_butir_normal: int = Field(
        ...,
        ge=0,
        description="Jumlah butir telur berkualitas normal/bagus (harus >= 0)"
    )
    jumlah_butir_retak: int = Field(
        default=0,
        ge=0,
        description="Jumlah butir telur dengan cangkang retak halus (harus >= 0)"
    )
    jumlah_butir_pecah: int = Field(
        default=0,
        ge=0,
        description="Jumlah butir telur pecah/rusak (harus >= 0)"
    )
    catatan: Optional[str] = Field(
        None,
        max_length=255,
        description="Catatan tambahan seputar kondisi produksi telur (opsional)"
    )


class ProduksiTelurCreate(ProduksiTelurBase):
    kandang_id: int = Field(
        ...,
        gt=0,
        description="ID kandang tempat telur diproduksi"
    )


class ProduksiTelurUpdate(BaseModel):
    tanggal: Optional[date] = Field(
        None,
        description="Koreksi tanggal pencatatan produksi"
    )
    jumlah_butir_normal: Optional[int] = Field(
        None,
        ge=0,
        description="Koreksi jumlah butir telur normal (harus >= 0 jika diisi)"
    )
    jumlah_butir_retak: Optional[int] = Field(
        None,
        ge=0,
        description="Koreksi jumlah butir telur retak (harus >= 0 jika diisi)"
    )
    jumlah_butir_pecah: Optional[int] = Field(
        None,
        ge=0,
        description="Koreksi jumlah butir telur pecah (harus >= 0 jika diisi)"
    )
    catatan: Optional[str] = Field(
        None,
        max_length=255,
        description="Koreksi catatan tambahan"
    )


class ProduksiTelurResponse(ProduksiTelurBase):
    id: int
    kandang_id: int

    model_config = ConfigDict(from_attributes=True)


class ProduksiTelurDetailResponse(ProduksiTelurResponse):
    nama_kandang: Optional[str] = Field(
        None,
        description="Nama kandang hasil join relasi tabel kandang"
    )
    populasi_ayam: Optional[int] = Field(
        None,
        description="Populasi ayam hidup saat pencatatan"
    )
    hdp_percentage: Optional[float] = Field(
        None,
        description="Persentase Hen Day Production (%) dihitung on-the-fly"
    )

    @computed_field
    @property
    def total_butir(self) -> int:
        """
        Total akumulasi seluruh butir telur (normal + retak + pecah).
        """
        return self.jumlah_butir_normal + self.jumlah_butir_retak + self.jumlah_butir_pecah


# --- Skema Analitik Performa & Visualisasi Grafik (T2.3) ---

class PerformanceDataPoint(BaseModel):
    tanggal: date = Field(..., description="Tanggal data titik performa")
    kandang_id: int = Field(..., description="ID kandang")
    nama_kandang: str = Field(..., description="Nama kandang")
    jumlah_butir_normal: int = Field(..., ge=0, description="Kuantitas butir telur normal")
    jumlah_butir_retak: int = Field(..., ge=0, description="Kuantitas butir telur retak")
    jumlah_butir_pecah: int = Field(..., ge=0, description="Kuantitas butir telur pecah")
    total_butir: int = Field(..., ge=0, description="Total butir panen")
    populasi_ayam: int = Field(..., ge=0, description="Populasi ayam hidup saat ini")
    hdp_percentage: float = Field(..., ge=0.0, description="Persentase HDP (Hen Day Production)")


class PerformanceSummary(BaseModel):
    rata_rata_hdp: float = Field(..., ge=0.0, description="Rata-rata persentase HDP periode terpilih")
    total_butir_normal: int = Field(..., ge=0, description="Total akumulasi telur normal")
    total_butir_retak: int = Field(..., ge=0, description="Total akumulasi telur retak")
    total_butir_pecah: int = Field(..., ge=0, description="Total akumulasi telur pecah")
    total_seluruh_butir: int = Field(..., ge=0, description="Total keseluruhan panen semua kategori")
    persentase_telur_abnormal: float = Field(
        ...,
        ge=0.0,
        description="Persentase telur rusak/retak/pecah terhadap total produksi (%)"
    )


class ProduksiAnalyticsResponse(BaseModel):
    data_points: List[PerformanceDataPoint] = Field(
        ...,
        description="Deret titik data waktu kronologis menaik (ASC) siap dikonsumsi grafik"
    )
    summary: PerformanceSummary = Field(
        ...,
        description="Ringkasan agregasi metrik performa periode"
    )
