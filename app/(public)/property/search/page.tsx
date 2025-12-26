/**
 * Property Search Map Viewer Page
 * Comprehensive map viewer with multiple base layers and cadastral data
 */

'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Card } from '@/components/ui/card'

// Dynamically import PropertyMapViewer to avoid SSR issues
const PropertyMapViewer = dynamic(
  () => import('@/components/maps/PropertyMapViewer').then((mod) => ({ default: mod.PropertyMapViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    ),
  }
)

export default function PropertySearchPage() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <Card className="p-4 m-4 mb-0">
        <h1 className="text-2xl font-bold">Property Search - Map Viewer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search for properties by ID, title number, address, or scheme number. View cadastral data
          with multiple map layers including OpenStreetMap, Topographic maps, and Satellite imagery.
        </p>
      </Card>

      {/* Map Viewer */}
      <div className="flex-1 m-4 mt-0">
        <Card className="h-full w-full">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <PropertyMapViewer
              initialCenter={[-17.8292, 31.0522]} // Harare, Zimbabwe
              initialZoom={13}
            />
          </Suspense>
        </Card>
      </div>
    </div>
  )
}

