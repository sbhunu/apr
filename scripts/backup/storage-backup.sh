#!/bin/bash
# Storage Backup Script
# Backs up Supabase Storage buckets to local or remote storage

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups/storage}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Supabase Storage buckets to backup
BUCKETS=("documents" "certificates" "plans" "surveys")

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo "Starting storage backup at $(date)"

# Backup each bucket
for BUCKET in "${BUCKETS[@]}"; do
  echo "Backing up bucket: ${BUCKET}"
  
  BUCKET_BACKUP_DIR="${BACKUP_DIR}/${BUCKET}_${TIMESTAMP}"
  mkdir -p "${BUCKET_BACKUP_DIR}"
  
  # Use Supabase CLI or API to download bucket contents
  # This is a placeholder - actual implementation depends on Supabase Storage API
  echo "  Note: Storage backup requires Supabase Storage API access"
  echo "  Bucket: ${BUCKET}"
  echo "  Backup directory: ${BUCKET_BACKUP_DIR}"
  
  # Compress bucket backup
  if [ -d "${BUCKET_BACKUP_DIR}" ] && [ "$(ls -A ${BUCKET_BACKUP_DIR})" ]; then
    tar -czf "${BACKUP_DIR}/${BUCKET}_${TIMESTAMP}.tar.gz" -C "${BACKUP_DIR}" "${BUCKET}_${TIMESTAMP}"
    rm -rf "${BUCKET_BACKUP_DIR}"
    echo "  Backup compressed: ${BUCKET}_${TIMESTAMP}.tar.gz"
  fi
done

# Clean up old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -name "*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete

echo "Storage backup completed at $(date)"

