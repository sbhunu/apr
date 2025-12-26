/**
 * Certificate of Sectional Title Template
 * Generates QR-coded, hash-secured title certificates
 */

import { BaseTemplate } from '../base-template'
import { PDFGenerator } from '../pdf-generator'
import {
  CertificateData,
  DocumentGenerationOptions,
  DocumentGenerationResult,
  Placeholder,
  TemplateMetadata,
} from '../types'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

/**
 * Certificate template class
 */
export class CertificateTemplate extends BaseTemplate {
  constructor() {
    const metadata: TemplateMetadata = {
      id: 'certificate-sectional-title',
      name: 'Certificate of Sectional Title',
      type: 'certificate',
      version: '1.0.0',
      description: 'Official certificate of sectional title with QR code and digital signature',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const placeholders: Placeholder[] = [
      { key: 'titleNumber', description: 'Title number', required: true, type: 'text' },
      { key: 'schemeName', description: 'Scheme name', required: true, type: 'text' },
      { key: 'schemeNumber', description: 'Scheme number', required: true, type: 'text' },
      { key: 'sectionNumber', description: 'Section number', required: true, type: 'text' },
      { key: 'holderName', description: 'Holder name', required: true, type: 'text' },
      { key: 'holderId', description: 'Holder ID', required: false, type: 'text' },
      { key: 'registrationDate', description: 'Registration date', required: true, type: 'date' },
      { key: 'area', description: 'Area in m²', required: true, type: 'number' },
      { key: 'participationQuota', description: 'Participation quota', required: true, type: 'number' },
      { key: 'conditions', description: 'Conditions', required: false, type: 'text' },
      { key: 'restrictions', description: 'Restrictions', required: false, type: 'text' },
      { key: 'verificationUrl', description: 'Verification URL', required: true, type: 'text' },
      { key: 'qrCode', description: 'QR code data', required: false, type: 'qr_code' },
      { key: 'signature', description: 'Digital signature', required: false, type: 'signature' },
    ]

    super(metadata, placeholders)
  }

  /**
   * Render certificate PDF
   */
  async render(data: CertificateData): Promise<Uint8Array> {
    // Validate data
    const validation = this.validateData(data as unknown as Record<string, unknown>)
    if (!validation.valid) {
      throw new Error(`Invalid certificate data: ${validation.errors.join(', ')}`)
    }

    const certData = data
    const pdf = new PDFGenerator('portrait', 'mm', 'a4')
    pdf.setMargins(20)

    const pageWidth = pdf.getAvailableWidth()
    const startY = 30

    // Government branding header
    pdf.addRectangle(20, 20, pageWidth, 40, {
      fill: true,
      fillColor: [34, 139, 34], // Government Green
      stroke: false,
    })

    pdf.addText('GOVERNMENT OF ZIMBABWE', 20 + pageWidth / 2, 35, {
      fontSize: 16,
      fontStyle: 'bold',
      align: 'center',
      color: [255, 255, 255],
    })

    pdf.addText('CERTIFICATE OF SECTIONAL TITLE', 20 + pageWidth / 2, 50, {
      fontSize: 14,
      fontStyle: 'bold',
      align: 'center',
      color: [255, 255, 255],
    })

    let currentY = 80

    // Title information section
    pdf.addText('Title Number:', 30, currentY, { fontSize: 10, fontStyle: 'bold' })
    pdf.addText(certData.titleNumber, 80, currentY, { fontSize: 10 })
    currentY += 10

    pdf.addText('Scheme Name:', 30, currentY, { fontSize: 10, fontStyle: 'bold' })
    pdf.addText(certData.schemeName, 80, currentY, { fontSize: 10 })
    currentY += 10

    pdf.addText('Scheme Number:', 30, currentY, { fontSize: 10, fontStyle: 'bold' })
    pdf.addText(certData.schemeNumber, 80, currentY, { fontSize: 10 })
    currentY += 10

    pdf.addText('Section Number:', 30, currentY, { fontSize: 10, fontStyle: 'bold' })
    pdf.addText(certData.sectionNumber, 80, currentY, { fontSize: 10 })
    currentY += 15

    // Holder information
    pdf.addLine(30, currentY, 190, currentY)
    currentY += 10

    pdf.addText('HOLDER INFORMATION', 30, currentY, {
      fontSize: 12,
      fontStyle: 'bold',
    })
    currentY += 10

    pdf.addText('Name:', 30, currentY, { fontSize: 10, fontStyle: 'bold' })
    pdf.addText(certData.holderName, 80, currentY, { fontSize: 10 })
    currentY += 10

    if (certData.holderId) {
      pdf.addText('ID Number:', 30, currentY, { fontSize: 10, fontStyle: 'bold' })
      pdf.addText(certData.holderId, 80, currentY, { fontSize: 10 })
      currentY += 10
    }

    currentY += 10

    // Property details
    pdf.addLine(30, currentY, 190, currentY)
    currentY += 10

    pdf.addText('PROPERTY DETAILS', 30, currentY, {
      fontSize: 12,
      fontStyle: 'bold',
    })
    currentY += 10

    pdf.addText('Area:', 30, currentY, { fontSize: 10, fontStyle: 'bold' })
    pdf.addText(`${certData.area.toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`, 80, currentY, { fontSize: 10 })
    currentY += 10

    pdf.addText('Participation Quota:', 30, currentY, { fontSize: 10, fontStyle: 'bold' })
    pdf.addText(`${certData.participationQuota.toFixed(4)}%`, 80, currentY, { fontSize: 10 })
    currentY += 10

    pdf.addText('Registration Date:', 30, currentY, { fontSize: 10, fontStyle: 'bold' })
    pdf.addText(
      new Date(certData.registrationDate).toLocaleDateString('en-ZW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      80,
      currentY,
      { fontSize: 10 }
    )
    currentY += 15

    // Conditions and restrictions
    if (certData.conditions) {
      pdf.addLine(30, currentY, 190, currentY)
      currentY += 10
      pdf.addText('CONDITIONS', 30, currentY, { fontSize: 12, fontStyle: 'bold' })
      currentY += 8
      pdf.addText(certData.conditions, 30, currentY, {
        fontSize: 9,
        maxWidth: pageWidth - 20,
      })
      currentY += 20
    }

    if (certData.restrictions) {
      pdf.addLine(30, currentY, 190, currentY)
      currentY += 10
      pdf.addText('RESTRICTIONS', 30, currentY, { fontSize: 12, fontStyle: 'bold' })
      currentY += 8
      pdf.addText(certData.restrictions, 30, currentY, {
        fontSize: 9,
        maxWidth: pageWidth - 20,
      })
      currentY += 20
    }

    // QR Code
    const qrCodeY = currentY
    const qrCodeX = 150
    const qrCodeSize = 40

    try {
      await pdf.addQRCode(
        {
          data: certData.verificationUrl,
          size: qrCodeSize,
          errorCorrectionLevel: 'H', // High error correction for certificates
        },
        qrCodeX,
        qrCodeY
      )

      pdf.addText('Scan to verify', qrCodeX + qrCodeSize / 2, qrCodeY + qrCodeSize + 5, {
        fontSize: 8,
        align: 'center',
      })
    } catch (error) {
      logger.error('Failed to add QR code to certificate', error as Error)
      // Continue without QR code
    }

    // Footer
    const footerY = 270
    pdf.addLine(30, footerY, 190, footerY)
    pdf.addText(
      'This certificate is issued by the Registrar of Deeds',
      30 + pageWidth / 2,
      footerY + 5,
      { fontSize: 8, align: 'center' }
    )

    pdf.addText(
      `Generated on ${new Date().toLocaleDateString('en-ZW')}`,
      30 + pageWidth / 2,
      footerY + 10,
      { fontSize: 8, align: 'center' }
    )

    return pdf.generate()
  }

  /**
   * Get template content (not used for PDF, but required by base class)
   */
  protected getTemplateContent(): string {
    return 'Certificate template - rendered as PDF'
  }

  /**
   * Generate certificate with hash
   */
  async generateCertificate(
    options: DocumentGenerationOptions
  ): Promise<DocumentGenerationResult> {
    try {
      // Render PDF
      const pdfBuffer = await this.render(options.data)

      // Calculate document hash
      const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex')

      // Generate QR code data URL for verification
      const verificationUrl = (options.data as CertificateData).verificationUrl
      const qrCodeData = verificationUrl

      logger.info('Certificate generated', {
        templateId: this.metadata.id,
        titleNumber: (options.data as CertificateData).titleNumber,
        hash,
      })

      return {
        success: true,
        documentHash: hash,
        qrCodeData,
        metadata: {
          templateVersion: this.version,
          generatedAt: new Date().toISOString(),
        },
      }
    } catch (error) {
      logger.error('Failed to generate certificate', error as Error, {
        templateId: this.metadata.id,
      })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

