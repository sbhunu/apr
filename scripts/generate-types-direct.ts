#!/usr/bin/env tsx
/**
 * Generate TypeScript types directly from PostgreSQL database
 * Uses Docker exec to query the database schema directly
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

interface ColumnInfo {
  table_schema: string
  table_name: string
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  udt_name: string
}

function queryDatabase(sql: string): string {
  try {
    // Use docker exec with stdin input
    const result = execSync(
      `docker exec -i supabase-db psql -U postgres -d postgres -t -A -F","`,
      { 
        input: sql,
        encoding: 'utf-8', 
        maxBuffer: 10 * 1024 * 1024 
      }
    )
    return result.trim()
  } catch (error: any) {
    if (error.stdout) {
      return error.stdout.toString().trim()
    }
    console.error(`Error executing SQL: ${error.message}`)
    return ''
  }
}

function getTableColumns(schema: string): Map<string, ColumnInfo[]> {
  // Query with proper SQL syntax
  const sql = `SELECT table_schema, table_name, column_name, data_type, is_nullable, COALESCE(column_default::text, 'NULL') as column_default, udt_name FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name NOT LIKE '_%' ORDER BY table_name, ordinal_position;`

  const result = queryDatabase(sql)
  const columnsByTable = new Map<string, ColumnInfo[]>()

  if (!result || result.trim() === '') {
    return columnsByTable
  }

  const lines = result.split('\n').filter(line => line.trim() && line.includes(','))
  
  for (const line of lines) {
    const parts = line.split(',').map(s => s.trim())
    if (parts.length < 7) continue
    
    const [table_schema, table_name, column_name, data_type, is_nullable, column_default, udt_name] = parts
    
    if (!table_name || table_name.startsWith('_')) continue

    if (!columnsByTable.has(table_name)) {
      columnsByTable.set(table_name, [])
    }

    columnsByTable.get(table_name)!.push({
      table_schema,
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default: column_default === 'NULL' ? null : column_default,
      udt_name,
    })
  }

  return columnsByTable
}

function mapPostgresTypeToTypeScript(udtName: string, dataType: string): string {
  const typeMap: Record<string, string> = {
    'uuid': 'string',
    'text': 'string',
    'varchar': 'string',
    'char': 'string',
    'bpchar': 'string',
    'name': 'string',
    'int4': 'number',
    'int8': 'number',
    'int2': 'number',
    'float4': 'number',
    'float8': 'number',
    'numeric': 'number',
    'bool': 'boolean',
    'boolean': 'boolean',
    'timestamp': 'string',
    'timestamptz': 'string',
    'date': 'string',
    'time': 'string',
    'timetz': 'string',
    'json': 'Json',
    'jsonb': 'Json',
    'geometry': 'GeoJSON',
    'geography': 'GeoJSON',
  }

  if (udtName === 'geometry' || udtName === 'geography') {
    return 'GeoJSON'
  }

  return typeMap[udtName] || 'unknown'
}

function generateTableType(tableName: string, columns: ColumnInfo[]): string {
  const typeName = tableName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

  const properties = columns.map(col => {
    const tsType = mapPostgresTypeToTypeScript(col.udt_name, col.data_type)
    const nullable = col.is_nullable === 'YES' ? ' | null' : ''
    const optional = col.is_nullable === 'YES' && !col.column_default ? '?' : ''
    
    return `  ${col.column_name}${optional}: ${tsType}${nullable}`
  }).join('\n')

  return `
export interface ${typeName} {
${properties}
}
`
}

async function generateDatabaseTypes() {
  console.log('🔍 Generating TypeScript types from database schema (direct query)...\n')

  // Get columns for apr schema
  const aprColumns = getTableColumns('apr')
  console.log(`   Found ${aprColumns.size} tables in apr schema`)
  
  // Get columns for records schema
  const recordsColumns = getTableColumns('records')
  console.log(`   Found ${recordsColumns.size} tables in records schema`)

  let output = `/**
 * Generated TypeScript types from Supabase database schema
 * 
 * This file is auto-generated. Do not edit manually.
 * Regenerate with: npm run types:generate
 * 
 * Generated: ${new Date().toISOString()}
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type GeoJSON = {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon' | 'GeometryCollection'
  coordinates: number[] | number[][] | number[][][] | number[][][][]
  crs?: {
    type: string
    properties: {
      name: string
    }
  }
}

// ============================================================================
// APR Schema Tables
// ============================================================================
`

  // Generate types for apr schema tables
  if (aprColumns.size > 0) {
    for (const [tableName, columns] of aprColumns.entries()) {
      output += generateTableType(tableName, columns)
      console.log(`   ✓ Generated type for ${tableName}`)
    }
  } else {
    console.log('   ⚠️  No tables found in apr schema, using fallback types')
    output += `
export interface UserProfiles {
  id: string
  user_id: string
  full_name: string | null
  role_id: string | null
  created_at: string
  updated_at: string
}

export interface Roles {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Permissions {
  id: string
  name: string
  resource: string
  action: string
  description: string | null
  created_at: string
  updated_at: string
}
`
  }

  // Generate types for records schema tables
  if (recordsColumns.size > 0) {
    output += `\n// ============================================================================\n// Records Schema Tables\n// ============================================================================\n`
    for (const [tableName, columns] of recordsColumns.entries()) {
      output += generateTableType(tableName, columns)
      console.log(`   ✓ Generated type for ${tableName}`)
    }
  }

  // Database type (for Supabase client)
  output += `
// ============================================================================
// Database Type (for Supabase client)
// ============================================================================

export interface Database {
  public: {
    Tables: {}
    Views: {}
    Functions: {}
    Enums: {}
  }
  apr: {
    Tables: {
`

  if (aprColumns.size > 0) {
    for (const tableName of aprColumns.keys()) {
      const typeName = tableName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('')
      output += `      ${tableName}: {
        Row: ${typeName}
        Insert: Omit<${typeName}, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<${typeName}, 'id' | 'created_at' | 'updated_at'>>
      }
`
    }
  } else {
    output += `      user_profiles: {
        Row: UserProfiles
        Insert: Omit<UserProfiles, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserProfiles, 'id' | 'created_at' | 'updated_at'>>
      }
      roles: {
        Row: Roles
        Insert: Omit<Roles, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Roles, 'id' | 'created_at' | 'updated_at'>>
      }
      permissions: {
        Row: Permissions
        Insert: Omit<Permissions, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Permissions, 'id' | 'created_at' | 'updated_at'>>
      }
`
  }

  output += `    }
    Views: {}
    Functions: {}
    Enums: {}
  }
  records: {
    Tables: {}
    Views: {}
    Functions: {}
    Enums: {}
  }
}
`

  // Write to file
  const typesDir = path.join(process.cwd(), 'types')
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true })
  }

  const outputPath = path.join(typesDir, 'database.ts')
  fs.writeFileSync(outputPath, output)

  console.log(`\n✅ Types generated successfully: ${outputPath}`)
  console.log(`   Total tables: ${aprColumns.size + recordsColumns.size}`)
}

generateDatabaseTypes().catch(console.error)

