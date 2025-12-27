/**
 * Surveying Landing Page
 * Tab-designed landing page showing all surveying options
 */

"use client";

import PropertyProcessesLayout from "@/components/layouts/PropertyProcessesLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function SurveyingPage() {
	return (
		<PropertyProcessesLayout
			currentPage="surveying"
			heroTitle="Surveying Processes"
			heroDescription="Complete workflow for approved planning plans: upload parent parcel geometry, run computations, generate sectional diagrams, and follow through to Surveyor-General approval and sealing.">
			<div className="container mx-auto space-y-8 py-10">

				<section className="grid gap-6 md:grid-cols-2">
					<Card id="approval">
						<CardHeader>
							<CardTitle className="text-lg font-semibold">1. Retrieve Approved Planning Plans</CardTitle>
							<CardDescription>
								Browse approved sectional schemes, preview their metadata, and hand them over to the Survey team. Includes search filters, planning comments, and related documents.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<Badge variant="outline">Core Function</Badge>
									<span className="text-xs text-muted-foreground">Step 1</span>
								</div>
								<Link href="/planning/review" className="block w-full">
									<Button className="w-full" variant="outline">
										View Planning Reviews
									</Button>
								</Link>
							</div>
						</CardContent>
					</Card>

					<Card id="upload">
						<CardHeader>
							<CardTitle className="text-lg font-semibold">2. Upload Parent Parcel & Control</CardTitle>
							<CardDescription>
								Upload parent communal land geometry, boundary coordinates, control points, and GNSS or conventional survey metadata before any calculations occur.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<Badge variant="outline">Core Function</Badge>
									<span className="text-xs text-muted-foreground">Step 2</span>
								</div>
								<Link href="/survey/computations/upload" className="block w-full">
									<Button className="w-full" variant="outline">
										Upload Coordinates
									</Button>
								</Link>
							</div>
						</CardContent>
					</Card>

					<Card id="compute">
						<CardHeader>
							<CardTitle className="text-lg font-semibold">3. Compute Outside Figure (Automated & Manual)</CardTitle>
							<CardDescription>
								Validate closure, area consistency and overlaps with adjacent communal lands or servitudes. Supports automated calculators plus manual interventions.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<Badge variant="outline">Core Function</Badge>
									<span className="text-xs text-muted-foreground">Step 3</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card id="sectional">
						<CardHeader>
							<CardTitle className="text-lg font-semibold">4. Generate Sectional Geometries</CardTitle>
							<CardDescription>
								Create unit areas, boundary dimensions, common property, and participation quotas while enforcing containment and no-overlap constraints.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<Badge variant="outline">Core Function</Badge>
									<span className="text-xs text-muted-foreground">Step 4</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card id="scheme">
						<CardHeader>
							<CardTitle className="text-lg font-semibold">5. Automated Sectional Scheme Plan Generation</CardTitle>
							<CardDescription>
								Produce sectional title scheme plans including sheets, legends, notes, section diagrams, area schedules, and participation quota tables.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<Badge variant="outline">Core Function</Badge>
									<span className="text-xs text-muted-foreground">Step 5</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card id="sg-review">
						<CardHeader>
							<CardTitle className="text-lg font-semibold">6. Surveyor-General Review & Approval</CardTitle>
							<CardDescription>
								Apply digital markups, check compliance, capture a digital signature, and issue the approval certificate once sealing criteria are satisfied.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<Badge variant="outline">Core Function</Badge>
									<span className="text-xs text-muted-foreground">Step 6</span>
								</div>
								<Link href="/survey/approval" className="block w-full">
									<Button className="w-full" variant="outline">
										Open SG Dashboard
									</Button>
								</Link>
							</div>
						</CardContent>
					</Card>
				</section>

				<section className="space-y-4">
					<h2 className="text-2xl font-semibold">Core Functions & Enforcement</h2>
					<div className="grid gap-4 md:grid-cols-2">
						<Card>
							<CardContent className="p-4 text-sm text-muted-foreground">
								Topology validation, area consistency, and overlap checks
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-4 text-sm text-muted-foreground">
								Automated generation of section diagrams and scheme plans
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-4 text-sm text-muted-foreground">
								Notes on residual parent land deductions and participation quotas
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-4 text-sm text-muted-foreground">
								Enforcement: deeds cannot proceed until survey_status = sealed
							</CardContent>
						</Card>
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
		</PropertyProcessesLayout>
	);
}

