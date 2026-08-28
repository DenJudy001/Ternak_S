from datetime import date
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.kandang import StatusKandang
from app.models.produksi_telur import ProduksiTelur
from app.repositories.kandang_repository import KandangRepository
from app.repositories.produksi_telur_repository import ProduksiTelurRepository
from app.schemas.produksi_telur import ProduksiTelurCreate, ProduksiTelurUpdate


class ProduksiTelurService:
    """
    Business Logic Layer untuk pengelolaan pencatatan dan riwayat produksi telur harian.
    Menerapkan validasi multi-level pencegahan duplikasi data (Service check & DB Integrity Constraint).
    """

    @staticmethod
    def create_produksi(db: Session, data: ProduksiTelurCreate) -> ProduksiTelur:
        """
        Mencatat data produksi telur harian baru.
        
        Aturan Bisnis:
        1. Memvalidasi keberadaan kandang (404 jika tidak ditemukan).
        2. Memvalidasi status kandang (400 jika kandang berstatus 'afkir').
        3. Memvalidasi duplikasi tanggal pada kandang yang sama (409 Conflict).
        4. Melindungi race condition dengan menangkap IntegrityError dari basis data.
        """
        # 1. Validasi keberadaan kandang
        kandang = KandangRepository.get_by_id(db, data.kandang_id)
        if not kandang:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Kandang dengan ID {data.kandang_id} tidak ditemukan."
            )

        # 2. Validasi status kandang aktif
        if kandang.status != StatusKandang.aktif:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tidak dapat mencatat data produksi telur pada kandang yang sudah berstatus 'afkir'."
            )

        # 3. Pengecekan duplikasi entri (kandang_id + tanggal)
        existing = ProduksiTelurRepository.get_by_kandang_and_date(db, data.kandang_id, data.tanggal)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Data produksi telur untuk kandang '{kandang.nama_kandang}' pada tanggal "
                    f"{data.tanggal} sudah pernah dicatat (ID #{existing.id})."
                )
            )

        # 4. Transaksi database & penanganan race condition
        try:
            produksi_dict = {
                "kandang_id": data.kandang_id,
                "tanggal": data.tanggal,
                "jumlah_butir_normal": data.jumlah_butir_normal,
                "jumlah_butir_retak": data.jumlah_butir_retak,
                "jumlah_butir_pecah": data.jumlah_butir_pecah,
                "catatan": data.catatan.strip() if data.catatan else None,
            }
            db_produksi = ProduksiTelurRepository.create(db, produksi_dict)
            db.commit()
            db.refresh(db_produksi)
            return db_produksi
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Terjadi konflik duplikasi data produksi telur pada kandang '{kandang.nama_kandang}' "
                    f"untuk tanggal {data.tanggal}."
                )
            )
        except Exception as exc:
            db.rollback()
            if isinstance(exc, HTTPException):
                raise exc
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gagal menyimpan data produksi telur: {str(exc)}"
            )

    @staticmethod
    def get_produksi_by_id(db: Session, produksi_id: int) -> ProduksiTelur:
        """
        Mengambil 1 entitas data produksi telur berdasarkan ID.
        """
        produksi = ProduksiTelurRepository.get_by_id(db, produksi_id)
        if not produksi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Data produksi telur dengan ID {produksi_id} tidak ditemukan."
            )
        return produksi

    @staticmethod
    def update_produksi(
        db: Session,
        produksi_id: int,
        data: ProduksiTelurUpdate
    ) -> ProduksiTelur:
        """
        Memperbarui catatan produksi telur (Partial Update).
        
        Aturan Bisnis:
        1. Memvalidasi keberadaan record produksi (404 jika tidak ditemukan).
        2. Jika tanggal diubah, validasi apakah tanggal baru sudah ada pada kandang terkait (409 Conflict).
        3. Menjaga integritas data saat commit.
        """
        db_produksi = ProduksiTelurRepository.get_by_id(db, produksi_id)
        if not db_produksi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Data produksi telur dengan ID {produksi_id} tidak ditemukan."
            )

        update_dict = data.model_dump(exclude_unset=True)

        if "tanggal" in update_dict and update_dict["tanggal"] is not None:
            tanggal_baru = update_dict["tanggal"]
            if tanggal_baru != db_produksi.tanggal:
                existing = ProduksiTelurRepository.get_by_kandang_and_date(
                    db, db_produksi.kandang_id, tanggal_baru
                )
                if existing and existing.id != db_produksi.id:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=(
                            f"Tidak dapat mengubah tanggal ke {tanggal_baru} karena data produksi "
                            f"untuk tanggal tersebut sudah tercatat (ID #{existing.id})."
                        )
                    )

        if "catatan" in update_dict and update_dict["catatan"] is not None:
            update_dict["catatan"] = update_dict["catatan"].strip()

        try:
            ProduksiTelurRepository.update(db, db_produksi, update_dict)
            db.commit()
            db.refresh(db_produksi)
            return db_produksi
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Terjadi konflik duplikasi data saat memperbarui tanggal produksi telur."
            )
        except Exception as exc:
            db.rollback()
            if isinstance(exc, HTTPException):
                raise exc
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gagal memperbarui data produksi telur: {str(exc)}"
            )

    @staticmethod
    def delete_produksi(db: Session, produksi_id: int) -> Dict[str, Any]:
        """
        Menghapus record data produksi telur secara permanen dari basis data.
        """
        db_produksi = ProduksiTelurRepository.get_by_id(db, produksi_id)
        if not db_produksi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Data produksi telur dengan ID {produksi_id} tidak ditemukan."
            )

        try:
            ProduksiTelurRepository.delete(db, db_produksi)
            db.commit()
            return {
                "message": f"Data produksi telur #{produksi_id} berhasil dihapus."
            }
        except Exception as exc:
            db.rollback()
            if isinstance(exc, HTTPException):
                raise exc
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gagal menghapus data produksi telur: {str(exc)}"
            )

    @staticmethod
    def get_riwayat_produksi(
        db: Session,
        kandang_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Mengambil riwayat data produksi telur dengan filter dinamis kandang dan rentang tanggal.
        Memvalidasi konsistensi tanggal (start_date <= end_date) dan menyertakan nama_kandang hasil eager load.
        """
        # 1. Validasi konsistensi rentang tanggal
        if start_date is not None and end_date is not None:
            if start_date > end_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Rentang tanggal tidak valid: tanggal awal ({start_date}) "
                        f"tidak boleh lebih besar dari tanggal akhir ({end_date})."
                    )
                )

        # 2. Validasi kandang jika kandang_id diberikan
        if kandang_id is not None:
            kandang = KandangRepository.get_by_id(db, kandang_id)
            if not kandang:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Kandang dengan ID {kandang_id} tidak ditemukan."
                )

        # 3. Query repository dengan joinedload
        records = ProduksiTelurRepository.get_history(
            db,
            kandang_id=kandang_id,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset
        )

        # 4. Map ke list detail dengan nama_kandang
        results = []
        for r in records:
            results.append({
                "id": r.id,
                "kandang_id": r.kandang_id,
                "tanggal": r.tanggal,
                "jumlah_butir_normal": r.jumlah_butir_normal,
                "jumlah_butir_retak": r.jumlah_butir_retak,
                "jumlah_butir_pecah": r.jumlah_butir_pecah,
                "catatan": r.catatan,
                "nama_kandang": r.kandang.nama_kandang if r.kandang else None,
            })
        return results

    @staticmethod
    def get_produksi_by_kandang(
        db: Session,
        kandang_id: int,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Mengambil riwayat produksi telur khusus untuk kandang tertentu.
        """
        return ProduksiTelurService.get_riwayat_produksi(
            db, kandang_id=kandang_id, limit=limit, offset=offset
        )

    @staticmethod
    def get_all_produksi(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Mengambil seluruh data produksi telur lintas kandang dengan filter rentang tanggal.
        """
        return ProduksiTelurService.get_riwayat_produksi(
            db, start_date=start_date, end_date=end_date, limit=limit, offset=offset
        )
