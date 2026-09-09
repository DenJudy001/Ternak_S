from datetime import date
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.penjualan import Penjualan, SatuanJual
from app.repositories.penjualan_repository import PenjualanRepository
from app.schemas.penjualan import PenjualanCreate, PenjualanUpdate


def calculate_penjualan_totals(
    kuantitas: float,
    harga_satuan: float,
    satuan_jual: SatuanJual,
    jumlah_butir_manual: Optional[int] = None,
    bobot_butir_kg: Optional[float] = None,
) -> Tuple[float, int]:
    """
    Pure calculation function:
    1. Menghitung nilai transaksi finansial: total = round(kuantitas * harga_satuan, 2).
    2. Menghitung konversi butir fisik (Inventory Unit Normalization):
       - Prioritas 1: Jika jumlah_butir_manual diisi (> 0), gunakan override manual tersebut.
       - Prioritas 2:
         - butir: int(kuantitas)
         - tray: int(round(kuantitas * 30))
         - kg: int(round(kuantitas / bobot_butir_kg))
    """
    total = round(float(kuantitas) * float(harga_satuan), 2)

    # Prioritas 1: Manual Override (hanya berlaku jika satuan_jual == SatuanJual.kg)
    if satuan_jual == SatuanJual.kg and jumlah_butir_manual is not None and jumlah_butir_manual > 0:
        return total, int(jumlah_butir_manual)

    # Prioritas 2: Kalkulasi berbasis Satuan Jual
    if satuan_jual == SatuanJual.butir:
        jumlah_butir = int(kuantitas)
    elif satuan_jual == SatuanJual.tray:
        jumlah_butir = int(round(kuantitas * 30))
    elif satuan_jual == SatuanJual.kg:
        bobot_kg = bobot_butir_kg if bobot_butir_kg is not None else settings.DEFAULT_BOBOT_BUTIR_KG
        if bobot_kg <= 0:
            bobot_kg = 0.06
        jumlah_butir = int(round(kuantitas / bobot_kg))
    else:
        jumlah_butir = int(kuantitas)

    return total, max(0, jumlah_butir)


