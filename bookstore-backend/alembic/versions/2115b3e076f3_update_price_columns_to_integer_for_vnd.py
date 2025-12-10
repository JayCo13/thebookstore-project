"""update_price_columns_to_integer_for_vnd

Revision ID: 2115b3e076f3
Revises: b6e823fcc94b
Create Date: 2025-10-29 12:18:53.126855

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2115b3e076f3'
down_revision = 'b6e823fcc94b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update Books table price columns
    op.alter_column('books', 'price', type_=sa.Integer(), nullable=False)
    op.alter_column('books', 'discount_amount', type_=sa.Integer(), nullable=True)
    op.alter_column('books', 'discounted_price', type_=sa.Integer(), nullable=True)
    
    # Update Orders table price columns
    op.alter_column('orders', 'total_amount', type_=sa.Integer(), nullable=False)
    op.alter_column('orders', 'shipping_fee', type_=sa.Integer(), nullable=True)
    op.alter_column('orders', 'cod_amount', type_=sa.Integer(), nullable=True)
    
    # Update OrderItems table price columns
    op.alter_column('order_items', 'price_at_purchase', type_=sa.Integer(), nullable=False)


def downgrade() -> None:
    # Revert Books table price columns
    op.alter_column('books', 'price', type_=sa.DECIMAL(10, 2), nullable=False)
    op.alter_column('books', 'discount_amount', type_=sa.DECIMAL(10, 2), nullable=True)
    op.alter_column('books', 'discounted_price', type_=sa.DECIMAL(10, 2), nullable=True)
    
    # Revert Orders table price columns
    op.alter_column('orders', 'total_amount', type_=sa.DECIMAL(10, 2), nullable=False)
    op.alter_column('orders', 'shipping_fee', type_=sa.DECIMAL(10, 2), nullable=True)
    op.alter_column('orders', 'cod_amount', type_=sa.DECIMAL(10, 2), nullable=True)
    
    # Revert OrderItems table price columns
    op.alter_column('order_items', 'price_at_purchase', type_=sa.DECIMAL(10, 2), nullable=False)