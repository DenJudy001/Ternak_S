from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.kandang import StatusKandang


class KandangBase(BaseModel):
    nama_kandang: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Nama atau nomor identifikasi kandang"
    )
    tanggal_mulai: date = Field(
        ...,
        description="Tanggal mulai siklus pemeliharaan kandang"
    )


class KandangCreate(KandangBase):
    jumlah_awal: int = Field(
        ...,
        gt=0,
        description="Jumlah awal ayam saat kandang mulai diisi (harus lebih dari 0)"
    )


class KandangUpdate(BaseModel):
    nama_kandang: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="Nama baru kandang"
    )
    tanggal_mulai: Optional[date] = Field(
        None,
        description="Tanggal mulai siklus baru/koreksi"
    )
    status: Optional[StatusKandang] = Field(
        None,
        description="Status operasional kandang: 'aktif' atau 'afkir'"
    )
    jumlah_awal: Optional[int] = Field(
        None,
        gt=0,
        description="Koreksi jumlah awal populasi ayam saat masuk kandang (Genesis Fact)"
    )


class KandangResponse(KandangBase):
    id: int
    jumlah_awal: int
    jumlah_saat_ini: int
    status: StatusKandang

    model_config = ConfigDict(from_attributes=True)
