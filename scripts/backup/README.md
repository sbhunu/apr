# Backup Scripts

This directory contains scripts for backing up and restoring the APR system.

## Scripts

### Database Backup

**Script**: `database-backup.sh`

Creates a PostgreSQL database backup using `pg_dump`.

**Usage**:
```bash
./scripts/backup/database-backup.sh
```

**Environment Variables**:
- `BACKUP_DIR`: Backup directory (default: `./backups/database`)
- `RETENTION_DAYS`: Days to retain backups (default: 30)
- `SUPABASE_DB_HOST`: Database host (default: localhost)
- `SUPABASE_DB_PORT`: Database port (default: 54322)
- `SUPABASE_DB_NAME`: Database name (default: postgres)
- `SUPABASE_DB_USER`: Database user (default: postgres)
- `SUPABASE_DB_PASSWORD`: Database password (default: postgres)

**Output**:
- `apr_backup_YYYYMMDD_HHMMSS.sql.gz`: Compressed database backup
- `apr_backup_YYYYMMDD_HHMMSS.metadata.json`: Backup metadata

### Storage Backup

**Script**: `storage-backup.sh`

Backs up Supabase Storage buckets.

**Usage**:
```bash
./scripts/backup/storage-backup.sh
```

**Environment Variables**:
- `BACKUP_DIR`: Backup directory (default: `./backups/storage`)
- `RETENTION_DAYS`: Days to retain backups (default: 30)

**Note**: Requires Supabase Storage API access. Update script with actual API calls.

### Configuration Backup

**Script**: `config-backup.sh`

Backs up application configuration files.

**Usage**:
```bash
./scripts/backup/config-backup.sh
```

**Environment Variables**:
- `BACKUP_DIR`: Backup directory (default: `./backups/config`)

**Backs Up**:
- Environment files
- Migration files
- Configuration files
- Package dependencies

### Backup Verification

**Script**: `verify-backup.sh`

Verifies backup file integrity.

**Usage**:
```bash
./scripts/backup/verify-backup.sh <backup_file>
```

**Example**:
```bash
./scripts/backup/verify-backup.sh ./backups/database/apr_backup_20241224_120000.sql.gz
```

**Checks**:
- File existence
- Compression integrity
- SQL syntax (for database backups)
- File size
- Metadata validation

### Database Restore

**Script**: `restore-database.sh`

Restores database from backup file.

**Usage**:
```bash
./scripts/backup/restore-database.sh <backup_file>
```

**Example**:
```bash
./scripts/backup/restore-database.sh ./backups/database/apr_backup_20241224_120000.sql.gz
```

**Warning**: This will overwrite the current database. Requires confirmation.

## Automated Backups

### Using Cron

Add to crontab for automated backups:

```bash
# Database backup daily at 2 AM
0 2 * * * /path/to/apr/scripts/backup/database-backup.sh

# Storage backup daily at 3 AM
0 3 * * * /path/to/apr/scripts/backup/storage-backup.sh

# Configuration backup weekly on Sunday at 1 AM
0 1 * * 0 /path/to/apr/scripts/backup/config-backup.sh
```

### Using Systemd Timer

Create systemd service and timer files for automated backups.

## Backup Locations

- **Database**: `./backups/database/`
- **Storage**: `./backups/storage/`
- **Configuration**: `./backups/config/`

## Backup Retention

- **Database**: 30 days
- **Storage**: 30 days
- **Configuration**: 90 days

Configure via `RETENTION_DAYS` environment variable.

## Verification

Always verify backups after creation:

```bash
./scripts/backup/verify-backup.sh <backup_file>
```

## Restore Procedures

See `docs/DISASTER_RECOVERY.md` for detailed restore procedures.

## Troubleshooting

### Backup Fails

1. Check database connection
2. Verify disk space
3. Check file permissions
4. Review error messages

### Restore Fails

1. Verify backup file integrity
2. Check database connection
3. Ensure sufficient disk space
4. Review error messages

### Backup Verification Fails

1. Check backup file exists
2. Verify file is not corrupted
3. Check compression integrity
4. Review metadata file

