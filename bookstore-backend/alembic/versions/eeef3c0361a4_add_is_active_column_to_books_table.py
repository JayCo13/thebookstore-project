"""add_is_active_column_to_books_table

Revision ID: eeef3c0361a4
Revises: 6e88cca92d6b
Create Date: 2025-10-17 21:41:08.466480

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'eeef3c0361a4'
down_revision = '6e88cca92d6b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_active column to books table
    op.add_column('books', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'))


def downgrade() -> None:
    # Remove is_active column from books table
    op.drop_column('books', 'is_active')