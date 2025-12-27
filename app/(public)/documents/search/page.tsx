/**
 * General Records Search Page
 * Comprehensive document search across all document types
 */

'use client'

import { useState } from 'react'
import ReportingLayout from '@/components/layouts/ReportingLayout'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, FileText, Loader2 } from 'lucide-react'
import { DocumentSearchModal, DocumentSearchResult } from '@/components/documents/DocumentSearchModal'

const DOCUMENT_TYPES = [
  { value: 'all', label: 'All Documents' },
  { value: 'plan', label: 'Planning Documents' },
  { value: 'survey', label: 'Survey Plans' },
  { value: 'sg_plan', label: 'SG Sectional Plans' },
  { value: 'title', label: 'Title Certificates' },
  { value: 'certificate', label: 'Certificates' },
  { value: 'mortgage', label: 'Mortgage Documents' },
  { value: 'lease', label: 'Lease Documents' },
]

export default function DocumentSearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [documentType, setDocumentType] = useState('all')
  const [results, setResults] = useState<DocumentSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<DocumentSearchResult | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        q: searchQuery,
      })
      if (documentType !== 'all') {
        params.append('type', documentType)
      }

      const response = await fetch(`/api/public/documents/search?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setResults(data.documents || [])
      } else {
        console.error('Search error:', data.error)
        setResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentClick = (document: DocumentSearchResult) => {
    setSelectedDocument(document)
    setModalOpen(true)
  }

  return (
    <ReportingLayout
      currentPage="records-search"
      heroTitle="General Records Search"
      heroDescription="Search across planning documents, survey plans, title certificates, mortgages, leases, and other important documents. Find records by document title, ID, scheme number, title number, or holder name.">
      <div className="container mx-auto py-8 px-4">

      {/* Search Form */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by document title, ID, scheme number, title number, holder name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Search Results */}
      {results.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Search Results ({results.length})
          </h2>
          <div className="space-y-3">
            {results.map((doc) => (
              <Card
                key={doc.id}
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleDocumentClick(doc)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-semibold text-lg">{doc.title}</h3>
                    </div>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mb-2">{doc.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-medium">{doc.documentTypeLabel}</span>
                      {doc.relatedEntity && (
                        <span>
                          {doc.relatedEntity.type}: {doc.relatedEntity.identifier}
                        </span>
                      )}
                      {doc.uploadedAt && (
                        <span>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      )}
                      {doc.fileSize && (
                        <span>Size: {(doc.fileSize / 1024).toFixed(2)} KB</span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {!loading && searchQuery && results.length === 0 && (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No documents found</p>
            <p className="text-sm">Try adjusting your search query or document type filter.</p>
          </div>
        </Card>
      )}

      {/* Document Modal */}
      {selectedDocument && (
        <DocumentSearchModal
          document={selectedDocument}
          open={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setSelectedDocument(null)
          }}
        />
      )}
      </div>
    </ReportingLayout>
  )
}

