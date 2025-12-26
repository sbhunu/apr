/**
 * Scheme Creation Form Schema
 * Zod validation schemas for scheme creation form
 */

import { z } from 'zod'
import { schemeNameSchema, locationNameSchema } from '@/lib/validation/schema-validators'

/**
 * Step 1: Scheme Metadata
 */
export const schemeMetadataSchema = z.object({
  title: schemeNameSchema,
  description: z.string().max(2000).optional(),
  locationName: locationNameSchema.optional(),
  numberOfSections: z
    .number()
    .int('Number of sections must be an integer')
    .min(1, 'At least one section is required')
    .max(1000, 'Maximum 1000 sections allowed'),
})

/**
 * Step 2: Planner Information
 */
export const plannerInfoSchema = z.object({
  plannerName: z.string().min(2, 'Planner name is required').max(200),
  plannerRegistrationNumber: z
    .string()
    .min(5, 'Registration number must be at least 5 characters')
    .max(50, 'Registration number must not exceed 50 characters')
    .optional(),
  organization: z.string().max(200).optional(),
})

/**
 * Step 3: Documents
 */
export const documentsSchema = z.object({
  documents: z
    .array(
      z.object({
        file: z.instanceof(File).optional(),
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        documentType: z.enum([
          'plan_layout',
          'site_plan',
          'supporting_document',
          'other',
        ]),
        description: z.string().max(500).optional(),
      })
    )
    .min(1, 'At least one document is required'),
})

/**
 * Complete scheme form schema
 */
export const schemeFormSchema = schemeMetadataSchema
  .merge(plannerInfoSchema)
  .merge(documentsSchema)

export type SchemeFormData = z.infer<typeof schemeFormSchema>
export type SchemeMetadataData = z.infer<typeof schemeMetadataSchema>
export type PlannerInfoData = z.infer<typeof plannerInfoSchema>
export type DocumentsData = z.infer<typeof documentsSchema>

