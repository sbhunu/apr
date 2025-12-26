/**
 * Test PostGIS functionality
 * Run this to verify PostGIS extension is enabled and working
 * Usage: Call testPostGIS() from an API route or server component
 */

import { createClient } from './server'

export async function testPostGIS() {
  try {
    const supabase = await createClient()
    
    // Test PostGIS version
    const { data, error } = await supabase.rpc('postgis_version')
    
    if (error) {
      // For now, we'll test via SQL editor in Supabase dashboard
      // This function serves as documentation
      return {
        success: false,
        message: 'PostGIS test requires SQL execution. Run in Supabase SQL editor:',
        sql: 'SELECT PostGIS_Version();',
        error: error.message
      }
    }
    
    return {
      success: true,
      postgisVersion: data,
      message: 'PostGIS is enabled and working'
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      message: 'Failed to test PostGIS connection'
    }
  }
}

/**
 * SQL to run in Supabase SQL Editor to test PostGIS:
 * 
 * SELECT PostGIS_Version();
 * 
 * Expected output: Version string like "3.4.0"
 */

