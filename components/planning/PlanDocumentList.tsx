/**
 * Plan Document List
 * Reusable component that renders document metadata and download links for planning submissions.
 */

'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpRight } from 'lucide-react'

export interface PlanDocument {
  id: string
  title: string
  description?: string | null
  document_type: string
  file_size?: number | null
  mime_type?: string | null
  uploaded_at?: string | null
  uploaded_by?: string | null
  version?: number | null
  url?: string | null
}

interface PlanDocumentListProps {
  documents: PlanDocument[]
}

export function PlanDocumentList({ documents }: PlanDocumentListProps) {
  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No documents uploaded yet for this plan.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents ({documents.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.map((document) => (
          <div
            key={document.id}
            className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{document.title}</p>
                {document.description && (
                  <p className="text-xs text-slate-500">{document.description}</p>
                )}
              </div>
              {document.document_type && (
                <Badge variant="outline" className="text-[10px] uppercase">
                  {document.document_type.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
              <span>{document.mime_type || 'Unknown type'}</span>
              {document.file_size != null && (
                <span>{(document.file_size / 1024).toFixed(1)} KB</span>
              )}
              {document.uploaded_at && (
                <span>Uploaded {new Date(document.uploaded_at).toLocaleDateString()}</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                Version {document.version ?? 1} • Uploaded by {document.uploaded_by ?? 'planner'}
              </div>
              {document.url ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm">
                  <a href={document.url} target="_blank" rel="noreferrer">
                    <ArrowUpRight className="h-3 w-3" />
                    Open
                  </a>
                </Button>
              ) : (
                <Button variant="ghost" size="sm" disabled>
                  <ArrowUpRight className="h-3 w-3" />
                  Missing file
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

