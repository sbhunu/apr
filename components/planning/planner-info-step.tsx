/**
 * Planner Information Step Component
 * Step 2 of scheme creation form
 */

'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { plannerInfoSchema, type PlannerInfoData } from '@/lib/planning/scheme-form-schema'

interface PlannerInfoStepProps {
  formData: Record<string, unknown>
  updateFormData: (data: Record<string, unknown>) => void
}

export function PlannerInfoStep({ formData, updateFormData }: PlannerInfoStepProps) {
  const form = useForm<PlannerInfoData>({
    resolver: zodResolver(plannerInfoSchema),
    defaultValues: {
      plannerName: (formData.plannerName as string) || '',
      plannerRegistrationNumber: (formData.plannerRegistrationNumber as string) || '',
      organization: (formData.organization as string) || '',
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
          name="plannerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Planner Name *</FormLabel>
              <FormControl>
                <Input placeholder="Full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="plannerRegistrationNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Professional Registration Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., PLAN-12345" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="organization"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization</FormLabel>
              <FormControl>
                <Input placeholder="Company or organization name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

