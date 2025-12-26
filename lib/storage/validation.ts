/**
 * File Validation
 * Validates files before upload
 */

import { FileValidationResult, StorageConfig } from './types'
import { DEFAULT_STORAGE_CONFIG } from './config'

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  config: StorageConfig = DEFAULT_STORAGE_CONFIG
): FileValidationResult {
  const errors: string[] = []

  // Check file size
  if (file.size > config.maxFileSize) {
    errors.push(
      `File size exceeds maximum allowed size of ${formatFileSize(config.maxFileSize)}`
    )
  }

  // Check file type
  const fileExtension = getFileExtension(file.name)
  if (!config.allowedExtensions.includes(fileExtension.toLowerCase())) {
    errors.push(
      `File type not allowed. Allowed types: ${config.allowedExtensions.join(', ')}`
    )
  }

  // Check MIME type
  if (file.type && !config.allowedMimeTypes.includes(file.type)) {
    errors.push(
      `MIME type not allowed. Allowed types: ${config.allowedMimeTypes.join(', ')}`
    )
  }

  // Check file name
  if (!file.name || file.name.trim().length === 0) {
    errors.push('File name is required')
  }

  // Check for invalid characters in file name
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/
  if (invalidChars.test(file.name)) {
    errors.push('File name contains invalid characters')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.substring(lastDot)
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove invalid characters
  let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
  
  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '')
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = getFileExtension(sanitized)
    const nameWithoutExt = sanitized.substring(0, sanitized.length - ext.length)
    sanitized = nameWithoutExt.substring(0, 255 - ext.length) + ext
  }
  
  return sanitized
}

