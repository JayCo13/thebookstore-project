"""merge_ghn_branches

Revision ID: bc604c55551b
Revises: 40780d8345d3, 9a84b98a357c
Create Date: 2025-10-28 12:23:24.484408

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bc604c55551b'
down_revision = ('40780d8345d3', '9a84b98a357c')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass