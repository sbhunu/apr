# Disaster Recovery Plan

## Overview

This document outlines the disaster recovery procedures for the Automated Property Registration (APR) system.

## Recovery Objectives

### Recovery Time Objective (RTO)
- **Target**: 4 hours
- **Maximum Acceptable**: 24 hours
- **Description**: Time to restore system to operational state after disaster

### Recovery Point Objective (RPO)
- **Target**: 1 hour
- **Maximum Acceptable**: 24 hours
- **Description**: Maximum acceptable data loss (time between backups)

## Backup Strategy

### Database Backups

#### Automated Backups
- **Frequency**: Daily at 2:00 AM UTC
- **Retention**: 30 days
- **Type**: Full database dump (pg_dump)
- **Location**: 
  - Primary: Supabase managed backups (automatic)
  - Secondary: Off-site backup storage
- **Verification**: Automated verification after each backup

#### Manual Backups
- **Script**: `scripts/backup/database-backup.sh`
- **Usage**: Run before major migrations or deployments
- **Storage**: Local backup directory or cloud storage

#### Point-in-Time Recovery
- **Capability**: Supabase provides point-in-time recovery (PITR)
- **Window**: Up to 7 days of point-in-time recovery
- **Process**: Contact Supabase support for PITR requests

### Storage Backups

#### Automated Backups
- **Frequency**: Daily at 3:00 AM UTC
- **Retention**: 30 days
- **Buckets**: documents, certificates, plans, surveys
- **Method**: Supabase Storage API or CLI

#### Manual Backups
- **Script**: `scripts/backup/storage-backup.sh`
- **Usage**: Run before major storage operations

### Configuration Backups

#### Automated Backups
- **Frequency**: Weekly (Sundays at 1:00 AM UTC)
- **Retention**: 90 days
- **Includes**: 
  - Environment variables (sanitized)
  - Migration files
  - Configuration files
  - Package dependencies

#### Manual Backups
- **Script**: `scripts/backup/config-backup.sh`
- **Usage**: Run after configuration changes

## Backup Verification

### Automated Verification
- **Frequency**: After each backup
- **Script**: `scripts/backup/verify-backup.sh`
- **Checks**:
  - File integrity (compression)
  - SQL syntax (for database backups)
  - File size validation
  - Metadata validation

### Manual Verification
- **Frequency**: Weekly
- **Process**: Restore backup to test environment
- **Validation**: Verify data integrity and application functionality

## Disaster Scenarios

### Scenario 1: Database Corruption

**Symptoms**:
- Database queries failing
- Data inconsistencies reported
- Application errors

**Recovery Steps**:
1. Identify corruption point
2. Stop application traffic
3. Restore from latest verified backup
4. Apply point-in-time recovery if needed
5. Verify data integrity
6. Resume application traffic
7. Monitor for issues

**RTO**: 2-4 hours
**RPO**: Up to 1 hour (depending on backup frequency)

### Scenario 2: Complete System Failure

**Symptoms**:
- Entire Supabase project unavailable
- Application cannot connect to database
- All services down

**Recovery Steps**:
1. Contact Supabase support
2. Assess scope of failure
3. Activate disaster recovery plan
4. Restore from off-site backups if needed
5. Rebuild infrastructure if necessary
6. Restore database from backup
7. Restore storage buckets
8. Verify system functionality
9. Resume operations

**RTO**: 4-24 hours
**RPO**: Up to 24 hours

### Scenario 3: Data Loss (Accidental Deletion)

**Symptoms**:
- Data missing from database
- User reports missing records
- Audit logs show deletion

**Recovery Steps**:
1. Identify deletion point
2. Stop further operations if needed
3. Restore from backup before deletion
4. Use point-in-time recovery for precise restoration
5. Verify restored data
6. Resume operations

**RTO**: 1-4 hours
**RPO**: Up to 1 hour

### Scenario 4: Storage Failure

**Symptoms**:
- Files not accessible
- Storage API errors
- Missing documents

**Recovery Steps**:
1. Identify affected buckets
2. Restore from storage backup
3. Verify file integrity
4. Update file references if needed
5. Resume operations

