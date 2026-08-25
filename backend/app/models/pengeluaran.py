import enum
from sqlalchemy import Column, Integer, String, Date, Enum, Numeric
from app.core.database import Base


class KategoriPengeluaran(str, enum.Enum):
    pakan = "pakan"
    obat_vitamin = "obat_vitamin"
    listrik_air = "listrik_air"
    tenaga_kerja = "tenaga_kerja"
    lainnya = "lainnya"


class Pengeluaran(Base):
    __tablename__ = "pengeluaran"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tanggal = Column(Date, nullable=False, index=True)
    kategori = Column(
        Enum(KategoriPengeluaran, name="kategori_pengeluaran_enum"),
        nullable=False,
        index=True
    )
    deskripsi = Column(String(255), nullable=False)
    # Numeric/Decimal for precise weights and financial values
    jumlah_kg = Column(Numeric(10, 2), nullable=True)
    nominal = Column(Numeric(14, 2), nullable=False)

    def __repr__(self):
        return (
            f"<Pengeluaran id={self.id} tanggal={self.tanggal} "
            f"kategori='{self.kategori}' nominal={self.nominal}>"
        )
