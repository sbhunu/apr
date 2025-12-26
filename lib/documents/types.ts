/**
 * Document Template Type Definitions
 * Defines types for document generation and templates
 */

/**
 * Template types
 */
export type TemplateType = 'certificate' | 'scheme_plan' | 'report' | 'other'

/**
 * Template version
 */
export interface TemplateVersion {
  version: string
  created_at: string
  is_active: boolean
  description?: string
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  id: string
  name: string
  type: TemplateType
  version: string
  description?: string
  created_at: string
  updated_at: string
}

/**
 * Placeholder definition
 */
export interface Placeholder {
  key: string
  description: string
  required: boolean
  type: 'text' | 'number' | 'date' | 'image' | 'qr_code' | 'signature'
  default?: string
}

/**
 * Document generation options
 */
export interface DocumentGenerationOptions {
  templateId: string
  templateVersion?: string
  data: Record<string, unknown>
  outputFormat?: 'pdf' | 'png' | 'jpg'
  includeQRCode?: boolean
  includeSignatures?: boolean
  metadata?: Record<string, unknown>
}

/**
 * Document generation result
 */
export interface DocumentGenerationResult {
  success: boolean
  documentUrl?: string
  documentHash?: string
  qrCodeData?: string
  error?: string
  metadata?: Record<string, unknown>
}

/**
 * Certificate data structure
 */
export interface CertificateData {
  titleNumber: string
  schemeName: string
  schemeNumber: string
  sectionNumber: string
  holderName: string
  holderId?: string
  registrationDate: string
  area: number
  participationQuota: number
  conditions?: string
  restrictions?: string
  verificationUrl: string
}

/**
 * Scheme plan data structure
 */
export interface SchemePlanData {
  schemeNumber: string
  schemeName: string
  location: string
  registrationDate: string
  surveyNumber: string
  sections: Array<{
    sectionNumber: string
    area: number
    quota: number
  }>
  totalArea: number
  commonArea: number
}

/**
 * QR code configuration
 */
export interface QRCodeConfig {
  data: string
  size?: number
  margin?: number
  color?: {
    dark: string
    light: string
  }
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
}

