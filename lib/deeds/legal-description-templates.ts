/**
 * Legal Description Templates
 * Templates for generating legal descriptions from survey data
 */

import { SectionData } from './types'

/**
 * Generate legal description from section data
 */
export function generateLegalDescription(section: SectionData): string {
  const {
    sectionNumber,
    area,
    quota,
    schemeNumber,
    schemeName,
    location,
    floorLevel,
    sectionType,
  } = section

  // Standard legal description template
  const template = `SECTION ${sectionNumber.toUpperCase()}, ${schemeName.toUpperCase()}, 
situated at ${location}, being Section ${sectionNumber} of Sectional Scheme Number ${schemeNumber}, 
comprising an area of ${area.toFixed(2)} square metres (${area.toFixed(2)} m²) 
with a participation quota of ${quota.toFixed(4)}% (${quota.toFixed(4)}%) 
in the common property, ${floorLevel !== undefined && floorLevel !== 0 ? `on Floor Level ${floorLevel},` : ''} 
designated as ${sectionType || 'residential'} unit.`

  return template.trim()
}

/**
 * Generate standard rights and conditions
 */
export function generateStandardRightsAndConditions(sectionNumber: string): string {
  return `The holder of this Sectional Title is entitled to:
1. Exclusive use and occupation of Section ${sectionNumber} as described;
2. An undivided share in the common property proportional to the participation quota;
3. Rights of access to common property areas;
4. Participation in Body Corporate governance in proportion to participation quota.

Subject to:
1. Compliance with Body Corporate rules and regulations;
2. Payment of levies and contributions as determined by the Body Corporate;
3. Maintenance obligations for the section and proportional share of common property;
4. Restrictions imposed by the Sectional Titles Act and regulations;
5. Any servitudes, easements, or restrictions registered against the scheme.`
}

/**
 * Generate standard restrictions
 */
export function generateStandardRestrictions(sectionType: string): string {
  const restrictions: string[] = [
    'This title is subject to communal tenure overlays as applicable under Zimbabwean law.',
    'Any transfer, mortgage, or lease requires compliance with applicable land tenure regulations.',
    'The section may not be subdivided or consolidated without approval from the Registrar of Deeds.',
  ]

  if (sectionType === 'residential') {
    restrictions.push(
      'This section is designated for residential use only and may not be used for commercial purposes without Body Corporate approval.'
    )
  } else if (sectionType === 'commercial') {
    restrictions.push(
      'This section is designated for commercial use and must comply with zoning and business licensing requirements.'
    )
  }

  return restrictions.join('\n\n')
}

/**
 * Generate complete legal description with all components
 */
export function generateCompleteLegalDescription(section: SectionData): {
  legalDescription: string
  rightsAndConditions: string
  restrictions: string
} {
  return {
    legalDescription: generateLegalDescription(section),
    rightsAndConditions: generateStandardRightsAndConditions(section.sectionNumber),
    restrictions: generateStandardRestrictions(section.sectionType || 'residential'),
  }
}

