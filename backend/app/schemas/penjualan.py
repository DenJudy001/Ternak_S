from datetime import date, datetime
from decimal import Decimal
from typing import Dict, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.penjualan import SatuanJual


class PenjualanBase(BaseModel):
    tanggal: date = Field(
        default_factory=date.today,
        description="Tanggal transaksi penjualan telur"
    )
    satuan_jual: SatuanJual = Field(
        default=SatuanJual.butir,
        description="Satuan komersial penjualan (butir, kg, tray)"
    )
    kuantitas: float = Field(
        ...,
        gt=0,
        description="Banyaknya unit transaksi yang dijual sesuai satuan_jual (> 0)"
    )
    harga_satuan: Decimal = Field(
        ...,
        gt=0,
        description="Harga per unit satuan transaksi dalam Rupiah (> 0)"
    )
    pembeli: Optional[str] = Field(
        None,
        max_length=100,
        description="Nama pembeli, agen, atau toko pengecer (opsional)"
    )
    jumlah_butir_manual: Optional[int] = Field(
        None,
        gt=0,
        description="Opsi override jumlah fisik butir telur riil hasil penimbangan manual"
    )


class PenjualanCreate(PenjualanBase):
    """
    Schema untuk pembuatan record transaksi penjualan baru.
    Mewarisi PenjualanBase.
    """
    pass


class PenjualanUpdate(BaseModel):
    """
    Schema untuk pembaruan entitas transaksi penjualan.
    Seluruh field bersifat opsional.
    """
    tanggal: Optional[date] = Field(
        None,
        description="Koreksi tanggal transaksi penjualan"
    )
    satuan_jual: Optional[SatuanJual] = Field(
        None,
        description="Koreksi satuan komersial penjualan"
    )
    kuantitas: Optional[float] = Field(
        None,
        gt=0,
        description="Koreksi kuantitas unit yang dijual"
    )
    harga_satuan: Optional[Decimal] = Field(
        None,
        gt=0,
        description="Koreksi harga per unit satuan transaksi"
    )
    pembeli: Optional[str] = Field(
        None,
        max_length=100,
        description="Koreksi nama pembeli atau pelanggan"
    )
    jumlah_butir_manual: Optional[int] = Field(
        None,
        gt=0,
        description="Koreksi override kuantitas butir fisik riil"
    )


class PenjualanResponse(BaseModel):
    """
    Schema representasi respons entri penjualan telur.
    """
    id: int
    tanggal: date
    jumlah_butir: int
    satuan_jual: SatuanJual
    harga_satuan: float
    total: float
    pembeli: Optional[str] = None
    created_at: Optional[datetime] = None
    kuantitas: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class PenjualanSummaryResponse(BaseModel):
    """
    Schema agregasi ringkasan penjualan (KPI pendapatan, total butir keluar, dan breakdown subtotal).
    """
    total_pendapatan: float = Field(
        0.0,
        description="Total akumulasi pendapatan penjualan dalam periode terpilih (Rupiah)"
    )
    total_butir_terjual: int = Field(
        0,
        description="Total akumulasi butir telur fisik yang keluar dari inventori"
    )
    total_transaksi: int = Field(
        0,
        description="Jumlah frekuensi transaksi penjualan yang tercatat"
    )
    breakdown_per_satuan: Dict[str, float] = Field(
        default_factory=dict,
        description="Rincian subtotal nominal pendapatan per satuan jual (butir, kg, tray)"
    )

    model_config = ConfigDict(from_attributes=True)
