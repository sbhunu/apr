/**
 * Minimal Certificate Template
 * A simplified certificate template for standard use cases
 */

import { CertificateTemplate } from './certificate-template'
import { TemplateMetadata } from '../types'
import { PDFGenerator } from '../pdf-generator'
import { CertificateData } from '../types'
import { logger } from '@/lib/logger'

/**
 * Minimal certificate template variant
 */
export class MinimalCertificateTemplate extends CertificateTemplate {
  constructor() {
    const metadata: TemplateMetadata = {
      id: 'certificate-sectional-title-minimal',
      name: 'Minimal Certificate of Sectional Title',
      type: 'certificate',
      version: '1.0.0',
      description: 'Simplified certificate template with minimal formatting',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    super()
    // Override metadata
    this.metadata = metadata
  }

  /**
   * Render certificate PDF with minimal styling
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
    let currentY = 40

    // Simple header
    pdf.addText('CERTIFICATE OF SECTIONAL TITLE', 20 + pageWidth / 2, currentY, {
      fontSize: 16,
      fontStyle: 'bold',
      align: 'center',
    })
    currentY += 15

    pdf.addLine(20, currentY, 190, currentY)
    currentY += 10

    // Title number prominently displayed
    pdf.addText('Title Number:', 30, currentY, { fontSize: 11, fontStyle: 'bold' })
    pdf.addText(certData.titleNumber, 100, currentY, { fontSize: 12, fontStyle: 'bold' })
    currentY += 12

    // Scheme and section info
    pdf.addText(`Scheme: ${certData.schemeName} (${certData.schemeNumber})`, 30, currentY, {
      fontSize: 10,
    })
    currentY += 8

    pdf.addText(`Section: ${certData.sectionNumber}`, 30, currentY, { fontSize: 10 })
    currentY += 12

    // Holder
    pdf.addText('Registered Holder:', 30, currentY, { fontSize: 10, fontStyle: 'bold' })
    currentY += 8
    pdf.addText(certData.holderName, 35, currentY, { fontSize: 10 })
    currentY += 6

    if (certData.holderId) {
      pdf.addText(`ID: ${certData.holderId}`, 35, currentY, { fontSize: 9 })
      currentY += 6
    }

    currentY += 10

    // Property details
    pdf.addText('Property Details:', 30, currentY, { fontSize: 10, fontStyle: 'bold' })
    currentY += 8

    pdf.addText(
      `Area: ${certData.area.toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`,
      35,
      currentY,
      { fontSize: 9 }
    )
    currentY += 7

    pdf.addText(`Participation Quota: ${certData.participationQuota.toFixed(4)}%`, 35, currentY, {
      fontSize: 9,
    })
    currentY += 7

    pdf.addText(
      `Registered: ${new Date(certData.registrationDate).toLocaleDateString('en-ZW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`,
      35,
      currentY,
      { fontSize: 9 }
    )
    currentY += 15

    // Conditions and restrictions (if any)
    if (certData.conditions) {
      pdf.addText('Conditions:', 30, currentY, { fontSize: 9, fontStyle: 'bold' })
      currentY += 6
      pdf.addText(certData.conditions, 35, currentY, {
        fontSize: 8,
        maxWidth: pageWidth - 20,
      })
      currentY += 15
    }

    if (certData.restrictions) {
      pdf.addText('Restrictions:', 30, currentY, { fontSize: 9, fontStyle: 'bold' })
      currentY += 6
      pdf.addText(certData.restrictions, 35, currentY, {
        fontSize: 8,
        maxWidth: pageWidth - 20,
      })
      currentY += 15
    }

    // QR Code centered
    const qrCodeY = currentY
    const qrCodeX = 20 + (pageWidth - 50) / 2
    const qrCodeSize = 50

    try {
      await pdf.addQRCode(
        {
          data: certData.verificationUrl,
          size: qrCodeSize,
          errorCorrectionLevel: 'H',
        },
        qrCodeX,
        qrCodeY
      )

      pdf.addText('Scan to verify authenticity', qrCodeX + qrCodeSize / 2, qrCodeY + qrCodeSize + 6, {
        fontSize: 8,
        align: 'center',
      })
    } catch (error) {
      logger.error('Failed to add QR code to certificate', error as Error)
    }

    // Simple footer
    const footerY = 270
    pdf.addLine(20, footerY, 190, footerY)
    pdf.addText('Registrar of Deeds', 20 + pageWidth / 2, footerY + 8, {
      fontSize: 9,
      align: 'center',
    })
    pdf.addText(
      `Generated: ${new Date().toLocaleDateString('en-ZW')}`,
      20 + pageWidth / 2,
      footerY + 13,
      { fontSize: 7, align: 'center' }
    )

    return pdf.generate()
  }
}

