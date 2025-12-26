/**
 * Document Viewer Component for Module 4
 * Displays PDFs and images with zoom, pan, and navigation controls
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  FileText,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

export interface Document {
  id: string
  title: string
  description?: string
  url: string
  mimeType?: string
  fileSize?: number
  documentType?: string
  uploadedAt?: string
}

interface DocumentViewerProps {
  documents: Document[]
  defaultDocumentId?: string
  onDocumentSelect?: (document: Document) => void
  className?: string
  showGallery?: boolean
}

/**
 * PDF Viewer Component
 */
function PDFViewer({ url, title }: { url: string; title: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
  }, [url])

  return (
    <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error loading PDF</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      <iframe
        src={url}
        title={title}
        className="w-full h-full border-0"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false)
          setError('Failed to load PDF document')
        }}
      />
    </div>
  )
}

/**
 * Image Viewer Component with Zoom and Pan
 */
function ImageViewer({ url, title }: { url: string; title: string }) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5))
  const handleRotate = () => setRotation((r) => (r + 90) % 360)
  const handleReset = () => {
    setZoom(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button variant="secondary" size="sm" onClick={handleZoomOut} disabled={zoom <= 0.5}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={handleZoomIn} disabled={zoom >= 3}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={handleRotate}>
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={handleReset}>
          Reset
        </Button>
      </div>

      {/* Image Container */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Alert variant="destructive" className="max-w-md">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error loading image</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}
        <img
          src={url}
          alt={title}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false)
            setError('Failed to load image')
          }}
        />
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-2 left-2 z-10">
        <Badge variant="secondary">{Math.round(zoom * 100)}%</Badge>
      </div>
    </div>
  )
}

/**
 * Document Viewer Component
 */
export function DocumentViewer({
  documents,
  defaultDocumentId,
  onDocumentSelect,
  className = '',
  showGallery = true,
}: DocumentViewerProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (defaultDocumentId) {
      const doc = documents.find((d) => d.id === defaultDocumentId)
      if (doc) {
        setSelectedDocument(doc)
      }
    } else if (documents.length > 0) {
      setSelectedDocument(documents[0])
    }
  }, [defaultDocumentId, documents])

  const currentIndex = selectedDocument
    ? documents.findIndex((d) => d.id === selectedDocument.id)
    : -1

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevDoc = documents[currentIndex - 1]
      setSelectedDocument(prevDoc)
      onDocumentSelect?.(prevDoc)
    }
  }

  const handleNext = () => {
    if (currentIndex < documents.length - 1) {
      const nextDoc = documents[currentIndex + 1]
      setSelectedDocument(nextDoc)
      onDocumentSelect?.(nextDoc)
    }
  }

  const handleDocumentClick = (doc: Document) => {
    setSelectedDocument(doc)
    onDocumentSelect?.(doc)
  }

  const isPDF = (mimeType?: string, url?: string) => {
    return (
      mimeType?.includes('pdf') ||
      url?.toLowerCase().endsWith('.pdf') ||
      url?.toLowerCase().includes('application/pdf')
    )
  }

  const isImage = (mimeType?: string, url?: string) => {
    return (
      mimeType?.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url || '')
    )
  }

  if (documents.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No documents available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const viewerContent = selectedDocument ? (
    <div className="w-full h-full min-h-[600px]">
      {isPDF(selectedDocument.mimeType, selectedDocument.url) ? (
        <PDFViewer url={selectedDocument.url} title={selectedDocument.title} />
      ) : isImage(selectedDocument.mimeType, selectedDocument.url) ? (
        <ImageViewer url={selectedDocument.url} title={selectedDocument.title} />
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Unsupported document type</AlertTitle>
            <AlertDescription>
              This document type cannot be previewed. Please download to view.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  ) : null

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Documents</CardTitle>
            <CardDescription>
              {selectedDocument ? selectedDocument.title : 'Select a document to view'}
            </CardDescription>
          </div>
          {selectedDocument && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(true)}
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Fullscreen
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={selectedDocument.url} download target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document Gallery */}
        {showGallery && documents.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleDocumentClick(doc)}
                className={`flex-shrink-0 p-3 border rounded-lg transition-colors ${
                  selectedDocument?.id === doc.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <div className="flex flex-col items-center gap-2 min-w-[100px]">
                  {isPDF(doc.mimeType, doc.url) ? (
                    <FileText className="h-8 w-8 text-red-600" />
                  ) : isImage(doc.mimeType, doc.url) ? (
                    <ImageIcon className="h-8 w-8 text-blue-600" />
                  ) : (
                    <FileText className="h-8 w-8 text-gray-600" />
                  )}
                  <span className="text-xs text-center line-clamp-2">{doc.title}</span>
                  {doc.documentType && (
                    <Badge variant="outline" className="text-[10px]">
                      {doc.documentType.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Document Viewer */}
        {selectedDocument && (
          <div className="relative">
            {/* Navigation Controls */}
            {documents.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10"
                  onClick={handleNext}
                  disabled={currentIndex === documents.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {viewerContent}

            {/* Document Info */}
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  Document {currentIndex + 1} of {documents.length}
                </span>
                {selectedDocument.fileSize && (
                  <span>{(selectedDocument.fileSize / 1024).toFixed(1)} KB</span>
                )}
                {selectedDocument.uploadedAt && (
                  <span>
                    Uploaded {new Date(selectedDocument.uploadedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{selectedDocument?.title}</DialogTitle>
            <DialogDescription>{selectedDocument?.description}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 p-6 overflow-hidden">
            {selectedDocument && (
              <div className="w-full h-full">
                {isPDF(selectedDocument.mimeType, selectedDocument.url) ? (
                  <PDFViewer url={selectedDocument.url} title={selectedDocument.title} />
                ) : isImage(selectedDocument.mimeType, selectedDocument.url) ? (
                  <ImageViewer url={selectedDocument.url} title={selectedDocument.title} />
                ) : null}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

