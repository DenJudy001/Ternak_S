from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


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
