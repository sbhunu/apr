/**
 * Survey Review Checklist
 * Defines compliance checklist items for Surveyor-General review
 */

export interface ChecklistItem {
  id: string
  category: 'geometry' | 'compliance' | 'documentation' | 'legal'
  description: string
  required: boolean
  checked: boolean
  notes?: string
}

/**
 * Default review checklist
 */
export const SURVEY_REVIEW_CHECKLIST: ChecklistItem[] = [
  // Geometry checks
  {
    id: 'geo-1',
    category: 'geometry',
    description: 'Parent parcel geometry is valid and closed',
    required: true,
    checked: false,
  },
  {
    id: 'geo-2',
    category: 'geometry',
    description: 'All section geometries are valid polygons',
    required: true,
    checked: false,
  },
  {
    id: 'geo-3',
    category: 'geometry',
    description: 'No overlaps between sections',
    required: true,
    checked: false,
  },
  {
    id: 'geo-4',
    category: 'geometry',
    description: 'All sections contained within parent parcel',
    required: true,
    checked: false,
  },
  {
    id: 'geo-5',
    category: 'geometry',
    description: 'No significant gaps in coverage',
    required: false,
    checked: false,
  },
  {
    id: 'geo-6',
    category: 'geometry',
    description: 'Control points are properly established',
    required: true,
    checked: false,
  },

  // Compliance checks
  {
    id: 'comp-1',
    category: 'compliance',
    description: 'Survey accuracy meets required standards (1:10,000)',
    required: true,
    checked: false,
  },
  {
    id: 'comp-2',
    category: 'compliance',
    description: 'Participation quotas sum to exactly 100%',
    required: true,
    checked: false,
  },
  {
    id: 'comp-3',
    category: 'compliance',
    description: 'Area calculations are consistent',
    required: true,
    checked: false,
  },
  {
    id: 'comp-4',
    category: 'compliance',
    description: 'Scheme plan conforms to SG standards',
    required: true,
    checked: false,
  },

  // Documentation checks
  {
    id: 'doc-1',
    category: 'documentation',
    description: 'Survey plan includes all required sheets',
    required: true,
    checked: false,
  },
  {
    id: 'doc-2',
    category: 'documentation',
    description: 'Area schedule is complete and accurate',
    required: true,
    checked: false,
  },
  {
    id: 'doc-3',
    category: 'documentation',
    description: 'Section diagrams are properly labeled',
    required: true,
    checked: false,
  },
  {
    id: 'doc-4',
    category: 'documentation',
    description: 'Scale and north arrow are present',
    required: true,
    checked: false,
  },
  {
    id: 'doc-5',
    category: 'documentation',
    description: 'Notes and disclaimers are included',
    required: true,
    checked: false,
  },

  // Legal checks
  {
    id: 'legal-1',
    category: 'legal',
    description: 'Planning plan approval is valid',
    required: true,
    checked: false,
  },
  {
    id: 'legal-2',
    category: 'legal',
    description: 'Surveyor registration is current',
    required: true,
    checked: false,
  },
  {
    id: 'legal-3',
    category: 'legal',
    description: 'No legal restrictions prevent sealing',
    required: true,
    checked: false,
  },
]

/**
 * Get checklist by category
 */
export function getChecklistByCategory(
  category: ChecklistItem['category']
): ChecklistItem[] {
  return SURVEY_REVIEW_CHECKLIST.filter((item) => item.category === category)
}

/**
 * Validate checklist completion
 */
export function validateChecklist(checklist: ChecklistItem[]): {
  isValid: boolean
  missingRequired: ChecklistItem[]
  warnings: string[]
} {
  const missingRequired = checklist.filter(
    (item) => item.required && !item.checked
  )

  const warnings: string[] = []
  const optionalUnchecked = checklist.filter(
    (item) => !item.required && !item.checked
  )

  if (optionalUnchecked.length > 0) {
    warnings.push(
      `${optionalUnchecked.length} optional checklist items are unchecked`
    )
  }

  return {
    isValid: missingRequired.length === 0,
    missingRequired,
    warnings,
  }
}

