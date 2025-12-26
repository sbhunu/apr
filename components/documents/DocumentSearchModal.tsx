/**
 * Document Search Modal Component
 * Displays document search results in a modal with viewing, printing, and email export capabilities
 */

'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, Mail, Printer, X, FileText, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Dynamically import DocumentViewer to avoid SSR issues
const DocumentViewer = dynamic(
  () => import('./DocumentViewer').then((mod) => ({ default: mod.DocumentViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

export interface DocumentSearchResult {
  id: string
  title: string
  description?: string
  documentType: string
  documentTypeLabel: string
  url: string
  mimeType: string
  fileSize?: number
  uploadedAt?: string
  relatedEntity?: {
    type: string
    id: string
    identifier: string
  }
}

interface DocumentSearchModalProps {
  document: DocumentSearchResult | null
  open: boolean
  onClose: () => void
}

/**
 * Document Search Modal Component
 */
export function DocumentSearchModal({ document, open, onClose }: DocumentSearchModalProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  // Check if user is authenticated
  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()
  }, [])

  const isGuest = !user

  // Reset email status when document changes
  useEffect(() => {
    setEmailSent(false)
    setEmailError(null)
  }, [document?.id])

  // Print document to PDF
  const handlePrint = () => {
    if (!document) return

    // Open document in new window and trigger print
    const printWindow = window.open(document.url, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 500)
      }
    }
  }

  // Export document as email attachment
  const handleEmailExport = async () => {
    if (!document || !user) return

    setLoading(true)
    setEmailError(null)

    try {
      const response = await fetch('/api/public/documents/email-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: document.id,
          documentUrl: document.url,
          documentTitle: document.title,
          userEmail: user.email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      setEmailSent(true)
      setTimeout(() => setEmailSent(false), 5000)
    } catch (error) {
      console.error('Email export error:', error)
      setEmailError(error instanceof Error ? error.message : 'Failed to send email')
      setTimeout(() => setEmailError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  if (!document) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold">{document.title}</DialogTitle>
              {document.description && (
                <p className="text-sm text-muted-foreground mt-1">{document.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Badge variant="secondary">{document.documentTypeLabel}</Badge>
              {document.relatedEntity && (
                <Badge variant="outline">
                  {document.relatedEntity.type}: {document.relatedEntity.identifier}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Document Metadata */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground pb-4 border-b">
          {document.uploadedAt && (
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>Uploaded: {new Date(document.uploadedAt).toLocaleDateString()}</span>
            </div>
          )}
          {document.fileSize && (
            <div>
              Size: {(document.fileSize / 1024).toFixed(2)} KB
            </div>
          )}
          <div>Type: {document.mimeType}</div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pb-4">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print to PDF
          </Button>
          {!isGuest && (
            <Button
              onClick={handleEmailExport}
              variant="outline"
              size="sm"
              disabled={loading || emailSent}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : emailSent ? (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Email Sent!
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Export as Email Attachment
                </>
              )}
            </Button>
          )}
          {isGuest && (
            <div className="text-xs text-muted-foreground">
              Sign in to export documents via email
            </div>
          )}
        </div>

        {/* Email Status Messages */}
        {emailSent && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded text-sm">
            Document sent successfully to {user?.email}
          </div>
        )}
        {emailError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded text-sm">
            {emailError}
          </div>
        )}

        {/* Document Viewer */}
        <div className="flex-1 overflow-hidden border rounded-lg">
          <DocumentViewer
            documents={[
              {
                id: document.id,
                title: document.title,
                description: document.description,
                url: document.url,
                mimeType: document.mimeType,
                fileSize: document.fileSize,
                uploadedAt: document.uploadedAt,
                documentType: document.documentType,
              },
            ]}
            defaultDocumentId={document.id}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

