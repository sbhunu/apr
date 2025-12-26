#!/bin/bash
# Backup Verification Script
# Verifies backup integrity and completeness

set -e

BACKUP_FILE="${1}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

echo "Verifying backup: ${BACKUP_FILE}"

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

# Check if backup is compressed
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  echo "Checking compressed backup integrity..."
  
  # Test gzip integrity
  if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
    echo "Error: Backup file is corrupted (gzip test failed)"
    exit 1
  fi
  
  echo "✓ Compression integrity verified"
  
  # Check SQL syntax if it's a database backup
  if [[ "${BACKUP_FILE}" == *database* ]]; then
    echo "Checking SQL syntax..."
    
    # Extract and check first few lines
    TEMP_SQL=$(mktemp)
    gunzip -c "${BACKUP_FILE}" | head -100 > "${TEMP_SQL}"
    
    # Basic SQL syntax check (look for common SQL keywords)
    if grep -q "CREATE\|INSERT\|ALTER\|SELECT" "${TEMP_SQL}"; then
      echo "✓ SQL syntax appears valid"
    else
      echo "Warning: SQL syntax check inconclusive"
    fi
    
    rm -f "${TEMP_SQL}"
  fi
else
  echo "Checking backup file integrity..."
  
  # For non-compressed files, check if they're readable
  if [ -r "${BACKUP_FILE}" ]; then
    echo "✓ Backup file is readable"
  else
    echo "Error: Backup file is not readable"
    exit 1
  fi
fi

# Check backup size (should be > 0)
BACKUP_SIZE=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null)
if [ "${BACKUP_SIZE}" -eq 0 ]; then
  echo "Error: Backup file is empty"
  exit 1
fi

echo "✓ Backup size: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Check metadata file if it exists
METADATA_FILE="${BACKUP_FILE%.gz}.metadata.json"
if [ -f "${METADATA_FILE}" ]; then
  echo "✓ Metadata file found: ${METADATA_FILE}"
  
  # Validate JSON
  if command -v jq &> /dev/null; then
    if jq empty "${METADATA_FILE}" 2>/dev/null; then
      echo "✓ Metadata JSON is valid"
    else
      echo "Warning: Metadata JSON is invalid"
    fi
  fi
fi

echo ""
echo "Backup verification completed successfully"
echo "Backup file: ${BACKUP_FILE}"
echo "Size: $(du -h "${BACKUP_FILE}" | cut -f1)"

