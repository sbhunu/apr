/**
 * Client wrapper for CollapsibleNavigate.
 * This file can safely use dynamic imports with `ssr: false`
 * because it is itself a client component.
 */

'use client'

import dynamic from 'next/dynamic'

import type { NavigationSubItem } from '@/lib/navigation/structure'

const CollapsibleNavigate = dynamic(
  () => import('@/components/navigation/CollapsibleNavigate'),
  {
    ssr: false,
  }
)

export interface CollapsibleNavigateClientProps {
  menu: NavigationSubItem[]
}

export function CollapsibleNavigateClient({ menu }: CollapsibleNavigateClientProps) {
  return <CollapsibleNavigate menu={menu} />
}

