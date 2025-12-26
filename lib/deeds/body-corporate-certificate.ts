/**
 * Body Corporate Registration Certificate Generator
 * Generates PDF certificates for Body Corporate registration
 */

import { templateManager } from '@/lib/documents'
import { CertificateTemplate } from '@/lib/documents/templates/certificate-template'
import { PDFGenerator } from '@/lib/documents/pdf-generator'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

/**
 * Body Corporate certificate data
 */
export interface BodyCorporateCertificateData {
  registrationNumber: string
  name: string
  schemeName: string
  schemeNumber: string
  registrationDate: string
  registeredAddress?: string
  trusteeCount: number
  trustees?: Array<{
    name: string
    role: string
  }>
  verificationUrl: string
}

/**
 * Generate Body Corporate registration certificate
 */
export async function generateBodyCorporateCertificate(
  data: BodyCorporateCertificateData
): Promise<{
  success: boolean
  pdfBuffer?: Uint8Array
  documentHash?: string
  error?: string
}> {
  try {
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

    pdf.addText('BODY CORPORATE REGISTRATION CERTIFICATE', 20 + pageWidth / 2, 50, {
      fontSize: 14,
      fontStyle: 'bold',
      align: 'center',
      color: [255, 255, 255],
    })

    let currentY = 80

    // Registration information
    pdf.addText('Registration Number:', 30, currentY, {
      fontSize: 10,
      fontStyle: 'bold',
    })
    pdf.addText(data.registrationNumber, 80, currentY, { fontSize: 10 })
    currentY += 10

    pdf.addText('Body Corporate Name:', 30, currentY, {
      fontSize: 10,
      fontStyle: 'bold',
    })
    pdf.addText(data.name, 80, currentY, { fontSize: 10 })
    currentY += 10

    pdf.addText('Scheme Name:', 30, currentY, { fontSize: 10, fontStyle: 'bold' })
    pdf.addText(data.schemeName, 80, currentY, { fontSize: 10 })
    currentY += 10

    pdf.addText('Scheme Number:', 30, currentY, {
      fontSize: 10,
      fontStyle: 'bold',
    })
    pdf.addText(data.schemeNumber, 80, currentY, { fontSize: 10 })
    currentY += 10

    pdf.addText('Registration Date:', 30, currentY, {
      fontSize: 10,
      fontStyle: 'bold',
    })
    pdf.addText(
      new Date(data.registrationDate).toLocaleDateString('en-ZW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      80,
      currentY,
      { fontSize: 10 }
    )
    currentY += 15

    // Address information
    if (data.registeredAddress) {
      pdf.addLine(30, currentY, 190, currentY)
      currentY += 10
      pdf.addText('Registered Address:', 30, currentY, {
        fontSize: 10,
        fontStyle: 'bold',
      })
      currentY += 8
      pdf.addText(data.registeredAddress, 30, currentY, {
        fontSize: 9,
        maxWidth: pageWidth - 20,
      })
      currentY += 15
    }

    // Trustee information
    pdf.addLine(30, currentY, 190, currentY)
    currentY += 10
    pdf.addText('INITIAL TRUSTEES', 30, currentY, {
      fontSize: 12,
      fontStyle: 'bold',
    })
    currentY += 10

    pdf.addText(`Total Trustees: ${data.trusteeCount}`, 30, currentY, {
      fontSize: 10,
    })
    currentY += 10

    if (data.trustees && data.trustees.length > 0) {
      const trusteeData: string[][] = [
        ['Name', 'Role'],
        ...data.trustees.map((t) => [t.name, t.role]),
      ]

      pdf.addTable(trusteeData, 30, currentY, {
        columnWidths: [100, 60],
        headerStyle: {
          fontSize: 10,
          fontStyle: 'bold',
          fillColor: [240, 240, 240],
        },
        cellStyle: {
          fontSize: 9,
          align: 'left',
        },
      })
      currentY += 20 + data.trustees.length * 8
    }

    // QR Code
    const qrCodeY = currentY
    const qrCodeX = 150
    const qrCodeSize = 40

    try {
      await pdf.addQRCode(
        {
          data: data.verificationUrl,
          size: qrCodeSize,
          errorCorrectionLevel: 'H',
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

    // Generate PDF buffer
    const pdfBuffer = pdf.generate()

    // Calculate document hash
    const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex')

    logger.info('Body Corporate certificate generated', {
      registrationNumber: data.registrationNumber,
      hash,
    })

    return {
      success: true,
      pdfBuffer,
      documentHash: hash,
    }
  } catch (error) {
    logger.error('Failed to generate Body Corporate certificate', error as Error, {
      registrationNumber: data.registrationNumber,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

