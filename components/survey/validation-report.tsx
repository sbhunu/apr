/**
 * Topology Validation Report Component
 * Displays validation results with error visualization
 */

'use client'

import { SchemeValidationReport } from '@/lib/survey/topology-validation-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { CheckCircle2, XCircle, AlertTriangle, MapPin } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamically import map component
const ValidationMap = dynamic(
  () => import('./validation-map').then((mod) => ({ default: mod.ValidationMap })),
  { ssr: false }
)

interface ValidationReportProps {
  report: SchemeValidationReport
}

export function ValidationReport({ report }: ValidationReportProps) {
  const hasErrors = report.errors.length > 0
  const hasWarnings = report.warnings.length > 0

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Topology Validation Report</CardTitle>
            <Badge variant={report.isValid ? 'default' : 'destructive'}>
              {report.isValid ? 'Valid' : 'Invalid'}
            </Badge>
          </div>
          <CardDescription>
            Validated at {new Date(report.validationMetadata.validatedAt).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold">{report.summary.totalErrors}</div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{report.summary.totalWarnings}</div>
              <div className="text-sm text-muted-foreground">Warnings</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{report.summary.totalGeometries}</div>
              <div className="text-sm text-muted-foreground">Geometries</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {report.validationMetadata.validationDuration}ms
              </div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Errors */}
      {hasErrors && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Errors ({report.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.errors.map((error, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant="destructive">{error.type}</Badge>
                    </TableCell>
                    <TableCell>{error.description}</TableCell>
                    <TableCell>
                      {error.area !== undefined ? `${error.area.toFixed(2)} m²` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{error.severity}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Warnings ({report.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.warnings.map((warning, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant="outline">{warning.type}</Badge>
                    </TableCell>
                    <TableCell>{warning.description}</TableCell>
                    <TableCell>
                      {warning.area !== undefined ? `${warning.area.toFixed(2)} m²` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{warning.severity}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Correction Suggestions */}
      {report.correctionSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Correction Suggestions</CardTitle>
            <CardDescription>
              Recommended actions to fix validation issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.correctionSuggestions.map((suggestion, index) => (
                <Alert
                  key={index}
                  variant={suggestion.priority === 'high' ? 'destructive' : 'default'}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    {suggestion.errorType} - Priority: {suggestion.priority}
                  </AlertTitle>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>{suggestion.suggestion}</p>
                      {suggestion.affectedUnits.length > 0 && (
                        <p className="text-sm">
                          Affected units: {suggestion.affectedUnits.join(', ')}
                        </p>
                      )}
                      {suggestion.action && (
                        <p className="text-sm font-medium">Action: {suggestion.action}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Visualization Map */}
      {report.errorLocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Error Locations
            </CardTitle>
            <CardDescription>
              Visual representation of validation errors on map
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ValidationMap errorLocations={report.errorLocations} />
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {report.isValid && !hasErrors && !hasWarnings && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Validation Passed</AlertTitle>
          <AlertDescription>
            All topology checks passed. The scheme geometry is valid and ready for sealing.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

