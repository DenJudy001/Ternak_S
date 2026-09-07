from datetime import date
from typing import Dict, Optional
from pydantic import BaseModel, ConfigDict, Field
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
    keterangan: Optional[str] = Field(
        None,
        description="Catatan atau rincian tambahan pengeluaran"
    )
    kandang_id: Optional[int] = Field(
        None,
        description="ID kandang jika dialokasikan ke kandang tertentu, atau null untuk biaya umum peternakan"
    )


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
    keterangan: Optional[str] = Field(
        None,
        description="Koreksi catatan atau rincian pengeluaran"
    )
    kandang_id: Optional[int] = Field(
        None,
        description="Koreksi alokasi kandang (null jika biaya umum peternakan)"
    )


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


class PengeluaranSummaryResponse(BaseModel):
    """
    Schema respons agregasi ringkasan pengeluaran peternakan.
    """
    total_pengeluaran: float = Field(
        0.0,
        description="Total akumulasi pengeluaran dalam periode/filter terpilih"
    )
    breakdown_per_kategori: Dict[str, float] = Field(
        default_factory=dict,
        description="Rincian total pengeluaran per kategori"
    )

    model_config = ConfigDict(from_attributes=True)
