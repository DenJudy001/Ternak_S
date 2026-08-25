import enum
from sqlalchemy import Column, Integer, String, Date, Enum, Numeric
from app.core.database import Base


class SatuanJual(str, enum.Enum):
    butir = "butir"
    kg = "kg"
    tray = "tray"


class Penjualan(Base):
    __tablename__ = "penjualan"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tanggal = Column(Date, nullable=False, index=True)
    jumlah_butir = Column(Integer, nullable=False)
    satuan_jual = Column(
        Enum(SatuanJual, name="satuan_jual_enum"),
        nullable=False
    )
    # Numeric/Decimal for unit price and total revenue
    harga_satuan = Column(Numeric(12, 2), nullable=False)
    total = Column(Numeric(14, 2), nullable=False)
    pembeli = Column(String(100), nullable=True)

    def __repr__(self):
        return (
            f"<Penjualan id={self.id} tanggal={self.tanggal} "
            f"jumlah_butir={self.jumlah_butir} total={self.total}>"
        )
