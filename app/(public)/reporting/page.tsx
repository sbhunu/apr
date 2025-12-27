/**
 * Reporting Landing Page
 * Entry point for reporting and analytics features
 */

'use client'

import ReportingLayout from "@/components/layouts/ReportingLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, MapPin, Search, FileText } from "lucide-react";
import Link from "next/link";

export default function ReportingLandingPage() {
	return (
		<ReportingLayout
			currentPage="analytics"
			heroTitle="Analytics and Reporting"
			heroDescription="Comprehensive analytics and reporting tools for performance metrics, trends, and data insights. Access dashboards, spatial analytics, and exportable reports.">
			<div className="container mx-auto px-4 py-8">
				<div className="grid md:grid-cols-2 gap-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<BarChart3 className="h-5 w-5" />
								Analytics Dashboard
							</CardTitle>
							<CardDescription>
								View comprehensive analytics and performance metrics
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/analytics/dashboard">
								<Button className="w-full">Access Analytics</Button>
							</Link>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<BarChart3 className="h-5 w-5" />
								Public Dashboard
							</CardTitle>
							<CardDescription>
								View public statistics and national registration metrics
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/dashboard">
								<Button variant="outline" className="w-full">View Public Dashboard</Button>
							</Link>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<MapPin className="h-5 w-5" />
								Property Search
							</CardTitle>
							<CardDescription>
								Search properties using map viewer with spatial data visualization
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/property/search">
								<Button variant="outline" className="w-full">Open Map Viewer</Button>
							</Link>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileText className="h-5 w-5" />
								Records Search
							</CardTitle>
							<CardDescription>
								Search and retrieve general records and documents
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/documents/search">
								<Button variant="outline" className="w-full">Search Records</Button>
							</Link>
						</CardContent>
					</Card>
				</div>
			</div>
		</ReportingLayout>
	);
}

