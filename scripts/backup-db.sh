#!/bin/bash
# HR Management System - Database Backup Script
# Requirements: pg_dump, gpg

BACKUP_DIR="/backups/hrms"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="hrms_prod"
DB_USER="hrms_backup_user"
GPG_RECIPIENT="admin@example.com"

mkdir -p "$BACKUP_DIR"

echo "Starting backup of $DB_NAME..."

# 1. Perform Dump
FILE_PLAIN="$BACKUP_DIR/backup_$TIMESTAMP.sql"
pg_dump -U "$DB_USER" -d "$DB_NAME" -f "$FILE_PLAIN"

if [ $? -ne 0 ]; then
  echo "Error: pg_dump failed"
  exit 1
fi

# 2. Encrypt with GPG
FILE_ENC="$FILE_PLAIN.gpg"
gpg --encrypt --recipient "$GPG_RECIPIENT" "$FILE_PLAIN"

if [ $? -eq 0 ]; then
  echo "Backup encrypted successfully: $FILE_ENC"
  rm "$FILE_PLAIN"
else
  echo "Error: Encryption failed"
  exit 1
fi

# 3. Cleanup old backups (> 30 days)
find "$BACKUP_DIR" -name "*.gpg" -mtime +30 -exec rm {} \;

echo "Backup process completed."
