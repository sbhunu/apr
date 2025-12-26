/**
 * Template Manager
 * Manages template registration, versioning, and generation
 */

import { BaseTemplate, templateRegistry } from './base-template'
import { CertificateTemplate } from './templates/certificate-template'
import { ProvincialCertificateTemplate } from './templates/certificate-template-provincial'
import { MinimalCertificateTemplate } from './templates/certificate-template-minimal'
import { SchemePlanTemplate } from './templates/scheme-plan-template'
import {
  DocumentGenerationOptions,
  DocumentGenerationResult,
  TemplateType,
} from './types'
import { logger } from '@/lib/logger'

/**
 * Template manager class
 */
export class TemplateManager {
  private initialized = false

  /**
   * Initialize template registry with default templates
   */
  initialize(): void {
    if (this.initialized) {
      return
    }

    // Register default templates
    const certificateTemplate = new CertificateTemplate()
    templateRegistry.register(certificateTemplate)

    const provincialTemplate = new ProvincialCertificateTemplate()
    templateRegistry.register(provincialTemplate)

    const minimalTemplate = new MinimalCertificateTemplate()
    templateRegistry.register(minimalTemplate)

    const schemePlanTemplate = new SchemePlanTemplate()
    templateRegistry.register(schemePlanTemplate)

    this.initialized = true
    logger.info('Template manager initialized', {
      templatesRegistered: templateRegistry.list().length,
    })
  }

  /**
   * Generate document from template
   */
  async generateDocument(
    options: DocumentGenerationOptions & { templateType?: TemplateType }
  ): Promise<DocumentGenerationResult> {
    this.initialize()

    const template = templateRegistry.get(
      options.templateId,
      options.templateType || 'certificate',
      options.templateVersion
    )

    if (!template) {
      return {
        success: false,
        error: `Template not found: ${options.templateId}`,
      }
    }

    try {
      // Validate data
      const validation = template.validateData(options.data)
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        }
      }

      // Generate document based on template type
      if (template instanceof CertificateTemplate) {
        return await template.generateCertificate(options)
      } else if (template instanceof SchemePlanTemplate) {
        return await template.generateSchemePlan(options)
      } else {
        // Generic template rendering
        const buffer = await template.render(options.data)
        return {
          success: true,
          metadata: {
            templateVersion: template.getMetadata().version,
            generatedAt: new Date().toISOString(),
          },
        }
      }
    } catch (error) {
      logger.error('Document generation failed', error as Error, {
        templateId: options.templateId,
        templateType: options.templateType,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * List available templates
   */
  listTemplates(type?: TemplateType): BaseTemplate[] {
    this.initialize()
    return templateRegistry.list(type)
  }

  /**
   * Get template by ID
   */
  getTemplate(
    templateId: string,
    type: TemplateType,
    version?: string
  ): BaseTemplate | null {
    this.initialize()
    return templateRegistry.get(templateId, type, version)
  }
}

// Global template manager instance
export const templateManager = new TemplateManager()

