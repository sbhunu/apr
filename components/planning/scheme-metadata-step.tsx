/**
 * Scheme Metadata Step Component
 * Step 1 of scheme creation form
 */

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { schemeMetadataSchema, type SchemeMetadataData } from '@/lib/planning/scheme-form-schema'

interface SchemeMetadataStepProps {
  formData: Record<string, unknown>
  updateFormData: (data: Record<string, unknown>) => void
}

export function SchemeMetadataStep({ formData, updateFormData }: SchemeMetadataStepProps) {
  const form = useForm<SchemeMetadataData>({
    resolver: zodResolver(schemeMetadataSchema),
    defaultValues: {
      title: (formData.title as string) || '',
      description: (formData.description as string) || '',
      locationName: (formData.locationName as string) || '',
      numberOfSections: (formData.numberOfSections as number) || 1,
    },
  })

  const handleChange = () => {
    const values = form.getValues()
    updateFormData(values)
  }

  return (
    <Form {...form}>
      <form onChange={handleChange} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scheme Name *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Harare Central Sectional Scheme"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="locationName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Harare Central, Mashonaland East"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="numberOfSections"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Sections *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  {...field}
                  onChange={(e) => {
                    field.onChange(parseInt(e.target.value, 10) || 1)
                    handleChange()
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the proposed sectional scheme..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

