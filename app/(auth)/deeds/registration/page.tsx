/**
 * Title Registration Dashboard
 * Interface for Registrar to register approved titles
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, FileText, AlertTriangle, FileCheck } from 'lucide-react'
import Link from 'next/link'

interface ApprovedTitle {
  id: string
  titleNumber: string
  sectionNumber: string
  holderName: string
  approvedAt: string
  schemeNumber: string
}

export default function TitleRegistrationPage() {
  const router = useRouter()
  const [titles, setTitles] = useState<ApprovedTitle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadApprovedTitles()
  }, [])

  async function loadApprovedTitles() {
    try {
      const response = await fetch('/api/deeds/registration/approved')
      const data = await response.json()

      if (data.success) {
        setTitles(data.titles || [])
      } else {
        setError(data.error || 'Failed to load approved titles')
      }
    } catch (err) {
      setError('Failed to load approved titles')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Loading approved titles...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Title Registration</h1>
          <p className="text-muted-foreground mt-2">
            Register approved sectional titles in the national register
          </p>
        </div>
      </div>

      {titles.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No approved titles awaiting registration</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Approved Titles ({titles.length})</CardTitle>
            <CardDescription>
              Titles approved by examiner, ready for registration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title Number</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Holder</TableHead>
                  <TableHead>Scheme</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {titles.map((title) => (
                  <TableRow key={title.id}>
                    <TableCell>
                      <Badge variant="outline">{title.titleNumber}</Badge>
                    </TableCell>
                    <TableCell>{title.sectionNumber}</TableCell>
                    <TableCell>{title.holderName}</TableCell>
                    <TableCell>{title.schemeNumber}</TableCell>
                    <TableCell>
                      {new Date(title.approvedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/deeds/registration/${title.id}`}>
                          <Button variant="outline" size="sm">
                            <FileCheck className="h-4 w-4 mr-2" />
                            Register
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

