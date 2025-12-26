/**
 * Documents Upload Step Component
 * Step 3 of scheme creation form
 */

'use client'

import { useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { documentsSchema, type DocumentsData } from '@/lib/planning/scheme-form-schema'
import { Upload, X } from 'lucide-react'

interface DocumentsStepProps {
  formData: Record<string, unknown>
  updateFormData: (data: Record<string, unknown>) => void
}

type UploadedFile = {
  file?: File
  fileName: string
  fileType: string
  fileSize: number
  documentType: DocumentsData['documents'][number]['documentType']
  description?: string
}

export function DocumentsStep({ formData, updateFormData }: DocumentsStepProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(
    (formData.documents as UploadedFile[]) || []
  )

  const form = useForm<DocumentsData>({
    resolver: zodResolver(documentsSchema),
    defaultValues: {
      documents: uploadedFiles,
    },
  })

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    files.forEach((file) => {
      const newFile = {
        file,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        documentType: 'supporting_document' as const,
        description: '',
      }
      
      setUploadedFiles((prev) => {
        const updated = [...prev, newFile]
        updateFormData({ documents: updated })
        form.setValue('documents', updated)
        return updated
      })
    })
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      updateFormData({ documents: updated })
      form.setValue('documents', updated)
      return updated
    })
  }

  const updateFileType = (
    index: number,
    documentType: DocumentsData['documents'][number]['documentType']
  ) => {
    setUploadedFiles((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], documentType }
      updateFormData({ documents: updated })
      form.setValue('documents', updated)
      return updated
    })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <Form {...form}>
      <form className="space-y-6">
        <div>
          <FormLabel>Upload Documents *</FormLabel>
          <p className="text-sm text-muted-foreground mb-4">
            Upload planning documents (PDF, images). Maximum file size: 10MB per file.
          </p>
          
          <Input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="mb-4"
          />

          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              {uploadedFiles.map((fileData, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{fileData.fileName}</span>
                      <span className="text-sm text-muted-foreground">
                        ({formatFileSize(fileData.fileSize)})
                      </span>
                    </div>
                    
                    <select
                      value={fileData.documentType}
                      onChange={(e) =>
                        updateFileType(
                          index,
                          e.target.value as DocumentsData['documents'][number]['documentType']
                        )
                      }
                      className="text-sm border rounded px-2 py-1 mb-2"
                    >
                      <option value="plan_layout">Plan Layout</option>
                      <option value="site_plan">Site Plan</option>
                      <option value="supporting_document">Supporting Document</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {uploadedFiles.length === 0 && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
              No documents uploaded yet
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="documents"
          render={() => (
            <FormItem>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

