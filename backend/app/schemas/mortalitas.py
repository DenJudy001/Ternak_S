from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class MortalitasBase(BaseModel):
    tanggal: date = Field(
        default_factory=date.today,
        description="Tanggal pencatatan mortalitas"
    )
    jumlah: int = Field(
        ...,
        gt=0,
        description="Jumlah ayam yang mati (harus lebih dari 0)"
    )
    keterangan: Optional[str] = Field(
        None,
        max_length=255,
        description="Keterangan atau penyebab kematian (opsional)"
    )


class MortalitasCreate(MortalitasBase):
    kandang_id: int = Field(
        ...,
        gt=0,
        description="ID kandang tempat ayam berada"
    )


class MortalitasResponse(MortalitasBase):
    id: int
    kandang_id: int

    model_config = ConfigDict(from_attributes=True)
