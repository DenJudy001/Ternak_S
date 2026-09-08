"""Add created_at column to penjualan table for T3.2

Revision ID: 0004_add_created_at_to_penjualan
Revises: 0003_update_pengeluaran_schema
Create Date: 2026-09-08 17:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0004_add_created_at_to_penjualan"
down_revision: Union[str, None] = "0003_update_pengeluaran_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add created_at column with timezone and default func.now()
    op.add_column(
        "penjualan",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False
        )
    )


def downgrade() -> None:
    op.drop_column("penjualan", "created_at")
