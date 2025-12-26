#!/bin/bash
# Database Backup Script
# Creates PostgreSQL database backup with point-in-time recovery support

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups/database}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/apr_backup_${TIMESTAMP}.sql"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Supabase connection details (from environment or Docker)
SUPABASE_DB_HOST="${SUPABASE_DB_HOST:-localhost}"
SUPABASE_DB_PORT="${SUPABASE_DB_PORT:-54322}"
SUPABASE_DB_NAME="${SUPABASE_DB_NAME:-postgres}"
SUPABASE_DB_USER="${SUPABASE_DB_USER:-postgres}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-postgres}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo "Starting database backup at $(date)"
echo "Backup file: ${BACKUP_FILE}"

# Create database backup using pg_dump
PGPASSWORD="${SUPABASE_DB_PASSWORD}" pg_dump \
  -h "${SUPABASE_DB_HOST}" \
  -p "${SUPABASE_DB_PORT}" \
  -U "${SUPABASE_DB_USER}" \
  -d "${SUPABASE_DB_NAME}" \
  --schema=apr \
  --schema=records \
  --schema=public \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --verbose \
  > "${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Calculate backup size
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

echo "Backup completed successfully"
echo "Backup file: ${BACKUP_FILE}"
echo "Backup size: ${BACKUP_SIZE}"

# Generate backup metadata
cat > "${BACKUP_FILE%.gz}.metadata.json" <<EOF
{
  "backup_file": "$(basename ${BACKUP_FILE})",
  "timestamp": "${TIMESTAMP}",
  "database": "${SUPABASE_DB_NAME}",
  "schemas": ["apr", "records", "public"],
  "size": "${BACKUP_SIZE}",
  "host": "${SUPABASE_DB_HOST}",
  "port": "${SUPABASE_DB_PORT}",
  "created_at": "$(date -Iseconds)"
}
EOF

# Clean up old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -name "apr_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "apr_backup_*.metadata.json" -type f -mtime +${RETENTION_DAYS} -delete

echo "Backup process completed at $(date)"

