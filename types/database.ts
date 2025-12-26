/**
 * Generated TypeScript types from Supabase database schema
 * 
 * This file is auto-generated. Do not edit manually.
 * Regenerate with: npm run types:generate
 * 
 * Generated: 2025-12-25T05:02:02.633Z
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
      user_profiles: {
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
    }
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
