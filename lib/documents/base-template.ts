/**
 * Base Template Class
 * Provides placeholder replacement and template rendering functionality
 */

import { Placeholder, TemplateMetadata, TemplateType } from './types'
import { logger } from '@/lib/logger'

/**
 * Base template class
 */
export abstract class BaseTemplate {
  protected metadata: TemplateMetadata
  protected placeholders: Placeholder[]
  protected version: string

  constructor(metadata: TemplateMetadata, placeholders: Placeholder[] = []) {
    this.metadata = metadata
    this.placeholders = placeholders
    this.version = metadata.version
  }

  /**
   * Get template metadata
   */
  getMetadata(): TemplateMetadata {
    return { ...this.metadata }
  }

  /**
   * Get template placeholders
   */
  getPlaceholders(): Placeholder[] {
    return [...this.placeholders]
  }

  /**
   * Validate data against placeholders
   */
  validateData(data: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    for (const placeholder of this.placeholders) {
      if (placeholder.required && !(placeholder.key in data)) {
        if (!placeholder.default) {
          errors.push(`Missing required placeholder: ${placeholder.key}`)
        }
      }

      if (placeholder.key in data) {
        const value = data[placeholder.key]
        const typeCheck = this.validateType(value, placeholder.type)
        if (!typeCheck.valid) {
          errors.push(`Invalid type for ${placeholder.key}: ${typeCheck.error}`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate value type
   */
  private validateType(
    value: unknown,
    expectedType: Placeholder['type']
  ): { valid: boolean; error?: string } {
    switch (expectedType) {
      case 'text':
        return { valid: typeof value === 'string' }
      case 'number':
        return { valid: typeof value === 'number' && !isNaN(value) }
      case 'date':
        return {
          valid: typeof value === 'string' && !isNaN(Date.parse(value as string)),
        }
      case 'image':
        return {
          valid: typeof value === 'string' && (value as string).startsWith('data:image'),
        }
      case 'qr_code':
        return { valid: typeof value === 'string' }
      case 'signature':
        return { valid: typeof value === 'string' || typeof value === 'object' }
      default:
        return { valid: true }
    }
  }

  /**
   * Replace placeholders in template
   */
  protected replacePlaceholders(
    template: string,
    data: Record<string, unknown>
  ): string {
    let result = template

    for (const placeholder of this.placeholders) {
      const key = `{{${placeholder.key}}}`
      const value = data[placeholder.key] ?? placeholder.default ?? ''

      // Format value based on type
      const formattedValue = this.formatValue(value, placeholder.type)
      result = result.replace(new RegExp(key, 'g'), formattedValue)
    }

    return result
  }

  /**
   * Format value based on type
   */
  private formatValue(value: unknown, type: Placeholder['type']): string {
    switch (type) {
      case 'date':
        if (typeof value === 'string') {
          try {
            return new Date(value).toLocaleDateString('en-ZW', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          } catch {
            return String(value)
          }
        }
        return String(value)
      case 'number':
        if (typeof value === 'number') {
          return value.toLocaleString('en-ZW', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        }
        return String(value)
      default:
        return String(value)
    }
  }

  /**
   * Abstract method to render document
   * Must be implemented by subclasses
   */
  abstract render(data: Record<string, unknown>): Promise<Buffer | Uint8Array>

  /**
   * Abstract method to get template content
   * Must be implemented by subclasses
   */
  protected abstract getTemplateContent(): string | Promise<string>
}

/**
 * Template registry
 */
export class TemplateRegistry {
  private templates: Map<string, BaseTemplate> = new Map()

  /**
   * Register a template
   */
  register(template: BaseTemplate): void {
    const key = `${template.getMetadata().type}:${template.getMetadata().id}:${template.getMetadata().version}`
    this.templates.set(key, template)
    logger.info('Template registered', {
      key,
      type: template.getMetadata().type,
      name: template.getMetadata().name,
    })
  }

  /**
   * Get template by ID and version
   */
  get(templateId: string, type: TemplateType, version?: string): BaseTemplate | null {
    if (version) {
      const key = `${type}:${templateId}:${version}`
      return this.templates.get(key) || null
    }

    // Get latest version if not specified
    const matchingTemplates = Array.from(this.templates.values()).filter(
      (t) => t.getMetadata().id === templateId && t.getMetadata().type === type
    )

    if (matchingTemplates.length === 0) {
      return null
    }

    // Sort by version and return latest
    matchingTemplates.sort((a, b) => {
      return b.getMetadata().version.localeCompare(a.getMetadata().version)
    })

    return matchingTemplates[0]
  }

  /**
   * List all templates of a type
   */
  list(type?: TemplateType): BaseTemplate[] {
    if (type) {
      return Array.from(this.templates.values()).filter(
        (t) => t.getMetadata().type === type
      )
    }
    return Array.from(this.templates.values())
  }

  /**
   * Clear registry
   */
  clear(): void {
    this.templates.clear()
  }
}

// Global template registry instance
export const templateRegistry = new TemplateRegistry()

