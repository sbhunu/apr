/**
 * Holder Information Form Component
 * Form for entering holder details
 */

'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HolderData } from '@/lib/deeds/types'

interface HolderInformationFormProps {
  value: HolderData
  onChange: (value: HolderData) => void
}

export function HolderInformationForm({ value, onChange }: HolderInformationFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="holderName">Holder Name *</Label>
        <Input
          id="holderName"
          value={value.holderName}
          onChange={(e) => onChange({ ...value, holderName: e.target.value })}
          placeholder="Enter holder name"
          required
        />
      </div>

      <div>
        <Label htmlFor="holderType">Holder Type *</Label>
        <Select
          value={value.holderType}
          onValueChange={(val) =>
            onChange({ ...value, holderType: val as HolderData['holderType'] })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select holder type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="trust">Trust</SelectItem>
            <SelectItem value="government">Government</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="holderIdNumber">
          {value.holderType === 'individual'
            ? 'National ID Number'
            : value.holderType === 'company'
              ? 'Company Registration Number'
              : 'ID Number'}
        </Label>
        <Input
          id="holderIdNumber"
          value={value.holderIdNumber || ''}
          onChange={(e) => onChange({ ...value, holderIdNumber: e.target.value })}
          placeholder={
            value.holderType === 'individual'
              ? 'Enter national ID number'
              : value.holderType === 'company'
                ? 'Enter company registration number'
                : 'Enter ID number'
          }
        />
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={value.address || ''}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          placeholder="Enter holder address"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={value.contactEmail || ''}
            onChange={(e) => onChange({ ...value, contactEmail: e.target.value })}
            placeholder="email@example.com"
          />
        </div>

        <div>
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input
            id="contactPhone"
            type="tel"
            value={value.contactPhone || ''}
            onChange={(e) => onChange({ ...value, contactPhone: e.target.value })}
            placeholder="+263 XXX XXX XXX"
          />
        </div>
      </div>
    </div>
  )
}

