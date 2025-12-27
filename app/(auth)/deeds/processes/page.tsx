/**
 * Deeds Processes Hub
 * Central landing page for Modules 3, 4, and 5
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
import {
  Building2,
  FileText,
  CheckCircle2,
  ArrowRight,
  Scale,
  FileCheck,
  Award,
  ArrowLeftRight,
  Edit,
  Shield,
  Gavel,
  Calendar,
} from 'lucide-react'

const module3Steps = [
  {
    id: 'scheme-registration',
    title: 'Register Sectional Scheme',
    description:
      'Register sealed surveys as legal sectional schemes. Allocate scheme numbers, create Body Corporate entities, and link communal land custodians.',
    action: { label: 'Register Scheme', href: '/deeds/schemes/register' },
    icon: Building2,
  },
  {
    id: 'scheme-management',
    title: 'Manage Registered Schemes',
    description:
      'View all registered schemes, access scheme details, and manage Body Corporate records.',
    action: { label: 'View Schemes', href: '/deeds/schemes' },
    icon: FileText,
  },
]

const module4Steps = [
  {
    id: 'drafting',
    title: 'Draft Sectional Titles',
    description:
      'Conveyancers draft unit-level legal descriptions, participation quotas, rights & conditions, and restrictions based on sealed surveys.',
    action: { label: 'Draft Title', href: '/deeds/titles/draft' },
    icon: FileText,
  },
  {
    id: 'examination',
    title: 'Examine Deeds Packets',
    description:
      'Deeds Examiners review submitted titles for legal compliance, cross-validate with SG-approved plans, and flag defects.',
    action: { label: 'Examine Deeds', href: '/deeds/examination' },
    icon: FileCheck,
  },
  {
    id: 'registration',
    title: 'Register Titles',
    description:
      'Registrars digitally register approved titles, apply PKI signatures, and create immutable audit records.',
    action: { label: 'Register Title', href: '/deeds/titles/register' },
    icon: CheckCircle2,
  },
  {
    id: 'certificates',
    title: 'Generate Certificates',
    description:
      'Generate QR-coded, hash-secured Certificates of Sectional Title with digital signatures and multiple template options.',
    action: { label: 'Generate Certificate', href: '/deeds/certificates/generate' },
    icon: Award,
  },
]

const module5Steps = [
  {
    id: 'transfers',
    title: 'Rights Transfers',
    description:
      'Process ownership transfers, inheritance updates, and lease registrations. Maintain immutable history of all transfers.',
    action: { label: 'Process Transfer', href: '/operations/transfers' },
    icon: ArrowLeftRight,
  },
  {
    id: 'amendments',
    title: 'Scheme Amendments',
    description:
      'Handle section extensions, subdivisions, consolidations, and exclusive use area changes. Trigger re-approval workflows.',
    action: { label: 'Submit Amendment', href: '/operations/amendments' },
    icon: Edit,
  },
  {
    id: 'mortgages',
    title: 'Mortgage Registration',
    description:
      'Register charges and mortgages on sectional titles. Link to financial institutions and track encumbrances.',
    action: { label: 'Register Mortgage', href: '/operations/mortgages' },
    icon: Shield,
  },
  {
    id: 'leases',
    title: 'Lease Management',
    description:
      'Register and manage leases on sectional titles. Track lease terms, expiry dates, and handle renewals.',
    action: { label: 'Manage Leases', href: '/operations/leases' },
    icon: FileText,
  },
  {
    id: 'objections',
    title: 'Objections Processing',
    description:
      'Submit and process objections to planning applications. Manage objection windows and schedule hearings.',
    action: { label: 'Process Objections', href: '/operations/objections' },
    icon: Gavel,
  },
  {
    id: 'disputes',
    title: 'Dispute Resolution',
    description:
      'Create and manage disputes related to property rights. Track dispute resolution workflows and assignments.',
    action: { label: 'Manage Disputes', href: '/operations/disputes' },
    icon: Scale,
  },
]

const moduleHighlights = [
  {
    module: 'Sectional Scheme Registration',
    title: 'Scheme Registration',
    rules: [
      'Requires sealed survey (survey_status = sealed)',
      'Automatic Body Corporate creation',
      'Scheme number allocation per province/year',
    ],
  },
  {
    module: 'Deeds Creation & Registration',
    title: 'Deeds Creation & Registration',
    rules: [
      'Requires registered scheme',
      'Legal compliance checks against SG plans',
      'QR-coded certificates with digital signatures',
    ],
  },
  {
    module: 'Operations & Rights Management',
    title: 'Operations & Rights Management',
    rules: [
      'Requires registered titles',
      'Immutable version history preserved',
      'Multi-agency workflow support',
    ],
  },
]

export default function DeedsProcessesPage() {
  return (
    <div className="container mx-auto space-y-8 py-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.5em] text-muted-foreground">
          Deeds Processes
        </p>
        <h1 className="text-4xl font-semibold">Deeds & Operations Hub</h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Complete workflows for scheme registration, title creation, examination, registration, and post-registration operations including transfers, amendments, and mortgages.
        </p>
      </header>

      {/* Module 3: Sectional Scheme Registration */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-semibold">Sectional Scheme Registration</h2>
            <p className="text-sm text-muted-foreground">
              Formal registration of sectional schemes as legal entities with Body Corporate creation
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {module3Steps.map((step) => {
            const Icon = step.icon
            return (
              <Card key={step.id} id={step.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-semibold">{step.title}</CardTitle>
                  </div>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={step.action.href} className="block w-full">
                    <Button className="w-full" variant="outline">
                      {step.action.label}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Module 4: Deeds Creation & Registration */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Scale className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-semibold">Deeds Creation & Registration</h2>
            <p className="text-sm text-muted-foreground">
              Conveyancing, examination, registration, and certificate issuance workflow
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {module4Steps.map((step) => {
            const Icon = step.icon
            return (
              <Card key={step.id} id={step.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-semibold">{step.title}</CardTitle>
                  </div>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={step.action.href} className="block w-full">
                    <Button className="w-full" variant="outline">
                      {step.action.label}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Module 5: Operations & Rights Management */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-semibold">Operations & Rights Management</h2>
            <p className="text-sm text-muted-foreground">
              Post-registration operations including transfers, amendments, and mortgages
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {module5Steps.map((step) => {
            const Icon = step.icon
            return (
              <Card key={step.id} id={step.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-semibold">{step.title}</CardTitle>
                  </div>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={step.action.href} className="block w-full">
                    <Button className="w-full" variant="outline">
                      {step.action.label}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Enforcement Rules & Dependencies */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Module Dependencies & Enforcement Rules</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {moduleHighlights.map((highlight) => (
            <Card key={highlight.module}>
              <CardHeader>
              <CardTitle className="text-base font-semibold">
                {highlight.module}
              </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {highlight.rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="mt-0.5">
                      {idx + 1}
                    </Badge>
                    <span className="text-muted-foreground">{rule}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-4">
            <p className="text-sm">
              <span className="font-semibold text-rose-600">🛑 Critical Enforcement:</span>{' '}
              <span className="text-muted-foreground">
                Each process requires the previous process to be complete. Scheme Registration requires sealed surveys, Deeds Creation requires registered schemes, and Operations requires registered titles.
              </span>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

