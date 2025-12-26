#!/bin/bash
# Database Restore Script
# Restores database from backup file

set -e

BACKUP_FILE="${1}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <backup_file>"
  echo "Example: $0 ./backups/database/apr_backup_20241224_120000.sql.gz"
  exit 1
fi

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

# Supabase connection details
SUPABASE_DB_HOST="${SUPABASE_DB_HOST:-localhost}"
SUPABASE_DB_PORT="${SUPABASE_DB_PORT:-54322}"
SUPABASE_DB_NAME="${SUPABASE_DB_NAME:-postgres}"
SUPABASE_DB_USER="${SUPABASE_DB_USER:-postgres}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-postgres}"

echo "WARNING: This will restore the database from backup"
echo "Backup file: ${BACKUP_FILE}"
echo "Database: ${SUPABASE_DB_NAME}"
echo "Host: ${SUPABASE_DB_HOST}:${SUPABASE_DB_PORT}"
echo ""
read -p "Are you sure you want to proceed? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

echo "Starting database restore at $(date)"

# Decompress if needed
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  echo "Decompressing backup..."
  TEMP_SQL=$(mktemp)
  gunzip -c "${BACKUP_FILE}" > "${TEMP_SQL}"
  RESTORE_FILE="${TEMP_SQL}"
else
  RESTORE_FILE="${BACKUP_FILE}"
fi

# Restore database
echo "Restoring database..."
PGPASSWORD="${SUPABASE_DB_PASSWORD}" psql \
  -h "${SUPABASE_DB_HOST}" \
  -p "${SUPABASE_DB_PORT}" \
  -U "${SUPABASE_DB_USER}" \
  -d "${SUPABASE_DB_NAME}" \
  -f "${RESTORE_FILE}"

# Clean up temporary file
if [ -n "${TEMP_SQL}" ]; then
  rm -f "${TEMP_SQL}"
fi

echo "Database restore completed at $(date)"
echo ""
echo "Next steps:"
echo "1. Verify data integrity"
echo "2. Run database migrations if needed"
echo "3. Test application functionality"

