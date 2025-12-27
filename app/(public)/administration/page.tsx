/**
 * Administration Landing Page
 * Entry point for administration features
 */

'use client'

import AdministrationLayout from "@/components/layouts/AdministrationLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, BarChart3, Settings } from "lucide-react";
import Link from "next/link";

export default function AdministrationLandingPage() {
	return (
		<AdministrationLayout
			currentPage="security"
			heroTitle="Admin Security"
			heroDescription="Manage security settings, PKI configuration, access controls, user management, and system monitoring. Comprehensive administration tools for system governance.">
			<div className="container mx-auto px-4 py-8">
				<div className="grid md:grid-cols-2 gap-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Shield className="h-5 w-5" />
								Admin Security
							</CardTitle>
							<CardDescription>
								Manage security settings and PKI configuration
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/admin/security">
								<Button className="w-full">Access Security</Button>
							</Link>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Users className="h-5 w-5" />
								User Access Management
							</CardTitle>
							<CardDescription>
								Manage user accounts, roles, and permissions
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/admin/users">
								<Button variant="outline" className="w-full">Manage Users</Button>
							</Link>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<BarChart3 className="h-5 w-5" />
								Performance Dashboard
							</CardTitle>
							<CardDescription>
								Monitor system performance and operational health
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/analytics/performance">
								<Button variant="outline" className="w-full">View Performance</Button>
							</Link>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Settings className="h-5 w-5" />
								Job Queue Management
							</CardTitle>
							<CardDescription>
								Monitor and manage background jobs and processing tasks
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/admin/jobs">
								<Button variant="outline" className="w-full">Manage Jobs</Button>
							</Link>
						</CardContent>
					</Card>
				</div>
			</div>
		</AdministrationLayout>
	);
}

