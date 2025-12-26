/**
 * Surveying Processes Hub (Module 2)
 */

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const moduleSteps = [
  {
    id: 'approval',
    title: '1. Retrieve Approved Planning Plans',
    description:
      'Browse approved sectional schemes, preview their metadata, and hand them over to the Survey team. Includes search filters, planning comments, and related documents.',
    action: { label: 'View Planning Reviews', href: '/planning/review' },
  },
  {
    id: 'upload',
    title: '2. Upload Parent Parcel & Control',
    description:
      'Upload parent communal land geometry, boundary coordinates, control points, and GNSS or conventional survey metadata before any calculations occur.',
    action: { label: 'Upload Coordinates', href: '/survey/computations/upload' },
  },
  {
    id: 'compute',
    title: '3. Compute Outside Figure (Automated & Manual)',
    description:
      'Validate closure, area consistency and overlaps with adjacent communal lands or servitudes. Supports automated calculators plus manual interventions.',
  },
  {
    id: 'sectional',
    title: '4. Generate Sectional Geometries',
    description:
      'Create unit areas, boundary dimensions, common property, and participation quotas while enforcing containment and no-overlap constraints.',
  },
  {
    id: 'scheme',
    title: '5. Automated Sectional Scheme Plan Generation',
    description:
      'Produce sectional title scheme plans including sheets, legends, notes, section diagrams, area schedules, and participation quota tables.',
  },
  {
    id: 'sg-review',
    title: '6. Surveyor-General Review & Approval',
    description:
      'Apply digital markups, check compliance, capture a digital signature, and issue the approval certificate once sealing criteria are satisfied.',
    action: { label: 'Open SG Dashboard', href: '/survey/approval' },
  },
]

const moduleHighlights = [
  'Topology validation, area consistency, and overlap checks',
  'Automated generation of section diagrams and scheme plans',
  'Notes on residual parent land deductions and participation quotas',
  'Enforcement: deeds cannot proceed until survey_status = sealed',
]

export default function SurveyProcessesPage() {
  return (
    <div className="container mx-auto space-y-8 py-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.5em] text-muted-foreground">
          Module 2 · Survey Computation & Spatial Verification
        </p>
        <h1 className="text-4xl font-semibold">Surveying Processes</h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Complete workflow for approved planning plans: upload parent parcel geometry, run computations, generate sectional diagrams,
          and follow through to Surveyor-General approval and sealing.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {moduleSteps.map((step) => (
          <Card key={step.id} id={step.id}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{step.title}</CardTitle>
              <CardDescription>{step.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Core Function</Badge>
                  <span className="text-xs text-muted-foreground">Step {step.title.slice(0, 1)}</span>
                </div>
                {step.action && (
                  <Link href={step.action.href} className="block w-full">
                    <Button className="w-full" variant="outline">
                      {step.action.label}
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Core Functions & Enforcement</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {moduleHighlights.map((highlight) => (
            <Card key={highlight}>
              <CardContent className="p-4 text-sm text-muted-foreground">{highlight}</CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Enforcement rule: <span className="font-semibold text-rose-600">🛑 Deeds cannot proceed unless survey_status = sealed</span>.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
