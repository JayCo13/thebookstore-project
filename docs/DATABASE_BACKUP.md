# Database Backup System for Tâm Nguồn Book

This document describes the automated database backup system that backs up MySQL to Google Drive.

## Overview

The backup system consists of three scripts:
1. **`backup_to_gdrive.sh`** - Main backup script (runs daily via cron)
2. **`restore_from_backup.sh`** - Restore database from backup
3. **`setup_rclone.sh`** - Initial rclone setup for Google Drive

## Features

- ✅ Daily automated backups at 2 AM
- ✅ Compressed backups (gzip) to save space
- ✅ Upload to Google Drive for off-site storage
- ✅ Local retention: 7 days
- ✅ Remote retention: 30 days
- ✅ Detailed logging

## Setup Instructions

### 1. Deploy scripts to VPS

```bash
# On local machine
cd /Users/cotai/Desktop/bookstore-main
git add scripts/
git commit -m "feat: add database backup system for Google Drive"
git push origin main

# On VPS
cd /home/bookstore
git pull origin main
mkdir -p /home/bookstore/backups
mkdir -p /home/bookstore/logs
chmod +x scripts/*.sh
```

### 2. Install and configure rclone

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure rclone (on your LOCAL machine with browser)
rclone config
# - Choose 'n' for new remote
# - Name: gdrive
# - Type: 18 (Google Drive)
# - Leave client_id blank
# - Leave client_secret blank
# - Scope: 1 (full access)
# - Leave root_folder_id blank
# - Leave service_account_file blank
# - Auto config: y (browser will open)
# - Complete OAuth

# Copy config to VPS
scp ~/.config/rclone/rclone.conf root@14.225.218.178:/root/.config/rclone/

# On VPS - verify it works
rclone lsd gdrive:
rclone mkdir gdrive:bookstore-backups
```

### 3. Set up daily cron job

```bash
# Add cron job for daily backup at 2 AM
crontab -e

# Add this line:
0 2 * * * /home/bookstore/scripts/backup_to_gdrive.sh >> /home/bookstore/logs/backup.log 2>&1
```

### 4. Test the backup

```bash
# Run manual backup
cd /home/bookstore
./scripts/backup_to_gdrive.sh

# Check logs
tail -50 /home/bookstore/logs/backup.log

# Verify on Google Drive
rclone ls gdrive:bookstore-backups/
```

## Restore from Backup

### From local backup:
```bash
./scripts/restore_from_backup.sh /home/bookstore/backups/backup_20231215_020000.sql.gz
```

### From Google Drive:
```bash
# List available backups
rclone ls gdrive:bookstore-backups/

# Download specific backup
rclone copy gdrive:bookstore-backups/backup_20231215_020000.sql.gz /home/bookstore/backups/

# Restore
./scripts/restore_from_backup.sh /home/bookstore/backups/backup_20231215_020000.sql.gz
```

## Monitoring

Check backup logs:
```bash
tail -f /home/bookstore/logs/backup.log
```

List local backups:
```bash
ls -la /home/bookstore/backups/
```

List remote backups:
```bash
rclone ls gdrive:bookstore-backups/
```

## Troubleshooting

### Rclone "failed to refresh token"
Re-run the OAuth flow on your local machine and copy the new config to VPS.

### "docker: command not found"
Ensure the cron job runs with the correct PATH:
```bash
0 2 * * * PATH=/usr/local/bin:/usr/bin:/bin /home/bookstore/scripts/backup_to_gdrive.sh
```

### Backup file is empty
Check MySQL container is running:
```bash
docker ps | grep mysql
```
