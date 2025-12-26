/**
 * Provincial Certificate Template (Alternative Style)
 * A variant certificate template with different formatting
 */

import { CertificateTemplate } from './certificate-template'
import { TemplateMetadata } from '../types'
import { PDFGenerator } from '../pdf-generator'
import { CertificateData } from '../types'
import { logger } from '@/lib/logger'

/**
 * Provincial certificate template variant
 */
export class ProvincialCertificateTemplate extends CertificateTemplate {
  constructor() {
    const metadata: TemplateMetadata = {
      id: 'certificate-sectional-title-provincial',
      name: 'Provincial Certificate of Sectional Title',
      type: 'certificate',
      version: '1.0.0',
      description: 'Provincial variant certificate template with enhanced formatting',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    super()
    // Override metadata
    this.metadata = metadata
  }

  /**
   * Render certificate PDF with provincial styling
   */
  async render(data: CertificateData): Promise<Uint8Array> {
    // Validate data
    const validation = this.validateData(data as unknown as Record<string, unknown>)
    if (!validation.valid) {
      throw new Error(`Invalid certificate data: ${validation.errors.join(', ')}`)
    }

    const certData = data
    const pdf = new PDFGenerator('portrait', 'mm', 'a4')
    pdf.setMargins(25)

    const pageWidth = pdf.getAvailableWidth()
    const startY = 35

    // Provincial header with different color scheme
    pdf.addRectangle(25, 25, pageWidth, 45, {
      fill: true,
      fillColor: [0, 51, 102], // Dark blue
      stroke: false,
    })

    pdf.addText('REPUBLIC OF ZIMBABWE', 25 + pageWidth / 2, 40, {
      fontSize: 14,
      fontStyle: 'bold',
      align: 'center',
      color: [255, 255, 255],
    })

    pdf.addText('PROVINCIAL REGISTRY', 25 + pageWidth / 2, 52, {
      fontSize: 12,
      fontStyle: 'bold',
      align: 'center',
      color: [255, 255, 255],
    })

    pdf.addText('CERTIFICATE OF SECTIONAL TITLE', 25 + pageWidth / 2, 62, {
      fontSize: 13,
      fontStyle: 'bold',
      align: 'center',
      color: [255, 255, 255],
    })

    let currentY = 90

    // Certificate number badge
    pdf.addRectangle(30, currentY, 60, 15, {
      fill: true,
      fillColor: [240, 240, 240],
      stroke: true,
      strokeColor: [0, 0, 0],
    })
    pdf.addText('CERTIFICATE NO.', 35, currentY + 5, { fontSize: 8, fontStyle: 'bold' })
    pdf.addText(certData.titleNumber, 35, currentY + 10, { fontSize: 10, fontStyle: 'bold' })
    currentY += 25

    // Title information in a more structured layout
    pdf.addText('SCHEME INFORMATION', 30, currentY, {
      fontSize: 11,
      fontStyle: 'bold',
      color: [0, 51, 102],
    })
    currentY += 8

    pdf.addText('Scheme Name:', 35, currentY, { fontSize: 9, fontStyle: 'bold' })
    pdf.addText(certData.schemeName, 90, currentY, { fontSize: 9 })
    currentY += 7

    pdf.addText('Scheme Number:', 35, currentY, { fontSize: 9, fontStyle: 'bold' })
    pdf.addText(certData.schemeNumber, 90, currentY, { fontSize: 9 })
    currentY += 7

    pdf.addText('Section Number:', 35, currentY, { fontSize: 9, fontStyle: 'bold' })
    pdf.addText(certData.sectionNumber, 90, currentY, { fontSize: 9 })
    currentY += 12

    // Holder information with box
    pdf.addRectangle(30, currentY, pageWidth - 10, 35, {
      fill: false,
      stroke: true,
      strokeColor: [0, 0, 0],
    })
    pdf.addText('REGISTERED HOLDER', 35, currentY + 5, {
      fontSize: 10,
      fontStyle: 'bold',
      color: [0, 51, 102],
    })
    currentY += 8

    pdf.addText('Name:', 35, currentY, { fontSize: 9, fontStyle: 'bold' })
    pdf.addText(certData.holderName, 70, currentY, { fontSize: 9 })
    currentY += 7

    if (certData.holderId) {
      pdf.addText('ID Number:', 35, currentY, { fontSize: 9, fontStyle: 'bold' })
      pdf.addText(certData.holderId, 70, currentY, { fontSize: 9 })
      currentY += 7
    }

    currentY += 5

    // Property details in table format
    pdf.addText('PROPERTY DETAILS', 30, currentY, {
      fontSize: 11,
      fontStyle: 'bold',
      color: [0, 51, 102],
    })
    currentY += 8

    const propertyDetails = [
      ['Area:', `${certData.area.toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`],
      ['Participation Quota:', `${certData.participationQuota.toFixed(4)}%`],
      ['Registration Date:', new Date(certData.registrationDate).toLocaleDateString('en-ZW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })],
    ]

    propertyDetails.forEach(([label, value]) => {
      pdf.addText(label, 35, currentY, { fontSize: 9, fontStyle: 'bold' })
      pdf.addText(value, 100, currentY, { fontSize: 9 })
      currentY += 7
    })

    currentY += 8

    // Conditions and restrictions
    if (certData.conditions) {
      pdf.addText('CONDITIONS OF TENURE', 30, currentY, {
        fontSize: 10,
        fontStyle: 'bold',
        color: [0, 51, 102],
      })
      currentY += 7
      pdf.addText(certData.conditions, 35, currentY, {
        fontSize: 8,
        maxWidth: pageWidth - 20,
      })
      currentY += 20
    }

    if (certData.restrictions) {
      pdf.addText('RESTRICTIONS', 30, currentY, {
        fontSize: 10,
        fontStyle: 'bold',
        color: [0, 51, 102],
      })
      currentY += 7
      pdf.addText(certData.restrictions, 35, currentY, {
        fontSize: 8,
        maxWidth: pageWidth - 20,
      })
      currentY += 20
    }

    // QR Code on the right side
    const qrCodeY = currentY
    const qrCodeX = 150
    const qrCodeSize = 45

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

      pdf.addText('Verify Certificate', qrCodeX + qrCodeSize / 2, qrCodeY + qrCodeSize + 5, {
        fontSize: 8,
        align: 'center',
        fontStyle: 'bold',
      })
    } catch (error) {
      logger.error('Failed to add QR code to certificate', error as Error)
    }

    // Footer with provincial seal area
    const footerY = 270
    pdf.addLine(30, footerY, 190, footerY)
    pdf.addText(
      'Issued by the Provincial Registrar of Deeds',
      30 + pageWidth / 2,
      footerY + 5,
      { fontSize: 8, align: 'center', fontStyle: 'bold' }
    )

    pdf.addText(
      `Certificate Generated: ${new Date().toLocaleDateString('en-ZW')}`,
      30 + pageWidth / 2,
      footerY + 10,
      { fontSize: 7, align: 'center' }
    )

    return pdf.generate()
  }
}

