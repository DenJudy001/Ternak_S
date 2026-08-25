"""Initial migration for SiTernak 6 main tables

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-08-25 11:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create table kandang
    op.create_table(
        "kandang",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nama_kandang", sa.String(length=100), nullable=False),
        sa.Column("tanggal_mulai", sa.Date(), nullable=False),
        sa.Column("jumlah_awal", sa.Integer(), nullable=False),
        sa.Column("jumlah_saat_ini", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("aktif", "afkir", name="status_kandang_enum"),
            nullable=False
        ),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_kandang_id"), "kandang", ["id"], unique=False)
    op.create_index(op.f("ix_kandang_nama_kandang"), "kandang", ["nama_kandang"], unique=False)

    # 2. Create table mortalitas
    op.create_table(
        "mortalitas",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("kandang_id", sa.Integer(), nullable=False),
        sa.Column("tanggal", sa.Date(), nullable=False),
        sa.Column("jumlah", sa.Integer(), nullable=False),
        sa.Column("keterangan", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(
            ["kandang_id"],
            ["kandang.id"],
            name="fk_mortalitas_kandang_id",
            ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_mortalitas_id"), "mortalitas", ["id"], unique=False)
    op.create_index(op.f("ix_mortalitas_kandang_id"), "mortalitas", ["kandang_id"], unique=False)
    op.create_index(op.f("ix_mortalitas_tanggal"), "mortalitas", ["tanggal"], unique=False)

    # 3. Create table produksi_telur
    op.create_table(
        "produksi_telur",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("kandang_id", sa.Integer(), nullable=False),
        sa.Column("tanggal", sa.Date(), nullable=False),
        sa.Column("jumlah_butir_normal", sa.Integer(), nullable=False),
        sa.Column("jumlah_butir_retak", sa.Integer(), server_default="0", nullable=False),
        sa.Column("jumlah_butir_pecah", sa.Integer(), server_default="0", nullable=False),
        sa.Column("catatan", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(
            ["kandang_id"],
            ["kandang.id"],
            name="fk_produksi_telur_kandang_id",
            ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("kandang_id", "tanggal", name="uq_produksi_kandang_tanggal")
    )
    op.create_index(op.f("ix_produksi_telur_id"), "produksi_telur", ["id"], unique=False)
    op.create_index(op.f("ix_produksi_telur_kandang_id"), "produksi_telur", ["kandang_id"], unique=False)
    op.create_index(op.f("ix_produksi_telur_tanggal"), "produksi_telur", ["tanggal"], unique=False)

    # 4. Create table pengeluaran
    op.create_table(
        "pengeluaran",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tanggal", sa.Date(), nullable=False),
        sa.Column(
            "kategori",
            sa.Enum("pakan", "obat_vitamin", "listrik_air", "tenaga_kerja", "lainnya", name="kategori_pengeluaran_enum"),
            nullable=False
        ),
        sa.Column("deskripsi", sa.String(length=255), nullable=False),
        sa.Column("jumlah_kg", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("nominal", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_pengeluaran_id"), "pengeluaran", ["id"], unique=False)
    op.create_index(op.f("ix_pengeluaran_tanggal"), "pengeluaran", ["tanggal"], unique=False)
    op.create_index(op.f("ix_pengeluaran_kategori"), "pengeluaran", ["kategori"], unique=False)

    # 5. Create table penjualan
    op.create_table(
        "penjualan",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tanggal", sa.Date(), nullable=False),
        sa.Column("jumlah_butir", sa.Integer(), nullable=False),
        sa.Column(
            "satuan_jual",
            sa.Enum("butir", "kg", "tray", name="satuan_jual_enum"),
            nullable=False
        ),
        sa.Column("harga_satuan", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("total", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("pembeli", sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_penjualan_id"), "penjualan", ["id"], unique=False)
    op.create_index(op.f("ix_penjualan_tanggal"), "penjualan", ["tanggal"], unique=False)

    # 6. Create table stok_telur
    op.create_table(
        "stok_telur",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tanggal", sa.Date(), nullable=False),
        sa.Column("stok_akhir", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_stok_telur_id"), "stok_telur", ["id"], unique=False)
    op.create_index(op.f("ix_stok_telur_tanggal"), "stok_telur", ["tanggal"], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table("stok_telur")
    op.drop_table("penjualan")
    op.drop_table("pengeluaran")
    op.drop_table("produksi_telur")
    op.drop_table("mortalitas")
    op.drop_table("kandang")

    # Drop enum types (for PostgreSQL)
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        sa.Enum(name="satuan_jual_enum").drop(bind, checkfirst=True)
        sa.Enum(name="kategori_pengeluaran_enum").drop(bind, checkfirst=True)
        sa.Enum(name="status_kandang_enum").drop(bind, checkfirst=True)
