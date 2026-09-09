from datetime import date
from typing import Dict, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.models.pengeluaran import KategoriPengeluaran


class PengeluaranBase(BaseModel):
    tanggal: date = Field(
        default_factory=date.today,
        description="Tanggal pengeluaran operasional dicatat"
    )
    kategori: KategoriPengeluaran = Field(
        ...,
        description="Kategori pengeluaran (pakan, obat_vaksin, operasional, gaji, peralatan, lain_lain)"
    )
    nominal: float = Field(
        ...,
        gt=0,
        description="Nominal biaya pengeluaran dalam Rupiah (harus > 0)"
    )
    jumlah_kg: Optional[float] = Field(
        None,
        gt=0,
        description="Bobot fisik pakan dalam satuan kilogram (wajib diisi jika kategori pakan)"
    )
    keterangan: Optional[str] = Field(
        None,
        description="Catatan atau rincian tambahan pengeluaran"
    )
    kandang_id: Optional[int] = Field(
        None,
        description="ID kandang jika dialokasikan ke kandang tertentu, atau null untuk biaya umum peternakan"
    )

    @model_validator(mode="after")
    def validate_pakan_kg(self):
        if self.kategori == KategoriPengeluaran.pakan:
            if self.jumlah_kg is None or self.jumlah_kg <= 0:
                raise ValueError("Jumlah pakan dalam satuan kg wajib diisi untuk kategori pakan.")
        else:
            self.jumlah_kg = None
        return self


class PengeluaranCreate(PengeluaranBase):
    """
    Schema untuk mencatat entri pengeluaran baru.
    Mewarisi PengeluaranBase.
    """
    pass


class PengeluaranUpdate(BaseModel):
    """
    Schema untuk pembaruan entri pengeluaran.
    Seluruh field bersifat opsional.
    """
    tanggal: Optional[date] = Field(
        None,
        description="Koreksi tanggal pengeluaran"
    )
    kategori: Optional[KategoriPengeluaran] = Field(
        None,
        description="Koreksi kategori pengeluaran"
    )
    nominal: Optional[float] = Field(
        None,
        gt=0,
        description="Koreksi nominal pengeluaran (harus > 0)"
    )
    jumlah_kg: Optional[float] = Field(
        None,
        gt=0,
        description="Koreksi bobot fisik pakan dalam kilogram"
    )
    keterangan: Optional[str] = Field(
        None,
        description="Koreksi catatan atau rincian pengeluaran"
    )
    kandang_id: Optional[int] = Field(
        None,
        description="Koreksi alokasi kandang (null jika biaya umum peternakan)"
    )

    @model_validator(mode="after")
    def validate_update_pakan_kg(self):
        if self.kategori is not None:
            if self.kategori == KategoriPengeluaran.pakan:
                if self.jumlah_kg is not None and self.jumlah_kg <= 0:
                    raise ValueError("Jumlah pakan dalam satuan kg wajib diisi untuk kategori pakan.")
            else:
                self.jumlah_kg = None
        elif self.jumlah_kg is not None and self.jumlah_kg <= 0:
            raise ValueError("Jumlah pakan dalam satuan kg harus lebih besar dari 0.")
        return self


class PengeluaranResponse(PengeluaranBase):
    """
    Schema respons entri pengeluaran.
    """
    id: int
    nama_kandang: Optional[str] = Field(
        None,
        description="Nama kandang jika pengeluaran dialokasikan ke kandang tertentu"
    )

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def validate_response(self):
        if self.kategori != KategoriPengeluaran.pakan:
            self.jumlah_kg = None
        return self


class PengeluaranSummaryResponse(BaseModel):
    """
    Schema respons agregasi ringkasan pengeluaran peternakan.
    """
    total_pengeluaran: float = Field(
        0.0,
        description="Total akumulasi pengeluaran dalam periode/filter terpilih"
    )
    total_kg_pakan: float = Field(
        0.0,
        description="Total akumulasi bobot fisik pakan (kg) dalam periode/filter terpilih"
    )
    breakdown_per_kategori: Dict[str, float] = Field(
        default_factory=dict,
        description="Rincian total pengeluaran per kategori"
    )

    model_config = ConfigDict(from_attributes=True)
