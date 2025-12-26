#!/bin/bash
# Configuration Backup Script
# Backs up application configuration and environment files

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups/config}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/config_backup_${TIMESTAMP}.tar.gz"

# Files and directories to backup
CONFIG_ITEMS=(
  ".env.local"
  ".env.example"
  "supabase/migrations"
  "supabase/config.toml"
  "package.json"
  "tsconfig.json"
  "next.config.js"
  "tailwind.config.js"
  "playwright.config.ts"
)

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo "Starting configuration backup at $(date)"

# Create temporary directory for backup
TEMP_DIR=$(mktemp -d)
trap "rm -rf ${TEMP_DIR}" EXIT

# Copy configuration files
for ITEM in "${CONFIG_ITEMS[@]}"; do
  if [ -e "${ITEM}" ]; then
    echo "Backing up: ${ITEM}"
    mkdir -p "${TEMP_DIR}/$(dirname ${ITEM})"
    cp -r "${ITEM}" "${TEMP_DIR}/${ITEM}"
  else
    echo "Skipping (not found): ${ITEM}"
  fi
done

# Create archive
tar -czf "${BACKUP_FILE}" -C "${TEMP_DIR}" .

# Calculate backup size
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

echo "Configuration backup completed"
echo "Backup file: ${BACKUP_FILE}"
echo "Backup size: ${BACKUP_SIZE}"

# Generate backup metadata
cat > "${BACKUP_FILE%.tar.gz}.metadata.json" <<EOF
{
  "backup_file": "$(basename ${BACKUP_FILE})",
  "timestamp": "${TIMESTAMP}",
  "items": $(printf '%s\n' "${CONFIG_ITEMS[@]}" | jq -R . | jq -s .),
  "size": "${BACKUP_SIZE}",
  "created_at": "$(date -Iseconds)"
}
EOF

echo "Configuration backup completed at $(date)"

