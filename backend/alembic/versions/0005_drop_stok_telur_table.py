"""Drop unused stok_telur table

Revision ID: 0005_drop_stok_telur_table
Revises: 0004_add_created_at_to_penjualan
Create Date: 2026-09-10 18:46:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0005_drop_stok_telur_table"
down_revision: Union[str, None] = "0004_add_created_at_to_penjualan"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop indexes
    op.drop_index(op.f("ix_stok_telur_tanggal"), table_name="stok_telur")
    op.drop_index(op.f("ix_stok_telur_id"), table_name="stok_telur")
    # 2. Drop table
    op.drop_table("stok_telur")


def downgrade() -> None:
    # Re-create table and indexes on rollback
    op.create_table(
        "stok_telur",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tanggal", sa.Date(), nullable=False),
        sa.Column("stok_akhir", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_stok_telur_id"), "stok_telur", ["id"], unique=False)
    op.create_index(op.f("ix_stok_telur_tanggal"), "stok_telur", ["tanggal"], unique=False)
