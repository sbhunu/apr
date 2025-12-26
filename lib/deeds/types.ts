/**
 * Deeds Module Types
 * Type definitions for deeds drafting and registration
 */

export interface SectionData {
  id: string
  sectionNumber: string
  area: number
  quota: number
  schemeNumber: string
  schemeName: string
  location: string
  schemeId?: string // Scheme ID for map integration
  floorLevel?: number
  sectionType?: 'residential' | 'commercial' | 'parking' | 'storage' | 'common' | 'other'
  geometry?: unknown
}

export interface HolderData {
  holderName: string
  holderType: 'individual' | 'company' | 'trust' | 'government' | 'other'
  holderIdNumber?: string
  holderId?: string
  address?: string
  contactEmail?: string
  contactPhone?: string
}

export interface TitleDraft {
  id?: string
  sectionId: string
  sectionNumber: string
  legalDescription: string
  rightsAndConditions: string
  restrictions: string
  holder: HolderData
  conditions?: string
  encumbrances?: Array<{
    type: string
    description: string
  }>
  status: 'draft' | 'submitted' | 'under_examination' | 'approved' | 'registered'
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface DeedsPacket {
  id?: string
  schemeId: string
  schemeNumber: string
  titles: TitleDraft[]
  status: 'draft' | 'submitted' | 'under_examination' | 'approved' | 'registered'
  submittedAt?: string
  submittedBy?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

