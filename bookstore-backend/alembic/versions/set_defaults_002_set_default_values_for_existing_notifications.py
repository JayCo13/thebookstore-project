"""set_default_values_for_existing_notifications

Revision ID: set_defaults_002
Revises: force_longtext_001
Create Date: 2025-12-02 09:37:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'set_defaults_002'
down_revision = 'force_longtext_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update existing notifications to have default values for new fields
    op.execute("UPDATE notifications SET text_align = 'center' WHERE text_align IS NULL")
    op.execute("UPDATE notifications SET font_weight = 'normal' WHERE font_weight IS NULL")


def downgrade() -> None:
    # No need to revert - keeping the values is fine
    pass
