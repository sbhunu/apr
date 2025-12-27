/**
 * Public Deeds Processes Landing Page
 * Entry point for deeds-related information and registration
 * Covers Module 3 (Scheme Registration), Module 4 (Deeds Creation & Registration), and Module 5 (Operations)
 */

'use client'

import PropertyProcessesLayout from "@/components/layouts/PropertyProcessesLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
	FileText, 
	CheckCircle2, 
	FileCheck, 
	Award, 
	Building2,
	Scale,
	ArrowLeftRight,
	Edit,
	Shield,
	Gavel,
	CreditCard,
	Home,
	Users
} from "lucide-react";
import Link from "next/link";

export default function DeedsLandingPage() {
	return (
		<PropertyProcessesLayout
			currentPage="deeds"
			heroTitle="Deeds Processes"
			heroDescription="Complete workflow for sectional scheme registration, title creation, and post-registration operations. Modules 3, 4, and 5 covering scheme registration, deeds creation, and rights management.">
			<div className="container mx-auto px-4 py-8 space-y-8">
				{/* Module 3: Sectional Scheme Registration */}
				<section className="space-y-4">
					<div className="flex items-center gap-3">
						<Badge variant="outline" className="text-sm font-semibold px-3 py-1">Module</Badge>
						<h2 className="text-2xl font-semibold">Sectional Scheme Registration</h2>
					</div>
					<p className="text-muted-foreground">
						Formal registration of sectional schemes as legal entities. Allocate scheme numbers, register common property, create Body Corporate, and link communal land custodians.
					</p>
					<div className="grid md:grid-cols-2 gap-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Building2 className="h-5 w-5" />
									Register Sectional Scheme
								</CardTitle>
								<CardDescription>
									Register sealed surveys as legal sectional schemes. Allocate scheme numbers, create Body Corporate entities, and link communal land custodians.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/deeds/schemes/register">
									<Button className="w-full">Register Scheme</Button>
								</Link>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<FileText className="h-5 w-5" />
									Manage Registered Schemes
								</CardTitle>
								<CardDescription>
									View all registered schemes, access scheme details, manage Body Corporate records, and link communal land custodians.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/deeds/schemes">
									<Button variant="outline" className="w-full">View Schemes</Button>
								</Link>
							</CardContent>
						</Card>
					</div>
				</section>

				{/* Module 4: Deeds Creation & Title Registration */}
				<section className="space-y-4">
					<div className="flex items-center gap-3">
						<Badge variant="outline" className="text-sm font-semibold px-3 py-1">Module</Badge>
						<h2 className="text-2xl font-semibold">Deeds Creation & Title Registration</h2>
					</div>
					<p className="text-muted-foreground">
						Complete workflow for drafting unit-level legal descriptions, deeds examination, title registration, and certificate generation with QR codes and digital signatures.
					</p>
					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<FileText className="h-5 w-5" />
									Draft Sectional Titles
								</CardTitle>
								<CardDescription>
									Conveyancers draft unit-level legal descriptions, participation quotas, rights & conditions, and restrictions based on sealed surveys.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/deeds/titles/draft">
									<Button className="w-full">Draft Title</Button>
								</Link>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Scale className="h-5 w-5" />
									Examine Deeds Packets
								</CardTitle>
								<CardDescription>
									Deeds Examiners review submitted titles for legal compliance, cross-validate with SG-approved plans, and flag defects.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/deeds/examination">
									<Button variant="outline" className="w-full">Examine Deeds</Button>
								</Link>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<CheckCircle2 className="h-5 w-5" />
									Register Titles
								</CardTitle>
								<CardDescription>
									Registrars digitally register approved titles, apply PKI signatures, and create immutable audit records.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/deeds/titles/register">
									<Button variant="outline" className="w-full">Register Title</Button>
								</Link>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Award className="h-5 w-5" />
									Generate Certificates
								</CardTitle>
								<CardDescription>
									Generate QR-coded, hash-secured Certificates of Sectional Title with digital signatures and multiple template options.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/deeds/certificates/generate">
									<Button variant="outline" className="w-full">Generate Certificate</Button>
								</Link>
							</CardContent>
						</Card>
					</div>
				</section>

				{/* Module 5: General Operations / Rights Management */}
				<section className="space-y-4">
					<div className="flex items-center gap-3">
						<Badge variant="outline" className="text-sm font-semibold px-3 py-1">Module</Badge>
						<h2 className="text-2xl font-semibold">General Operations & Rights Management</h2>
					</div>
					<p className="text-muted-foreground">
						Post-registration operations including rights transfers, mortgages, leases, scheme amendments, and dispute resolution workflows.
					</p>
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<ArrowLeftRight className="h-5 w-5" />
									Rights Transfers
								</CardTitle>
								<CardDescription>
									Process ownership transfers, inheritance updates, and maintain immutable history of all transfers.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/operations/transfers">
									<Button variant="outline" className="w-full">Process Transfer</Button>
								</Link>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<CreditCard className="h-5 w-5" />
									Mortgage Registration
								</CardTitle>
								<CardDescription>
									Register mortgages and charges on sectional titles. Integration with financial institutions records.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/operations/mortgages">
									<Button variant="outline" className="w-full">Register Mortgage</Button>
								</Link>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Home className="h-5 w-5" />
									Lease Registration
								</CardTitle>
								<CardDescription>
									Register leases on sectional titles and manage lease agreements with proper documentation.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/operations/leases">
									<Button variant="outline" className="w-full">Register Lease</Button>
								</Link>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Edit className="h-5 w-5" />
									Scheme Amendments
								</CardTitle>
								<CardDescription>
									Handle section extensions, subdivisions, consolidations, and exclusive use area changes. Trigger re-approval workflows.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/operations/amendments">
									<Button variant="outline" className="w-full">Submit Amendment</Button>
								</Link>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Gavel className="h-5 w-5" />
									Dispute Resolution
								</CardTitle>
								<CardDescription>
									Manage dispute workflows involving Scheme Bodies, District & Provincial Administration, Land Commission and Ministry.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/operations/disputes">
									<Button variant="outline" className="w-full">Manage Disputes</Button>
								</Link>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Shield className="h-5 w-5" />
									Objections Processing
								</CardTitle>
								<CardDescription>
									Process objections after plan submission. Manage objection windows and resolution workflows.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/operations/objections">
									<Button variant="outline" className="w-full">View Objections</Button>
								</Link>
							</CardContent>
						</Card>
					</div>
				</section>
			</div>
		</PropertyProcessesLayout>
	);
}

