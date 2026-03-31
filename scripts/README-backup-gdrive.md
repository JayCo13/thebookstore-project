# MySQL Backup to Google Drive - Setup Guide

## Overview
This guide sets up automated MySQL database backups from your VPS to Google Drive.

## Step 1: Install rclone on VPS

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Verify installation
rclone version
```

## Step 2: Configure Google Drive Remote

Since VPS has no browser, we'll use a local machine to get the OAuth token.

### On your LOCAL Mac:
```bash
# Install rclone locally
brew install rclone

# Configure Google Drive (this opens browser for OAuth)
rclone config

# Follow prompts:
# 1. n/s/q> n (new remote)
# 2. name> gdrive
# 3. Storage> 18 (Google Drive)
# 4. client_id> (press Enter for default)
# 5. client_secret> (press Enter for default)
# 6. scope> 1 (full access)
# 7. root_folder_id> (press Enter)
# 8. service_account_file> (press Enter)
# 9. Edit advanced config? n
# 10. Use auto config? y
# 11. Browser opens - authorize the app
# 12. Configure as team drive? n
# 13. y (confirm)
# 14. q (quit)

# Copy the config to clipboard
cat ~/.config/rclone/rclone.conf
```

### On your VPS:
```bash
# Create rclone config directory
mkdir -p ~/.config/rclone

# Create config file and paste the content from your Mac
nano ~/.config/rclone/rclone.conf

# Paste the config and save (Ctrl+X, Y, Enter)

# Verify it works
rclone lsd gdrive:
```

## Step 3: Copy Backup Script to VPS

```bash
# On VPS, create scripts directory
mkdir -p /home/bookstore/scripts

# Create the backup script
nano /home/bookstore/scripts/backup-mysql-gdrive.sh
```

Copy the content from `scripts/backup-mysql-gdrive.sh` in this repo.

**Important:** Update the `MYSQL_PASSWORD` in the script!

```bash
# Make executable
chmod +x /home/bookstore/scripts/backup-mysql-gdrive.sh

# Create backup directory
mkdir -p /home/bookstore/backups

# Test the script
/home/bookstore/scripts/backup-mysql-gdrive.sh
```

## Step 4: Set Up Cron Job for Automated Backups

```bash
# Edit crontab
crontab -e

# Add this line for daily backup at 3 AM:
0 3 * * * /home/bookstore/scripts/backup-mysql-gdrive.sh >> /home/bookstore/backups/backup.log 2>&1

# Alternative schedules:
# Every 6 hours: 0 */6 * * *
# Every 12 hours: 0 */12 * * *
# Weekly (Sunday 3 AM): 0 3 * * 0

# Save and exit
```

Verify cron is running:
```bash
crontab -l
```

## Step 5: Verify Backup on Google Drive

1. Go to https://drive.google.com
2. Check for `bookstore-backups` folder
3. Verify backup files are appearing

## Manual Backup Command

Run anytime:
```bash
/home/bookstore/scripts/backup-mysql-gdrive.sh
```

## Restore from Backup

```bash
# Download backup from Google Drive
rclone copy gdrive:bookstore-backups/bookstore_2025-12-16_03-00-00.sql.gz /home/bookstore/backups/

# Decompress
gunzip /home/bookstore/backups/bookstore_2025-12-16_03-00-00.sql.gz

# Restore to MySQL
docker exec -i bookstore-mysql mysql -u approot -ppassword bookstore_db < /home/bookstore/backups/bookstore_2025-12-16_03-00-00.sql
```

## Troubleshooting

### Check backup logs
```bash
tail -50 /home/bookstore/backups/backup.log
```

### Test rclone connection
```bash
rclone lsd gdrive:
rclone ls gdrive:bookstore-backups/
```

### Manual MySQL dump test
```bash
docker exec bookstore-mysql mysqldump -u approot -ppassword bookstore_db | head -20
```
