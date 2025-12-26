/**
 * Layer Control Component
 * Provides layer toggles for map layers
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Layers, Eye, EyeOff } from 'lucide-react'

interface Layer {
  id: string
  name: string
  visible: boolean
  onToggle: (visible: boolean) => void
}

interface LayerControlProps {
  layers: Layer[]
  className?: string
}

/**
 * Layer Control Component
 */
export function LayerControl({ layers, className = '' }: LayerControlProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`absolute top-4 right-4 z-[1000] ${className}`}>
      <Card className="p-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full"
        >
          <Layers className="h-4 w-4 mr-2" />
          Layers
        </Button>

        {isOpen && (
          <div className="mt-2 space-y-1">
            {layers.map((layer) => (
              <Button
                key={layer.id}
                variant="ghost"
                size="sm"
                onClick={() => layer.onToggle(!layer.visible)}
                className="w-full justify-start"
              >
                {layer.visible ? (
                  <Eye className="h-4 w-4 mr-2" />
                ) : (
                  <EyeOff className="h-4 w-4 mr-2" />
                )}
                {layer.name}
              </Button>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

