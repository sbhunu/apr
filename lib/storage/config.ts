/**
 * Storage Configuration
 * Configuration for Supabase Storage buckets and file handling
 */

import { StorageConfig } from './types'

/**
 * Default storage configuration
 */
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  bucket: 'planning-documents',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/vnd.dwg', // AutoCAD DWG
    'application/vnd.dxf', // AutoCAD DXF
  ],
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.dwg', '.dxf'],
}

/**
 * Planning documents bucket configuration
 */
export const PLANNING_DOCUMENTS_CONFIG: StorageConfig = {
  ...DEFAULT_STORAGE_CONFIG,
  bucket: 'planning-documents',
}

/**
 * Survey documents bucket configuration
 */
export const SURVEY_DOCUMENTS_CONFIG: StorageConfig = {
  ...DEFAULT_STORAGE_CONFIG,
  bucket: 'survey-documents',
}

/**
 * Deeds documents bucket configuration
 */
export const DEEDS_DOCUMENTS_CONFIG: StorageConfig = {
  ...DEFAULT_STORAGE_CONFIG,
  bucket: 'deeds-documents',
}

/**
 * Get storage config by document type
 */
export function getStorageConfig(documentType: string): StorageConfig {
  if (documentType.startsWith('planning') || documentType === 'plan_layout' || documentType === 'site_plan') {
    return PLANNING_DOCUMENTS_CONFIG
  }
  if (documentType.startsWith('survey')) {
    return SURVEY_DOCUMENTS_CONFIG
  }
  if (documentType.startsWith('deeds')) {
    return DEEDS_DOCUMENTS_CONFIG
  }
  return DEFAULT_STORAGE_CONFIG
}

