/**
 * PDF Generator Utility
 * Wrapper around jsPDF for document generation
 */

import { jsPDF } from 'jspdf'
import * as QRCode from 'qrcode'
import { QRCodeConfig } from './types'
import { logger } from '@/lib/logger'

/**
 * PDF generator class
 */
export class PDFGenerator {
  private doc: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margin: number

  constructor(
    orientation: 'portrait' | 'landscape' = 'portrait',
    unit: 'mm' | 'pt' | 'px' | 'in' = 'mm',
    format: 'a4' | 'letter' | [number, number] = 'a4'
  ) {
    this.doc = new jsPDF({
      orientation,
      unit,
      format,
    })
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
    this.margin = 20 // Default margin in mm
  }

  /**
   * Get document instance
   */
  getDocument(): jsPDF {
    return this.doc
  }

  /**
   * Set page margins
   */
  setMargins(margin: number): void {
    this.margin = margin
  }

  /**
   * Get available width (page width minus margins)
   */
  getAvailableWidth(): number {
    return this.pageWidth - this.margin * 2
  }

  /**
   * Get available height (page height minus margins)
   */
  getAvailableHeight(): number {
    return this.pageHeight - this.margin * 2
  }

  /**
   * Add text with word wrapping
   */
  addText(
    text: string,
    x: number,
    y: number,
    options: {
      maxWidth?: number
      fontSize?: number
      fontStyle?: 'normal' | 'bold' | 'italic'
      align?: 'left' | 'center' | 'right'
      color?: [number, number, number]
    } = {}
  ): void {
    const {
      maxWidth = this.getAvailableWidth(),
      fontSize = 12,
      fontStyle = 'normal',
      align = 'left',
      color = [0, 0, 0],
    } = options

    this.doc.setFontSize(fontSize)
    this.doc.setTextColor(color[0], color[1], color[2])

    if (fontStyle === 'bold') {
      this.doc.setFont(undefined, 'bold')
    } else if (fontStyle === 'italic') {
      this.doc.setFont(undefined, 'italic')
    } else {
      this.doc.setFont(undefined, 'normal')
    }

    const lines = this.doc.splitTextToSize(text, maxWidth)
    this.doc.text(lines, x, y, { align })
  }

  /**
   * Add heading
   */
  addHeading(
    text: string,
    x: number,
    y: number,
    level: 1 | 2 | 3 = 1
  ): void {
    const fontSize = level === 1 ? 18 : level === 2 ? 16 : 14
    const fontStyle: 'bold' = 'bold'
    this.addText(text, x, y, { fontSize, fontStyle, align: 'center' })
  }

  /**
   * Add QR code
   */
  async addQRCode(
    config: QRCodeConfig,
    x: number,
    y: number,
    size: number = 50
  ): Promise<void> {
    try {
      const qrDataUrl = await QRCode.toDataURL(config.data, {
        width: size * 4, // Higher resolution for better quality
        margin: config.margin ?? 1,
        color: {
          dark: config.color?.dark ?? '#000000',
          light: config.color?.light ?? '#FFFFFF',
        },
        errorCorrectionLevel: config.errorCorrectionLevel ?? 'M',
      })

      this.doc.addImage(qrDataUrl, 'PNG', x, y, size, size)
    } catch (error) {
      logger.error('Failed to generate QR code', error as Error, { config })
      throw error
    }
  }

  /**
   * Add image
   */
  addImage(
    imageData: string,
    x: number,
    y: number,
    width: number,
    height: number,
    format: 'PNG' | 'JPEG' = 'PNG'
  ): void {
    this.doc.addImage(imageData, format, x, y, width, height)
  }

