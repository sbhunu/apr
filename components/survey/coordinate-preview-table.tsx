/**
 * Coordinate Preview Table Component
 * Displays parsed coordinates in a table format
 */

'use client'

import { ParsedCoordinate } from '@/lib/survey/coordinate-parser'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface CoordinatePreviewTableProps {
  coordinates: ParsedCoordinate[]
  showClosure?: boolean
  closureError?: number
  closureErrorRatio?: number
  isWithinTolerance?: boolean
}

export function CoordinatePreviewTable({
  coordinates,
  showClosure = false,
  closureError,
  closureErrorRatio,
  isWithinTolerance,
}: CoordinatePreviewTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Coordinate Preview</h3>
        <Badge variant="outline">{coordinates.length} points</Badge>
      </div>

      {showClosure && closureError !== undefined && (
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Closure Validation</span>
            <Badge variant={isWithinTolerance ? 'default' : 'destructive'}>
              {isWithinTolerance ? 'Within Tolerance' : 'Exceeds Tolerance'}
            </Badge>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Closure Error:</span>{' '}
              <span className="font-mono">{closureError.toFixed(6)} m</span>
            </div>
            <div>
              <span className="text-muted-foreground">Error Ratio:</span>{' '}
              <span className="font-mono">
                1:{closureErrorRatio ? Math.round(closureErrorRatio) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Point</TableHead>
              <TableHead className="text-right">Easting (X)</TableHead>
              <TableHead className="text-right">Northing (Y)</TableHead>
              {coordinates.some((c) => c.z !== undefined) && (
                <TableHead className="text-right">Elevation (Z)</TableHead>
              )}
              {coordinates.some((c) => c.description) && (
                <TableHead>Description</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {coordinates.map((coord, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">
                  {coord.pointNumber || index + 1}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {coord.x.toFixed(4)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {coord.y.toFixed(4)}
                </TableCell>
                {coordinates.some((c) => c.z !== undefined) && (
                  <TableCell className="text-right font-mono">
                    {coord.z !== undefined ? coord.z.toFixed(2) : '-'}
                  </TableCell>
                )}
                {coordinates.some((c) => c.description) && (
                  <TableCell className="text-sm text-muted-foreground">
                    {coord.description || '-'}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

