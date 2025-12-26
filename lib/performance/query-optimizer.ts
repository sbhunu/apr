/**
 * Database Query Optimization
 * Utilities for optimizing database queries
 */

import { logger } from '@/lib/logger'
import { monitor } from '@/lib/monitoring'

/**
 * Query optimization options
 */
export interface QueryOptions {
  limit?: number
  offset?: number
  select?: string[] // Specific columns to select
  orderBy?: { column: string; ascending?: boolean }
  useIndex?: string // Hint to use specific index
}

/**
 * Optimize SELECT query by limiting columns
 */
export function optimizeSelect(columns: string[]): string {
  // Only select necessary columns
  return columns.join(', ')
}

/**
 * Add pagination to query
 */
export function addPagination(
  query: string,
  limit: number = 50,
  offset: number = 0
): string {
  return `${query} LIMIT ${limit} OFFSET ${offset}`
}

/**
 * Add ordering to query
 */
export function addOrdering(
  query: string,
  column: string,
  ascending: boolean = true
): string {
  const direction = ascending ? 'ASC' : 'DESC'
  return `${query} ORDER BY ${column} ${direction}`
}

/**
 * Batch database operations
 */
export async function batchOperations<T, R>(
  items: T[],
  batchSize: number,
  operation: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  return monitor.measure('batch_operations', async () => {
    const results: R[] = []

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const batchResults = await operation(batch)
      results.push(...batchResults)
    }

    return results
  })
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn(...args)
    }
  }
}

/**
 * Check if spatial index exists
 */
export async function checkSpatialIndex(
  supabase: any,
  tableName: string,
  geometryColumn: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('pg_indexes', {
      tablename: tableName,
      schemaname: 'apr',
    })

    if (error) {
      logger.warn('Failed to check spatial index', { tableName, geometryColumn, error })
      return false
    }

    // Check if GIST index exists on geometry column
    const indexName = `idx_${tableName}_${geometryColumn}_gist`
    return data?.some((idx: any) => idx.indexname === indexName) || false
  } catch (error) {
    logger.error('Exception checking spatial index', error as Error, {
      tableName,
      geometryColumn,
    })
    return false
  }
}

/**
 * Analyze table for query optimization
 */
export async function analyzeTable(supabase: any, tableName: string): Promise<void> {
  try {
    await supabase.rpc('exec_sql', {
      sql: `ANALYZE apr.${tableName}`,
    })
    logger.debug(`Table analyzed: ${tableName}`)
  } catch (error) {
    logger.warn('Failed to analyze table', { tableName, error })
  }
}

