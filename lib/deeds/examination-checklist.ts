/**
 * Deeds Examination Checklist
 * Defines compliance checklist items for Deeds Examiner review
 */

export interface ExaminationChecklistItem {
  id: string
  category: 'legal' | 'survey' | 'holder' | 'documentation' | 'tenure'
  description: string
  required: boolean
  checked: boolean
  notes?: string
  defectType?: 'error' | 'warning' | 'info'
}

/**
 * Default examination checklist
 */
export const DEEDS_EXAMINATION_CHECKLIST: ExaminationChecklistItem[] = [
  // Legal checks
  {
    id: 'legal-1',
    category: 'legal',
    description: 'Legal description matches sealed survey data',
    required: true,
    checked: false,
    defectType: 'error',
  },
  {
    id: 'legal-2',
    category: 'legal',
    description: 'Section number matches survey section',
    required: true,
    checked: false,
    defectType: 'error',
  },
  {
    id: 'legal-3',
    category: 'legal',
    description: 'Area in legal description matches survey area',
    required: true,
    checked: false,
    defectType: 'error',
  },
  {
    id: 'legal-4',
    category: 'legal',
    description: 'Participation quota matches survey quota',
    required: true,
    checked: false,
    defectType: 'error',
  },
  {
    id: 'legal-5',
    category: 'legal',
    description: 'Rights and conditions are properly stated',
    required: true,
    checked: false,
    defectType: 'error',
  },
  {
    id: 'legal-6',
    category: 'legal',
    description: 'Restrictions comply with Sectional Titles Act',
    required: true,
    checked: false,
    defectType: 'error',
  },

  // Survey checks
  {
    id: 'survey-1',
    category: 'survey',
    description: 'Survey plan is sealed and valid',
    required: true,
    checked: false,
    defectType: 'error',
  },
  {
    id: 'survey-2',
    category: 'survey',
    description: 'Survey seal hash is valid',
    required: true,
    checked: false,
    defectType: 'error',
  },
  {
    id: 'survey-3',
    category: 'survey',
    description: 'Section geometry matches survey geometry',
    required: true,
    checked: false,
    defectType: 'error',
  },
  {
    id: 'survey-4',
    category: 'survey',
    description: 'Scheme plan is available and referenced',
    required: true,
    checked: false,
    defectType: 'error',
  },

  // Holder checks
  {
    id: 'holder-1',
    category: 'holder',
    description: 'Holder name is complete and accurate',
    required: true,
    checked: false,
    defectType: 'error',
  },
  {
    id: 'holder-2',
    category: 'holder',
    description: 'Holder ID number is provided and valid',
    required: true,
    checked: false,
    defectType: 'error',
  },
  {
    id: 'holder-3',
    category: 'holder',
    description: 'Holder type is correctly specified',
    required: true,
    checked: false,
    defectType: 'error',
  },
  {
    id: 'holder-4',
    category: 'holder',
    description: 'Holder contact information is provided',
    required: false,
    checked: false,
    defectType: 'warning',
  },

  // Documentation checks
  {
    id: 'doc-1',
    category: 'documentation',
    description: 'All required documents are attached',
    required: true,
    checked: false,
    defectType: 'error',
  },
  {
    id: 'doc-2',
    category: 'documentation',
    description: 'Conveyancer signature is present',
    required: true,
    checked: false,
    defectType: 'error',
  },
  {
    id: 'doc-3',
    category: 'documentation',
    description: 'Supporting documents are properly formatted',
    required: false,
    checked: false,
    defectType: 'warning',
  },

  // Tenure checks
  {
    id: 'tenure-1',
    category: 'tenure',
    description: 'Complies with communal tenure regulations',
    required: true,
    checked: false,
    defectType: 'error',
  },
  {
    id: 'tenure-2',
    category: 'tenure',
    description: 'No conflicts with existing land rights',
    required: true,
    checked: false,
    defectType: 'error',
  },
  {
    id: 'tenure-3',
    category: 'tenure',
    description: 'Transfer restrictions are properly documented',
    required: false,
    checked: false,
    defectType: 'warning',
  },
]

/**
 * Get checklist by category
 */
export function getChecklistByCategory(
  category: ExaminationChecklistItem['category']
): ExaminationChecklistItem[] {
  return DEEDS_EXAMINATION_CHECKLIST.filter((item) => item.category === category)
}

/**
 * Validate checklist completion
 */
export function validateExaminationChecklist(
  checklist: ExaminationChecklistItem[]
): {
  isValid: boolean
  missingRequired: ExaminationChecklistItem[]
  defects: ExaminationChecklistItem[]
  warnings: string[]
} {
  const missingRequired = checklist.filter(
    (item) => item.required && !item.checked
  )

  const defects = checklist.filter(
    (item) => !item.checked && item.defectType === 'error'
  )

  const warnings: string[] = []
  const optionalUnchecked = checklist.filter(
    (item) => !item.required && !item.checked && item.defectType === 'warning'
  )

  if (optionalUnchecked.length > 0) {
    warnings.push(
      `${optionalUnchecked.length} optional checklist items are unchecked`
    )
  }

  return {
    isValid: missingRequired.length === 0 && defects.length === 0,
    missingRequired,
    defects,
    warnings,
  }
}

