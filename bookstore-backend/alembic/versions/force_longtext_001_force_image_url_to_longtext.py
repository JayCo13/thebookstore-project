"""force_image_url_to_longtext

Revision ID: force_longtext_001
Revises: 24ec7a7e241f
Create Date: 2025-12-02 09:35:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'force_longtext_001'
down_revision = '24ec7a7e241f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Force change image_url to LONGTEXT to support large base64 images
    op.execute('ALTER TABLE notifications MODIFY COLUMN image_url LONGTEXT')


def downgrade() -> None:
    # Revert to TEXT
    op.execute('ALTER TABLE notifications MODIFY COLUMN image_url TEXT')
