from sqlalchemy import Column, Integer, Date
from app.core.database import Base


class StokTelur(Base):
    __tablename__ = "stok_telur"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tanggal = Column(Date, nullable=False, index=True)
    stok_akhir = Column(Integer, nullable=False)

    def __repr__(self):
        return f"<StokTelur id={self.id} tanggal={self.tanggal} stok_akhir={self.stok_akhir}>"
