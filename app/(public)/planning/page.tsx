/**
 * Public Planning Landing Page
 * Entry point for planning-related information and submissions
 */

'use client'

import CollapsibleNavigate from "@/components/navigation/CollapsibleNavigate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Map, Upload, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const planningMenu = [
	{ id: "overview", title: "Overview", href: "#overview" },
	{ id: "submissions", title: "New Submission", href: "/planning/schemes/new" },
	{ id: "my-schemes", title: "My Schemes", href: "/planning/schemes" },
	{ id: "reviews", title: "Reviews", href: "/planning/review" },
];

export default function PlanningLandingPage() {
	return (
		<div className="container mx-auto px-4 py-8">
			<div className="grid lg:grid-cols-4 gap-8">
				<aside className="sticky top-6 hidden lg:block">
					<div className="w-64">
						<CollapsibleNavigate menu={planningMenu} />
					</div>
				</aside>

				<main className="lg:col-span-3 space-y-6">
					<div className="space-y-2">
						<h1 className="text-4xl font-bold">Planning & Scheme Submission</h1>
						<p className="text-muted-foreground">
							Submit sectional scheme applications and track their progress through the approval workflow.
						</p>
					</div>

					<div className="grid md:grid-cols-2 gap-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Upload className="h-5 w-5" />
									New Submission
								</CardTitle>
								<CardDescription>
									Start a new sectional scheme application
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/planning/schemes/new">
									<Button className="w-full">Create New Scheme</Button>
								</Link>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<FileText className="h-5 w-5" />
									My Schemes
								</CardTitle>
								<CardDescription>
									View and manage your submitted schemes
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/planning/schemes">
									<Button variant="outline" className="w-full">View Schemes</Button>
								</Link>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<CheckCircle2 className="h-5 w-5" />
									Reviews
								</CardTitle>
								<CardDescription>
									Monitor review status and comments
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/planning/review">
									<Button variant="outline" className="w-full">View Reviews</Button>
								</Link>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Map className="h-5 w-5" />
									GIS Viewer
								</CardTitle>
								<CardDescription>
									Explore spatial data and cadastral layers
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Link href="/property/search">
									<Button variant="outline" className="w-full">Open Map Viewer</Button>
								</Link>
							</CardContent>
						</Card>
					</div>
				</main>
			</div>
		</div>
	);
}

