/**
 * Scroll Area
 * Simple styled container for scrollable content.
 */

'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function ScrollArea({ className, ...props }: ScrollAreaProps) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-white', className)}>
      <div className="max-h-[480px] overflow-auto">{props.children}</div>
    </div>
  )
}