  /**
   * Add line
   */
  addLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: [number, number, number] = [0, 0, 0],
    lineWidth: number = 0.5
  ): void {
    this.doc.setDrawColor(color[0], color[1], color[2])
    this.doc.setLineWidth(lineWidth)
    this.doc.line(x1, y1, x2, y2)
  }

  /**
   * Add rectangle
   */
  addRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    options: {
      fill?: boolean
      fillColor?: [number, number, number]
      stroke?: boolean
      strokeColor?: [number, number, number]
      lineWidth?: number
    } = {}
  ): void {
    const {
      fill = false,
      fillColor = [255, 255, 255],
      stroke = true,
      strokeColor = [0, 0, 0],
      lineWidth = 0.5,
    } = options

    if (fill) {
      this.doc.setFillColor(fillColor[0], fillColor[1], fillColor[2])
    }
    if (stroke) {
      this.doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2])
      this.doc.setLineWidth(lineWidth)
    }

    this.doc.rect(x, y, width, height, fill ? 'F' : stroke ? 'S' : 'FD')
  }

  /**
   * Add polygon
   */
  addPolygon(
    points: Array<{ x: number; y: number }>,
    options: {
      fill?: boolean
      fillColor?: [number, number, number]
      stroke?: boolean
      strokeColor?: [number, number, number]
      lineWidth?: number
    } = {}
  ): void {
    const {
      fill = false,
      fillColor = [255, 255, 255],
      stroke = true,
      strokeColor = [0, 0, 0],
      lineWidth = 0.5,
    } = options

    if (points.length < 2) {
      return
    }

    if (fill) {
      this.doc.setFillColor(fillColor[0], fillColor[1], fillColor[2])
    }
    if (stroke) {
      this.doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2])
      this.doc.setLineWidth(lineWidth)
    }

    // Draw polygon by connecting points
    this.doc.setLineJoin('miter')
    for (let i = 0; i < points.length; i++) {
      const current = points[i]
      const next = points[(i + 1) % points.length]
      this.doc.line(current.x, current.y, next.x, next.y)
    }

    // Fill if needed
    if (fill && points.length >= 3) {
      // jsPDF doesn't have direct polygon fill, so we use a workaround
      // For now, just stroke - full fill would require more complex path operations
    }
  }

  /**
   * Add table
   */
  addTable(
    data: string[][],
    x: number,
    y: number,
    options: {
      columnWidths?: number[]
      headerStyle?: {
        fontSize?: number
        fontStyle?: 'normal' | 'bold'
        fillColor?: [number, number, number]
        textColor?: [number, number, number]
      }
      cellStyle?: {
        fontSize?: number
        align?: 'left' | 'center' | 'right'
      }
    } = {}
  ): number {
    const {
      columnWidths,
      headerStyle = {},
      cellStyle = {},
    } = options

    const headerFontSize = headerStyle.fontSize ?? 12
    const cellFontSize = cellStyle.fontSize ?? 10
    const rowHeight = Math.max(headerFontSize, cellFontSize) + 4

    let currentY = y

    // Draw header
    if (data.length > 0) {
      const header = data[0]
      const cols = columnWidths || Array(header.length).fill(this.getAvailableWidth() / header.length)

      this.doc.setFontSize(headerFontSize)
      if (headerStyle.fontStyle === 'bold') {
        this.doc.setFont(undefined, 'bold')
      }

      if (headerStyle.fillColor) {
        this.doc.setFillColor(
          headerStyle.fillColor[0],
          headerStyle.fillColor[1],
          headerStyle.fillColor[2]
        )
        this.doc.rect(x, currentY, this.getAvailableWidth(), rowHeight, 'F')
      }

      if (headerStyle.textColor) {
        this.doc.setTextColor(
          headerStyle.textColor[0],
          headerStyle.textColor[1],
          headerStyle.textColor[2]
        )
      }

      let currentX = x
      header.forEach((cell, index) => {
        this.doc.text(cell, currentX + 2, currentY + rowHeight / 2 + 2, {
          align: 'left',
        })
        currentX += cols[index]
      })

      currentY += rowHeight

      // Draw separator line
      this.addLine(x, currentY, x + this.getAvailableWidth(), currentY)
      currentY += 2
    }

    // Draw rows
    this.doc.setFontSize(cellFontSize)
    this.doc.setFont(undefined, 'normal')
    this.doc.setTextColor(0, 0, 0)

    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      const cols = columnWidths || Array(row.length).fill(this.getAvailableWidth() / row.length)

      let currentX = x
      row.forEach((cell, index) => {
        this.doc.text(cell, currentX + 2, currentY + rowHeight / 2 + 2, {
          align: cellStyle.align || 'left',
        })
        currentX += cols[index]
      })

      currentY += rowHeight

      // Check if new page needed
      if (currentY > this.pageHeight - this.margin) {
        this.addPage()
        currentY = this.margin
      }
    }

    return currentY
  }

  /**
   * Add new page
   */
  addPage(): void {
    this.doc.addPage()
  }

  /**
   * Get current Y position
   */
  getCurrentY(): number {
    // Simplified - jsPDF doesn't track Y position directly
    // This would need to be tracked manually in a real implementation
    return this.pageHeight - this.margin
  }

  /**
   * Set Y position
   */
  setY(y: number): void {
    // jsPDF doesn't have direct setY, so we track it manually
    // This is a simplified version
  }

  /**
   * Generate PDF as buffer
   */
  generate(): Uint8Array {
    return this.doc.output('arraybuffer') as unknown as Uint8Array
  }

  /**
   * Generate PDF as data URL
   */
  generateDataURL(): string {
    return this.doc.output('dataurlstring')
  }

  /**
   * Generate PDF as blob
   */
  generateBlob(): Blob {
    return this.doc.output('blob')
  }

  /**
   * Save PDF (for testing/debugging)
   */
  save(filename: string): void {
    this.doc.save(filename)
  }
}

