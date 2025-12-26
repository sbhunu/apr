/**
 * Planning Review Checklist
 * Standard checklist items for planning authority reviews
 */

import { ReviewChecklistItem } from './review-service'

/**
 * Default review checklist
 */
export const DEFAULT_REVIEW_CHECKLIST: ReviewChecklistItem[] = [
  // Compliance checks
  {
    id: 'compliance-1',
    category: 'Compliance',
    item: 'Scheme complies with zoning regulations',
    required: true,
    checked: false,
  },
  {
    id: 'compliance-2',
    category: 'Compliance',
    item: 'Required documents are complete and valid',
    required: true,
    checked: false,
  },
  {
    id: 'compliance-3',
    category: 'Compliance',
    item: 'Environmental impact assessment completed (if required)',
    required: false,
    checked: false,
  },

  // Technical checks
  {
    id: 'technical-1',
    category: 'Technical',
    item: 'Site plan is accurate and legible',
    required: true,
    checked: false,
  },
  {
    id: 'technical-2',
    category: 'Technical',
    item: 'Boundary coordinates are properly defined',
    required: true,
    checked: false,
  },
  {
    id: 'technical-3',
    category: 'Technical',
    item: 'Number of sections matches planning application',
    required: true,
    checked: false,
  },
  {
    id: 'technical-4',
    category: 'Technical',
    item: 'Proposed areas are reasonable and consistent',
    required: true,
    checked: false,
  },

  // Legal checks
  {
    id: 'legal-1',
    category: 'Legal',
    item: 'Planner registration is valid',
    required: true,
    checked: false,
  },
  {
    id: 'legal-2',
    category: 'Legal',
    item: 'Land ownership/rights are properly documented',
    required: true,
    checked: false,
  },
  {
    id: 'legal-3',
    category: 'Legal',
    item: 'No outstanding disputes or encumbrances',
    required: false,
    checked: false,
  },

  // Spatial checks
  {
    id: 'spatial-1',
    category: 'Spatial',
    item: 'Scheme boundaries do not overlap with existing parcels',
    required: true,
    checked: false,
  },
  {
    id: 'spatial-2',
    category: 'Spatial',
    item: 'Scheme is contained within parent land boundary',
    required: true,
    checked: false,
  },
  {
    id: 'spatial-3',
    category: 'Spatial',
    item: 'Access roads and infrastructure are properly planned',
    required: true,
    checked: false,
  },
]

/**
 * Get checklist by category
 */
export function getChecklistByCategory(
  checklist: ReviewChecklistItem[],
  category: string
): ReviewChecklistItem[] {
  return checklist.filter((item) => item.category === category)
}

/**
 * Validate checklist completion
 */
export function validateChecklist(checklist: ReviewChecklistItem[]): {
  valid: boolean
  missingRequired: string[]
} {
  const missingRequired = checklist
    .filter((item) => item.required && !item.checked)
    .map((item) => item.item)

  return {
    valid: missingRequired.length === 0,
    missingRequired,
  }
}