class PenjualanService:
    """
    Business Logic Layer untuk Penjualan Telur.
    Menangani kalkulasi server-side deterministik, normalisasi butir fisik,
    dan orkestrasi transaksi basis data.
    """

    @staticmethod
    def create_penjualan(db: Session, data: PenjualanCreate) -> Penjualan:
        """
        Mencatat transaksi penjualan telur baru.
        Aturan Bisnis:
        1. Kuantitas dan harga_satuan harus bernilai positif (> 0).
        2. Total dan jumlah_butir dihitung secara deterministik di server.
        """
        if data.kuantitas <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Kuantitas penjualan harus lebih besar dari 0."
            )
        if data.harga_satuan <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Harga satuan harus lebih besar dari 0."
            )

        total, jumlah_butir = calculate_penjualan_totals(
            kuantitas=data.kuantitas,
            harga_satuan=float(data.harga_satuan),
            satuan_jual=data.satuan_jual,
            jumlah_butir_manual=data.jumlah_butir_manual,
            bobot_butir_kg=settings.DEFAULT_BOBOT_BUTIR_KG,
        )

        penjualan_data = {
            "tanggal": data.tanggal,
            "satuan_jual": data.satuan_jual,
            "harga_satuan": data.harga_satuan,
            "total": total,
            "jumlah_butir": jumlah_butir,
            "pembeli": data.pembeli.strip() if data.pembeli else None,
        }

        return PenjualanRepository.create(db, penjualan_data)

    @staticmethod
    def get_penjualan_by_id(db: Session, penjualan_id: int) -> Penjualan:
        """
        Mengambil 1 record transaksi penjualan berdasarkan ID.
        Melempar HTTP 404 jika tidak ditemukan.
        """
        penjualan = PenjualanRepository.get_by_id(db, penjualan_id)
        if not penjualan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Data penjualan dengan ID {penjualan_id} tidak ditemukan."
            )
        return penjualan

    @staticmethod
    def get_penjualan_list(
        db: Session,
        satuan_jual: Optional[SatuanJual] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        search_pembeli: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Penjualan]:
        """
        Mengambil daftar riwayat transaksi penjualan dengan filter dan pagination.
        Memvalidasi agar start_date <= end_date.
        """
        if start_date and end_date and start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tanggal mulai (start_date) tidak boleh lebih besar dari tanggal akhir (end_date)."
            )

        return PenjualanRepository.get_all(
            db=db,
            satuan_jual=satuan_jual,
            start_date=start_date,
            end_date=end_date,
            search_pembeli=search_pembeli,
            limit=limit,
            offset=offset,
        )

    @staticmethod
    def get_penjualan_summary(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Mengambil ringkasan agregasi KPI penjualan (total pendapatan, total butir, breakdown satuan).
        Memvalidasi agar start_date <= end_date.
        """
        if start_date and end_date and start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tanggal mulai (start_date) tidak boleh lebih besar dari tanggal akhir (end_date)."
            )

        return PenjualanRepository.get_summary(
            db=db,
            start_date=start_date,
            end_date=end_date,
        )

    @staticmethod
    def update_penjualan(
        db: Session,
        penjualan_id: int,
        data: PenjualanUpdate,
    ) -> Penjualan:
        """
        Memperbarui record penjualan secara parsial.
        Jika kuantitas, harga_satuan, satuan_jual, atau jumlah_butir_manual berubah,
        total dan jumlah_butir akan dihitung ulang secara deterministik.
        """
        db_penjualan = PenjualanService.get_penjualan_by_id(db, penjualan_id)

        update_dict = data.model_dump(exclude_unset=True)

        if "kuantitas" in update_dict and update_dict["kuantitas"] is not None:
            if update_dict["kuantitas"] <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Kuantitas penjualan harus lebih besar dari 0."
                )

        if "harga_satuan" in update_dict and update_dict["harga_satuan"] is not None:
            if update_dict["harga_satuan"] <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Harga satuan harus lebih besar dari 0."
                )

        # Cek apakah kalkulasi ulang dibutuhkan
        needs_recalc = any(
            k in update_dict
            for k in ("kuantitas", "harga_satuan", "satuan_jual", "jumlah_butir_manual")
        )

        if needs_recalc:
            eff_kuantitas = (
                update_dict["kuantitas"]
                if "kuantitas" in update_dict and update_dict["kuantitas"] is not None
                else db_penjualan.kuantitas
            )
            eff_harga = (
                float(update_dict["harga_satuan"])
                if "harga_satuan" in update_dict and update_dict["harga_satuan"] is not None
                else float(db_penjualan.harga_satuan)
            )
            eff_satuan = (
                update_dict["satuan_jual"]
                if "satuan_jual" in update_dict and update_dict["satuan_jual"] is not None
                else db_penjualan.satuan_jual
            )
            eff_manual = update_dict.get("jumlah_butir_manual", None)
            if eff_satuan != SatuanJual.kg:
                eff_manual = None

            new_total, new_jumlah_butir = calculate_penjualan_totals(
                kuantitas=eff_kuantitas,
                harga_satuan=eff_harga,
                satuan_jual=eff_satuan,
                jumlah_butir_manual=eff_manual,
                bobot_butir_kg=settings.DEFAULT_BOBOT_BUTIR_KG,
            )
            update_dict["total"] = new_total
            update_dict["jumlah_butir"] = new_jumlah_butir

        # Bersihkan field pembantu yang tidak ada di kolom tabel penjualan
        update_dict.pop("kuantitas", None)
        update_dict.pop("jumlah_butir_manual", None)

        if "pembeli" in update_dict and update_dict["pembeli"]:
            update_dict["pembeli"] = update_dict["pembeli"].strip()

        return PenjualanRepository.update(db, db_penjualan, update_dict)

    @staticmethod
    def delete_penjualan(db: Session, penjualan_id: int) -> None:
        """
        Menghapus record fisik penjualan dari basis data.
        """
        db_penjualan = PenjualanService.get_penjualan_by_id(db, penjualan_id)
        PenjualanRepository.delete(db, db_penjualan)
