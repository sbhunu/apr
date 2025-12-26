/**
 * Input Sanitization
 * Sanitizes user input to prevent XSS and injection attacks
 */

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return String(input)
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '')

  // Remove script tags and event handlers
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
  sanitized = sanitized.replace(/javascript:/gi, '')
  sanitized = sanitized.replace(/data:text\/html/gi, '')

  // Remove potentially dangerous attributes
  sanitized = sanitized.replace(/style\s*=\s*["'][^"']*["']/gi, '')

  return sanitized.trim()
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj) as T
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as T
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value)
    }
    return sanitized as T
  }

  return obj
}

/**
 * Sanitize SQL identifier (for dynamic table/column names)
 */
export function sanitizeSQLIdentifier(identifier: string): string {
  // Only allow alphanumeric, underscore, and schema prefix
  return identifier.replace(/[^a-zA-Z0-9_.]/g, '')
}

/**
 * Escape HTML entities
 */
export function escapeHTML(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }

  return input.replace(/[&<>"'/]/g, (char) => map[char] || char)
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string | null {
  const sanitized = sanitizeString(email).toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(sanitized) ? sanitized : null
}

/**
 * Validate and sanitize URL
 */
export function sanitizeURL(url: string): string | null {
  const sanitized = sanitizeString(url)
  try {
    const parsed = new URL(sanitized)
    // Only allow http and https protocols
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString()
    }
    return null
  } catch {
    return null
  }
}

