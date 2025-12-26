/**
 * Schema configuration for APR system
 * All tables must be prefixed with the 'apr' schema
 */

export const APR_SCHEMA = 'apr'
export const RECORDS_SCHEMA = 'records'

/**
 * Helper function to ensure table references use apr schema
 * Usage: from(`${APR_SCHEMA}.table_name`)
 */
export function aprTable(tableName: string): string {
  return `${APR_SCHEMA}.${tableName}`
}

/**
 * Helper function for records schema tables
 */
export function recordsTable(tableName: string): string {
  return `${RECORDS_SCHEMA}.${tableName}`
}

