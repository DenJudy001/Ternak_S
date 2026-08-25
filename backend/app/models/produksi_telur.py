from sqlalchemy import Column, Integer, String, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class ProduksiTelur(Base):
    __tablename__ = "produksi_telur"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    kandang_id = Column(
        Integer,
        ForeignKey("kandang.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    tanggal = Column(Date, nullable=False, index=True)
    jumlah_butir_normal = Column(Integer, nullable=False)
    jumlah_butir_retak = Column(Integer, nullable=False, default=0)
    jumlah_butir_pecah = Column(Integer, nullable=False, default=0)
    catatan = Column(String(255), nullable=True)

    # Relationships
    kandang = relationship("Kandang", back_populates="produksi_records")

    # Composite Unique Constraint: one production entry per cage per day
    __table_args__ = (
        UniqueConstraint("kandang_id", "tanggal", name="uq_produksi_kandang_tanggal"),
    )

    def __repr__(self):
        return (
            f"<ProduksiTelur id={self.id} kandang_id={self.kandang_id} "
            f"tanggal={self.tanggal} normal={self.jumlah_butir_normal}>"
        )
