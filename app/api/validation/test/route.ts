/**
 * Validation Test API Route
 * Demonstrates validation middleware usage
 */

import { NextRequest, NextResponse } from 'next/server'
import { createValidationMiddleware } from '@/lib/validation/middleware'
import { sectionSchema, validateQuotaSum } from '@/lib/validation'
import { z } from 'zod'

/**
 * Test schema for sections with quotas
 */
const sectionsSchema = z.object({
  sections: z.array(sectionSchema).min(1, 'At least one section is required'),
  totalArea: z.number().positive(),
  commonArea: z.number().min(0),
  parentParcelArea: z.number().positive(),
})

/**
 * POST endpoint with validation
 */
export const POST = async (request: NextRequest) => {
  const validate = createValidationMiddleware({
    schema: sectionsSchema,
    businessRules: (data) => {
      // Validate quota sum
      return validateQuotaSum(
        data.sections.map((s) => ({
          sectionNumber: s.section_number,
          area: s.area,
          participationQuota: s.participation_quota,
        }))
      )
    },
  })

  return validate(request, async ({ validatedData }) => {
    return NextResponse.json(
      {
        success: true,
        message: 'Validation passed',
        data: validatedData,
      },
      { status: 200 }
    )
  })
}

