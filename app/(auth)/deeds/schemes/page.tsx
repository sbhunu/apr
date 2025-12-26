/**
 * Sectional Schemes Hub (Module 3)
 * Overview of registered schemes and registration workflow
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Building2, PlusCircle, FileText, CheckCircle2 } from 'lucide-react'

interface RegisteredScheme {
  id: string
  scheme_number: string
  scheme_name: string
  registration_date: string
  status: string
  body_corporate_id?: string
  survey_plan_id: string
}

export default function SchemesHubPage() {
  const [schemes, setSchemes] = useState<RegisteredScheme[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRegisteredSchemes()
  }, [])

  async function loadRegisteredSchemes() {
    try {
      const response = await fetch('/api/deeds/schemes/registered')
      const data = await response.json()

      if (data.success) {
        setSchemes(data.schemes || [])
      }
    } catch (err) {
      console.error('Failed to load schemes:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (value: string) => {
    return new Date(value).toLocaleDateString('en-ZW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sectional Schemes</h1>
          <p className="text-muted-foreground mt-2">
            Manage registered sectional schemes and Body Corporate entities
          </p>
        </div>
        <Link href="/deeds/schemes/register">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Register New Scheme
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Schemes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schemes.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered schemes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                schemes.filter(
                  (s) =>
                    new Date(s.registration_date).getMonth() === new Date().getMonth() &&
                    new Date(s.registration_date).getFullYear() === new Date().getFullYear()
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">New registrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schemes.filter((s) => s.status === 'registered').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active schemes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Schemes</CardTitle>
          <CardDescription>
            All sectional schemes registered in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading schemes...</div>
          ) : schemes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No registered schemes yet</p>
              <Link href="/deeds/schemes/register">
                <Button variant="outline" className="mt-4">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Register First Scheme
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scheme Number</TableHead>
                  <TableHead>Scheme Name</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Body Corporate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schemes.map((scheme) => (
                  <TableRow key={scheme.id}>
                    <TableCell>
                      <Badge variant="outline">{scheme.scheme_number}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{scheme.scheme_name}</TableCell>
                    <TableCell>{formatDate(scheme.registration_date)}</TableCell>
                    <TableCell>
                      <Badge variant={scheme.status === 'registered' ? 'default' : 'secondary'}>
                        {scheme.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {scheme.body_corporate_id ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/deeds/titles/draft?schemeId=${scheme.id}`}>
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

