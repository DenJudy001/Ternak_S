"""Update pengeluaran table schema for T3.1

Revision ID: 0003_update_pengeluaran_schema
Revises: 0002_create_users_table
Create Date: 2026-09-07 21:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0003_update_pengeluaran_schema"
down_revision: Union[str, None] = "0002_create_users_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # 1. Add kandang_id column (nullable) and foreign key to kandang.id
    op.add_column("pengeluaran", sa.Column("kandang_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_pengeluaran_kandang_id",
        "pengeluaran",
        "kandang",
        ["kandang_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_pengeluaran_kandang_id"),
        "pengeluaran",
        ["kandang_id"],
        unique=False,
    )

    # 2. Add keterangan column (Text, nullable) and migrate data from deskripsi if exists
    op.add_column("pengeluaran", sa.Column("keterangan", sa.Text(), nullable=True))
    op.execute("UPDATE pengeluaran SET keterangan = deskripsi WHERE keterangan IS NULL AND deskripsi IS NOT NULL")
    op.drop_column("pengeluaran", "deskripsi")

    # 3. Update ENUM kategori_pengeluaran_enum if using PostgreSQL
    if is_postgres:
        # Detach column from existing enum type to avoid type conflict during alteration
        op.execute("ALTER TABLE pengeluaran ALTER COLUMN kategori TYPE VARCHAR(50)")
        op.execute("DROP TYPE IF EXISTS kategori_pengeluaran_enum CASCADE")
        op.execute(
            "CREATE TYPE kategori_pengeluaran_enum AS ENUM "
            "('pakan', 'obat_vaksin', 'operasional', 'gaji', 'peralatan', 'lain_lain')"
        )
        # Migrate existing data values to new enum categories
        op.execute("UPDATE pengeluaran SET kategori = 'obat_vaksin' WHERE kategori = 'obat_vitamin'")
        op.execute("UPDATE pengeluaran SET kategori = 'operasional' WHERE kategori = 'listrik_air'")
        op.execute("UPDATE pengeluaran SET kategori = 'gaji' WHERE kategori = 'tenaga_kerja'")
        op.execute("UPDATE pengeluaran SET kategori = 'lain_lain' WHERE kategori = 'lainnya'")
        op.execute(
            "UPDATE pengeluaran SET kategori = 'lain_lain' "
            "WHERE kategori NOT IN ('pakan', 'obat_vaksin', 'operasional', 'gaji', 'peralatan', 'lain_lain')"
        )
        # Re-attach column to the updated enum type
        op.execute(
            "ALTER TABLE pengeluaran ALTER COLUMN kategori "
            "TYPE kategori_pengeluaran_enum USING kategori::kategori_pengeluaran_enum"
        )


def downgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # Re-add deskripsi
    op.add_column("pengeluaran", sa.Column("deskripsi", sa.String(length=255), nullable=True))
    op.execute("UPDATE pengeluaran SET deskripsi = keterangan WHERE deskripsi IS NULL AND keterangan IS NOT NULL")
    op.alter_column("pengeluaran", "deskripsi", nullable=False)
    op.drop_column("pengeluaran", "keterangan")

    # Drop foreign key and index for kandang_id
    op.drop_constraint("fk_pengeluaran_kandang_id", "pengeluaran", type_="foreignkey")
    op.drop_index(op.f("ix_pengeluaran_kandang_id"), table_name="pengeluaran")
    op.drop_column("pengeluaran", "kandang_id")

    # Revert ENUM if PostgreSQL
    if is_postgres:
        op.execute("ALTER TABLE pengeluaran ALTER COLUMN kategori TYPE VARCHAR(50)")
        op.execute("DROP TYPE IF EXISTS kategori_pengeluaran_enum CASCADE")
        op.execute(
            "CREATE TYPE kategori_pengeluaran_enum AS ENUM "
            "('pakan', 'obat_vitamin', 'listrik_air', 'tenaga_kerja', 'lainnya')"
        )
        op.execute("UPDATE pengeluaran SET kategori = 'obat_vitamin' WHERE kategori = 'obat_vaksin'")
        op.execute("UPDATE pengeluaran SET kategori = 'listrik_air' WHERE kategori = 'operasional'")
        op.execute("UPDATE pengeluaran SET kategori = 'tenaga_kerja' WHERE kategori = 'gaji'")
        op.execute("UPDATE pengeluaran SET kategori = 'lainnya' WHERE kategori IN ('peralatan', 'lain_lain')")
        op.execute(
            "ALTER TABLE pengeluaran ALTER COLUMN kategori "
            "TYPE kategori_pengeluaran_enum USING kategori::kategori_pengeluaran_enum"
        )
