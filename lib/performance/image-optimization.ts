/**
 * Image Optimization Utilities
 * Provides image optimization for Next.js Image component
 */

import { logger } from '@/lib/logger'

/**
 * Image optimization configuration
 */
export interface ImageConfig {
  quality?: number // 1-100
  width?: number
  height?: number
  format?: 'webp' | 'avif' | 'jpeg' | 'png'
  blur?: number // Blur placeholder
}

/**
 * Default image configuration
 */
export const defaultImageConfig: Required<ImageConfig> = {
  quality: 85,
  width: 1920,
  height: 1080,
  format: 'webp',
  blur: 0,
}

/**
 * Generate optimized image URL
 */
export function getOptimizedImageUrl(
  src: string,
  config: Partial<ImageConfig> = {}
): string {
  // For Next.js Image component, optimization is handled automatically
  // This function can be used to add query parameters for external images
  if (src.startsWith('http') && !src.includes('supabase')) {
    // External image - could use image optimization service
    const params = new URLSearchParams()
    if (config.width) params.set('w', String(config.width))
    if (config.height) params.set('h', String(config.height))
    if (config.quality) params.set('q', String(config.quality))
    if (config.format) params.set('f', config.format)

    return params.toString() ? `${src}?${params.toString()}` : src
  }

  return src
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): {
  valid: boolean
  error?: string
} {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Image size exceeds maximum of ${maxSize / 1024 / 1024}MB`,
    }
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Image type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    }
  }

  return { valid: true }
}

/**
 * Get image dimensions
 */
export function getImageDimensions(file: File): Promise<{
  width: number
  height: number
}> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({
        width: img.width,
        height: img.height,
      })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

