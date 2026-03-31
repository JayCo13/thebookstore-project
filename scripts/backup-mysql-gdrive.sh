#!/bin/bash
# =============================================================================
# MySQL Database Backup to Google Drive
# =============================================================================
# This script creates a MySQL dump and uploads it to Google Drive using rclone
# Run as cron job for automated backups
# =============================================================================

set -e

# Configuration
MYSQL_CONTAINER="bookstore-mysql"
MYSQL_USER="approot"
MYSQL_DATABASE="bookstore_db"
BACKUP_DIR="/home/bookstore/backups"
RCLONE_REMOTE="gdrive"  # Name of your rclone remote
GDRIVE_FOLDER="bookstore-backups"

# Read password from .env file (more secure than hardcoding)
ENV_FILE="/home/bookstore/.env"
if [ -f "$ENV_FILE" ]; then
    MYSQL_PASSWORD=$(grep -E '^MYSQL_PASSWORD=' "$ENV_FILE" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
fi
# Fallback to default if not found
MYSQL_PASSWORD="${MYSQL_PASSWORD:-password}"

# Date format for backup filename
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="bookstore_${DATE}.sql.gz"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

echo "=========================================="
echo "Starting MySQL backup: $(date)"
echo "=========================================="

# Create MySQL dump from Docker container
echo "[1/4] Creating MySQL dump..."
docker exec "$MYSQL_CONTAINER" mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" 2>/dev/null | gzip > "$BACKUP_DIR/$BACKUP_FILE"

if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ] || [ ! -s "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo "ERROR: Backup file was not created or is empty!"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
echo "[2/4] Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# Upload to Google Drive using rclone
echo "[3/4] Uploading to Google Drive..."
if command -v rclone &> /dev/null; then
    rclone copy "$BACKUP_DIR/$BACKUP_FILE" "$RCLONE_REMOTE:$GDRIVE_FOLDER/" --progress
    echo "Uploaded successfully to gdrive:$GDRIVE_FOLDER/$BACKUP_FILE"
else
    echo "WARNING: rclone not installed. Backup stored locally only."
fi

# Cleanup old local backups (keep last 7 days)
echo "[4/4] Cleaning up old local backups..."
find "$BACKUP_DIR" -name "bookstore_*.sql.gz" -type f -mtime +7 -delete

# Cleanup old Google Drive backups (keep last 30 days)
if command -v rclone &> /dev/null; then
    echo "Cleaning up old Google Drive backups (older than 30 days)..."
    rclone delete "$RCLONE_REMOTE:$GDRIVE_FOLDER/" --min-age 30d --include "bookstore_*.sql.gz" 2>/dev/null || true
fi

echo "=========================================="
echo "Backup completed: $(date)"
echo "Local: $BACKUP_DIR/$BACKUP_FILE"
echo "Remote: gdrive:$GDRIVE_FOLDER/$BACKUP_FILE"
echo "=========================================="