**RTO**: 2-6 hours
**RPO**: Up to 24 hours

## Recovery Procedures

### Database Restore

1. **Stop Application**
   ```bash
   # Stop application services
   ```

2. **Verify Backup**
   ```bash
   ./scripts/backup/verify-backup.sh ./backups/database/apr_backup_YYYYMMDD_HHMMSS.sql.gz
   ```

3. **Restore Database**
   ```bash
   ./scripts/backup/restore-database.sh ./backups/database/apr_backup_YYYYMMDD_HHMMSS.sql.gz
   ```

4. **Verify Data Integrity**
   ```bash
   # Run verification queries
   # Check record counts
   # Verify relationships
   ```

5. **Resume Application**
   ```bash
   # Start application services
   # Monitor for errors
   ```

### Storage Restore

1. **Identify Backup**
   ```bash
   ls -lh ./backups/storage/
   ```

2. **Extract Backup**
   ```bash
   tar -xzf ./backups/storage/bucket_TIMESTAMP.tar.gz
   ```

3. **Upload to Supabase Storage**
   ```bash
   # Use Supabase CLI or API
   supabase storage upload bucket_name ./backups/storage/bucket_TIMESTAMP/
   ```

4. **Verify Files**
   ```bash
   # Check file counts
   # Verify file integrity
   ```

### Configuration Restore

1. **Extract Configuration**
   ```bash
   tar -xzf ./backups/config/config_backup_TIMESTAMP.tar.gz
   ```

2. **Restore Files**
   ```bash
   cp -r extracted/config/* ./
   ```

3. **Verify Configuration**
   ```bash
   # Check environment variables
   # Verify file permissions
   # Test application startup
   ```

## Backup Monitoring

### Automated Monitoring
- **Health Check**: `/api/backup/status`
- **Frequency**: Every hour
- **Alerts**: 
  - Backup older than 24 hours (database)
  - Backup older than 24 hours (storage)
  - Backup older than 7 days (config)
  - Backup verification failure

### Manual Checks
- **Frequency**: Weekly
- **Process**: Review backup logs and verify backups

## Off-Site Backup Storage

### Requirements
- **Location**: Separate geographic region
- **Storage**: Encrypted cloud storage (AWS S3, Google Cloud Storage, etc.)
- **Access**: Limited to backup/restore operations
- **Retention**: 90 days minimum

### Backup Transfer
- **Frequency**: Daily
- **Method**: Automated script or cloud sync
- **Verification**: Checksum validation

## Testing

### Backup Testing
- **Frequency**: Monthly
- **Process**:
  1. Restore backup to test environment
  2. Verify data integrity
  3. Test application functionality
  4. Document results

### Disaster Recovery Drills
- **Frequency**: Quarterly
- **Process**:
  1. Simulate disaster scenario
  2. Execute recovery procedures
  3. Measure RTO/RPO
  4. Document lessons learned
  5. Update procedures as needed

## Contact Information

### Supabase Support
- **Email**: support@supabase.com
- **Status Page**: https://status.supabase.com
- **Documentation**: https://supabase.com/docs

### Internal Contacts
- **System Administrator**: [Contact Info]
- **Database Administrator**: [Contact Info]
- **Disaster Recovery Coordinator**: [Contact Info]

## Appendices

### A. Backup Scripts Location
- Database: `scripts/backup/database-backup.sh`
- Storage: `scripts/backup/storage-backup.sh`
- Config: `scripts/backup/config-backup.sh`
- Verify: `scripts/backup/verify-backup.sh`
- Restore: `scripts/backup/restore-database.sh`

### B. Backup Storage Locations
- Local: `./backups/`
- Off-site: [Cloud Storage URL]

### C. Recovery Checklist
- [ ] Identify disaster type
- [ ] Assess scope of impact
- [ ] Notify stakeholders
- [ ] Execute recovery procedures
- [ ] Verify data integrity
- [ ] Test application functionality
- [ ] Resume operations
- [ ] Document incident
- [ ] Post-mortem review

