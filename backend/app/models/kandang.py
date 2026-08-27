import enum
from sqlalchemy import Column, Integer, String, Date, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base


class StatusKandang(str, enum.Enum):
    aktif = "aktif"
    afkir = "afkir"


class Kandang(Base):
    __tablename__ = "kandang"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nama_kandang = Column(String(100), nullable=False, index=True)
    tanggal_mulai = Column(Date, nullable=False)
    jumlah_awal = Column(Integer, nullable=False)
    jumlah_saat_ini = Column(Integer, nullable=False)
    status = Column(
        Enum(StatusKandang, name="status_kandang_enum"),
        nullable=False,
        default=StatusKandang.aktif
    )

    # Relationships
    mortalitas_records = relationship(
        "Mortalitas",
        back_populates="kandang",
        passive_deletes=True
    )
    produksi_records = relationship(
        "ProduksiTelur",
        back_populates="kandang",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    def __repr__(self):
        return f"<Kandang id={self.id} nama='{self.nama_kandang}' status='{self.status}'>"
