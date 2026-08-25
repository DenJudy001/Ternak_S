from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Mortalitas(Base):
    __tablename__ = "mortalitas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    kandang_id = Column(
        Integer,
        ForeignKey("kandang.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    tanggal = Column(Date, nullable=False, index=True)
    jumlah = Column(Integer, nullable=False)
    keterangan = Column(String(255), nullable=True)

    # Relationships
    kandang = relationship("Kandang", back_populates="mortalitas_records")

    def __repr__(self):
        return f"<Mortalitas id={self.id} kandang_id={self.kandang_id} tanggal={self.tanggal} jumlah={self.jumlah}>"
