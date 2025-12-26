/**
 * proj4 initialization helper
 * Handles CommonJS module import correctly for Next.js/Turbopack
 */

import proj4Lib from 'proj4'

let proj4Instance: any = null

/**
 * Initialize and get proj4 instance
 * This ensures proj4 is loaded correctly in both server and client contexts
 */
export function getProj4() {
  if (proj4Instance) {
    return proj4Instance
  }

  // Get proj4 from the imported module
  // Handle both default export and named export cases
  proj4Instance = (proj4Lib as any).default || proj4Lib
  
  // Verify defs is available
  if (!proj4Instance || typeof proj4Instance.defs !== 'function') {
    throw new Error(
      'proj4.defs is not available. The proj4 module may not be loaded correctly.'
    )
  }

  return proj4Instance
}

/**
 * Initialize coordinate reference systems
 * Call this once when the module loads
 */
export function initProj4() {
  const proj4 = getProj4()

  // Define coordinate reference systems
  // SRID 32735: UTM Zone 35S (Zimbabwe)
  if (!proj4.defs('EPSG:32735')) {
    proj4.defs(
      'EPSG:32735',
      '+proj=utm +zone=35 +south +datum=WGS84 +units=m +no_defs'
    )
  }

  // WGS84 (EPSG:4326) - Standard lat/lon
  if (!proj4.defs('EPSG:4326')) {
    proj4.defs(
      'EPSG:4326',
      '+proj=longlat +datum=WGS84 +no_defs'
    )
  }

  return proj4
}

// Initialize on module load
let initialized = false
if (typeof window !== 'undefined' || typeof global !== 'undefined') {
  try {
    initProj4()
    initialized = true
  } catch (e) {
    // Initialization will happen lazily
  }
}

