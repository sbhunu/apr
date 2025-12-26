/**
 * Defect Tracker
 * Tracks and manages examination defects
 */

import { ExaminationDefect } from './examination-service'
import { ExaminationChecklistItem } from './examination-checklist'

/**
 * Generate defects from unchecked checklist items
 */
export function generateDefectsFromChecklist(
  checklist: ExaminationChecklistItem[],
  sectionId?: string
): ExaminationDefect[] {
  const defects: ExaminationDefect[] = []

  checklist.forEach((item) => {
    if (!item.checked && item.defectType) {
      defects.push({
        id: `defect-${item.id}`,
        checklistItemId: item.id,
        title: `Missing: ${item.description}`,
        description: item.notes || item.description,
        severity: item.defectType,
        category: item.category,
        sectionId,
        suggestedCorrection: getSuggestedCorrection(item),
      })
    }
  })

  return defects
}

/**
 * Get suggested correction for checklist item
 */
function getSuggestedCorrection(item: ExaminationChecklistItem): string {
  const corrections: Record<string, string> = {
    'legal-1': 'Verify legal description matches sealed survey data exactly',
    'legal-2': 'Ensure section number in legal description matches survey section number',
    'legal-3': 'Update area in legal description to match survey area',
    'legal-4': 'Update participation quota to match survey quota',
    'legal-5': 'Review and complete rights and conditions section',
    'legal-6': 'Ensure restrictions comply with Sectional Titles Act',
    'survey-1': 'Verify survey plan is sealed before proceeding',
    'survey-2': 'Verify survey seal hash is valid',
    'survey-3': 'Compare section geometry with survey geometry',
    'survey-4': 'Ensure scheme plan is referenced in documents',
    'holder-1': 'Complete holder name field',
    'holder-2': 'Provide valid holder ID number',
    'holder-3': 'Specify correct holder type',
    'holder-4': 'Add holder contact information',
    'doc-1': 'Attach all required supporting documents',
    'doc-2': 'Ensure conveyancer signature is present',
    'doc-3': 'Verify document formatting meets requirements',
    'tenure-1': 'Verify compliance with communal tenure regulations',
    'tenure-2': 'Check for conflicts with existing land rights',
    'tenure-3': 'Document transfer restrictions if applicable',
  }

  return corrections[item.id] || 'Review and correct as necessary'
}

/**
 * Categorize defects by severity
 */
export function categorizeDefects(defects: ExaminationDefect[]): {
  errors: ExaminationDefect[]
  warnings: ExaminationDefect[]
  info: ExaminationDefect[]
} {
  return {
    errors: defects.filter((d) => d.severity === 'error'),
    warnings: defects.filter((d) => d.severity === 'warning'),
    info: defects.filter((d) => d.severity === 'info'),
  }
}

/**
 * Check if defects are blocking
 */
export function hasBlockingDefects(defects: ExaminationDefect[]): boolean {
  return defects.some((d) => d.severity === 'error')
}

