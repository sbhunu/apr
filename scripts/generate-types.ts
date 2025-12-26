#!/usr/bin/env tsx
/**
 * Generate TypeScript types from Supabase database schema
 * This script queries the database directly to generate type definitions
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!SUPABASE_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  console.error('   Set it in .env.local or run: npm run credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface ColumnInfo {
  table_schema: string
  table_name: string
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  udt_name: string
}

async function getTableColumns(schema: string): Promise<Map<string, ColumnInfo[]>> {
  // Query information_schema to get column information
  const query = `
    SELECT 
      table_schema,
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default,
      udt_name
    FROM information_schema.columns
    WHERE table_schema = $1
      AND table_name NOT LIKE '_%'
    ORDER BY table_name, ordinal_position;
  `

  try {
    // Use RPC if available, otherwise we'll need to use direct SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: query.replace('$1', `'${schema}'`)
    }).catch(() => ({ data: null, error: { message: 'RPC not available' } }))

    if (error || !data) {
      console.warn(`⚠️  Could not query via REST API. Using fallback method...`)
      // Fallback: return empty map, we'll generate types manually
      return new Map()
    }

    const columnsByTable = new Map<string, ColumnInfo[]>()
    
    if (Array.isArray(data)) {
      for (const row of data) {
        const tableName = row.table_name
        if (!columnsByTable.has(tableName)) {
          columnsByTable.set(tableName, [])
        }
        columnsByTable.get(tableName)!.push(row as ColumnInfo)
      }
    }

    return columnsByTable
  } catch (error) {
    console.warn(`⚠️  Error querying schema: ${error}`)
    return new Map()
  }
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

  // Handle PostGIS geometry types
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
  console.log('🔍 Generating TypeScript types from database schema...\n')

  // Get columns for apr schema
  const aprColumns = await getTableColumns('apr')
  
  // Get columns for records schema
  const recordsColumns = await getTableColumns('records')

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
    }
  } else {
    // Fallback: Generate types manually based on known schema
    console.log('📝 Generating types from known schema structure...')
    
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
      output += `      ${tableName}: {\n        Row: ${typeName}\n        Insert: Omit<${typeName}, 'id' | 'created_at' | 'updated_at'>\n        Update: Partial<Omit<${typeName}, 'id' | 'created_at' | 'updated_at'>>\n      }\n`
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

  console.log(`✅ Types generated successfully: ${outputPath}`)
  console.log(`   Tables found: ${aprColumns.size + recordsColumns.size}`)
}

generateDatabaseTypes().catch(console.error)

