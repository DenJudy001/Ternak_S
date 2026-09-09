"""
Pydantic Schemas untuk Layanan Stok Telur & Ledger Mutasi Gudang (T3.3)
"""

from datetime import date
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class StokSummaryResponse(BaseModel):
    """
    Schema payload respons ringkasan status stok telur gudang live.
    """
    target_date: Optional[date] = Field(
        None,
        description="Batas tanggal kalkulasi stok (None = keseluruhan waktu s/d hari ini)"
    )
    total_produksi: int = Field(
        ...,
        description="Total telur kotor yang dipanen (normal + retak + pecah)"
    )
    total_normal: int = Field(
        ...,
        description="Total butir telur kualitas normal"
    )
    total_retak: int = Field(
        ...,
        description="Total butir telur kualitas retak (masih layak jual)"
    )
    total_pecah: int = Field(
        ...,
        description="Total butir telur pecah saat panen (afkir)"
    )
    total_rusak: int = Field(
        ...,
        description="Total butir telur rusak/terbuang (= total pecah)"
    )
    total_layak_jual: int = Field(
        ...,
        description="Total butir telur layak jual (normal + retak)"
    )
    total_terjual: int = Field(
        ...,
        description="Total butir telur yang telah terjual"
    )
    stok_tersedia: int = Field(
        ...,
        description="Sisa saldo butir telur siap jual di gudang (layak_jual - terjual)"
    )
    tray: int = Field(
        ...,
        description="Konversi stok telur ke dalam satuan rak/tray utuh (1 tray = 30 butir)"
    )
    butir_eceran: int = Field(
        ...,
        description="Sisa butir telur di luar rak/tray utuh (stok % 30)"
    )
    estimasi_kg: float = Field(
        ...,
        description="Estimasi bobot total telur dalam satuan kilogram"
    )
    status_stok: str = Field(
        ...,
        description="Indikator kesehatan stok gudang ('aman', 'tipis', 'habis', 'defisit')"
    )

    model_config = ConfigDict(from_attributes=True)


class StokLedgerItem(BaseModel):
    """
    Schema untuk satu baris mutasi harian pada buku besar (ledger) stok telur.
    """
    tanggal: date = Field(..., description="Tanggal mutasi aliran stok")
    masuk_normal: int = Field(..., description="Panen telur kualitas normal hari ini")
    masuk_retak: int = Field(..., description="Panen telur kualitas retak hari ini")
    masuk_layak: int = Field(..., description="Total telur layak masuk gudang (normal + retak)")
    rusak_pecah: int = Field(..., description="Telur rusak/pecah saat panen hari ini (afkir)")
    keluar_terjual: int = Field(..., description="Telur keluar yang terjual hari ini")
    perubahan_netto: int = Field(..., description="Selisih netto aliran hari ini (masuk_layak - keluar_terjual)")
    saldo_akhir: int = Field(..., description="Saldo kumulatif stok gudang pada akhir hari")
    status_harian: str = Field(..., description="Status stok pada akhir hari ('aman', 'tipis', 'habis', 'defisit')")

    model_config = ConfigDict(from_attributes=True)


class StokLedgerResponse(BaseModel):
    """
    Schema payload respons daftar buku mutasi stok telur dengan running balance.
    """
    start_date: Optional[date] = Field(None, description="Awal rentang filter tanggal")
    end_date: Optional[date] = Field(None, description="Akhir rentang filter tanggal")
    saldo_awal: int = Field(0, description="Saldo awal terbawa sebelum tanggal start_date")
    total_records: int = Field(..., description="Jumlah catatan baris tanggal mutasi")
    items: List[StokLedgerItem] = Field(default_factory=list, description="Daftar baris mutasi harian")

    model_config = ConfigDict(from_attributes=True)
