import enum
from typing import Optional
from sqlalchemy import Column, Integer, Date, Enum, Numeric, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class KategoriPengeluaran(str, enum.Enum):
    pakan = "pakan"
    obat_vaksin = "obat_vaksin"
    operasional = "operasional"
    gaji = "gaji"
    peralatan = "peralatan"
    lain_lain = "lain_lain"


class Pengeluaran(Base):
    __tablename__ = "pengeluaran"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tanggal = Column(Date, nullable=False, index=True)
    kategori = Column(
        Enum(KategoriPengeluaran, name="kategori_pengeluaran_enum"),
        nullable=False,
        index=True
    )
    nominal = Column(Numeric(14, 2), nullable=False)
    keterangan = Column(Text, nullable=True)
    kandang_id = Column(
        Integer,
        ForeignKey("kandang.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Relationships
    kandang = relationship("Kandang", back_populates="pengeluaran_records")

    @property
    def nama_kandang(self) -> Optional[str]:
        return self.kandang.nama_kandang if self.kandang else None

    def __repr__(self):
        return (
            f"<Pengeluaran id={self.id} tanggal={self.tanggal} "
            f"kategori='{self.kategori}' nominal={self.nominal} kandang_id={self.kandang_id}>"
        )
