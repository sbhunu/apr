/**
 * Public landing page for APR system
 * Step 1: Rebuild polished navigation landing experience with grouped sections
 */

"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRightCircle, ShieldCheck, BarChart3 } from "lucide-react";
import NotificationBell from "../../components/header/NotificationBell";
import UserMenu from "../../components/header/UserMenu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const headerNavigation = [
	{
		label: "Property Processes",
		links: [
			{ label: "Planning Processes", href: "/planning" },
			{ label: "Surveying Processes", href: "/survey/computations/upload" },
			{ label: "Deeds Processes", href: "/deeds/registration" },
		],
	},
	{
		label: "Reporting",
		links: [
			{ label: "Analytics and Reporting", href: "/analytics/dashboard" },
			{ label: "Public Dashboard", href: "/dashboard" },
			{ label: "Property Search (Map Viewer Support)", href: "/property/search" },
			{ label: "General Records Search", href: "/documents/search" },
		],
	},
	{
		label: "Verifications",
		links: [
			{ label: "Verification of Records", href: "/verify/certificate" },
			{ label: "Digital Signature Validation", href: "/verify/signature" },
		],
	},
	{
		label: "Security & PKI",
		links: [
			{ label: "User Access Management", href: "/admin/users" },
			{ label: "Performance Dashboard", href: "/analytics/performance" },
			{ label: "Job Queue Management", href: "/admin/jobs" },
		],
	},
];

// category deck removed — cards omitted per request

export default function PublicLandingPage() {
	return (
		<div className="min-h-screen bg-slate-50 text-slate-900">
			<header className="bg-white/90 backdrop-blur sticky top-0 z-30 border-b border-slate-200 shadow-sm">
				<div className="container mx-auto flex items-center justify-between px-4 py-3">
					<div className="flex items-center gap-3 justify-start">
						<Image
							src="/deed02.png"
							alt="APR Logo"
							width={32}
							height={32}
							className="h-8 w-8 object-contain"
						/>
						<div>
							<p className="text-xl font-semibold">
								Automated Property Registration
							</p>
							<p className="text-sm text-slate-500">
								Modernizing sectional title services
							</p>
						</div>
					</div>
					<div className="flex items-center justify-end gap-4">
						<nav className="flex gap-6 text-sm font-medium">
							{headerNavigation.map((entry) => (
								<div key={entry.label} className="group relative">
									<button
										type="button"
										className="rounded-full border border-transparent px-4 py-1 text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">
										{entry.label}
									</button>
									<div className="absolute right-0 top-full z-40 hidden min-w-[220px] flex-col gap-1 rounded-2xl border border-slate-100 bg-white p-3 shadow-lg transition delay-150 group-hover:flex group-hover:flex-col">
										{entry.links.map((item) => (
											<Link
												key={item.label}
												href={item.href}
												className="flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-emerald-700">
												{item.label}
												<ArrowRightCircle className="h-4 w-4 text-emerald-500" />
											</Link>
										))}
									</div>
								</div>
							))}
						</nav>
						<NotificationBell />
						<UserMenu />
					</div>
				</div>
			</header>

			<main className="container mx-auto px-4 py-12">
				<section className="mb-16">
					<div className="grid md:grid-cols-3 gap-6 items-start">
						{/* Left: Deeds Data Dashboard Card */}
						<Card className="border-2 border-emerald-100 hover:border-emerald-200 transition-colors">
							<CardHeader>
								<div className="flex items-center gap-3">
									<BarChart3 className="h-6 w-6 text-emerald-600" />
									<CardTitle>Deeds Data Dashboard</CardTitle>
								</div>
								<CardDescription>
									View comprehensive statistics and analytics
								</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-slate-600 mb-4">
									Access real-time data on schemes, titles, transfers, and registration metrics.
								</p>
								<Link href="/dashboard">
									<Button className="w-full" variant="outline">
										View Dashboard
										<ArrowRightCircle className="ml-2 h-4 w-4" />
									</Button>
								</Link>
							</CardContent>
						</Card>

						{/* Center: Hero Text */}
						<div className="text-center space-y-6">
							<h1 className="text-5xl font-bold text-slate-900">
								Automating Communal Sectional Titles
							</h1>
							<p className="text-xl text-slate-600 max-w-2xl mx-auto">
								Modernizing land registration services with digital workflows,
								spatial validation, and transparent public access.
							</p>
						</div>

						{/* Right: Certificate Verification Card */}
						<Card className="border-2 border-blue-100 hover:border-blue-200 transition-colors">
							<CardHeader>
								<div className="flex items-center gap-3">
									<ShieldCheck className="h-6 w-6 text-blue-600" />
									<CardTitle>Certificate Verification</CardTitle>
								</div>
								<CardDescription>
									Verify the authenticity of title certificates
								</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-slate-600 mb-4">
									Enter a certificate number or scan QR code to verify title certificate authenticity.
								</p>
								<Link href="/verify/certificate">
									<Button className="w-full" variant="outline">
										Verify Certificate
										<ArrowRightCircle className="ml-2 h-4 w-4" />
									</Button>
								</Link>
							</CardContent>
						</Card>
					</div>
				</section>

				<section className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
					<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
						<h3 className="text-lg font-semibold mb-2">Planning</h3>
						<p className="text-sm text-slate-600">
							Submit and review sectional scheme applications
						</p>
					</div>
					<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
						<h3 className="text-lg font-semibold mb-2">Survey</h3>
						<p className="text-sm text-slate-600">
							Upload computations and validate spatial data
						</p>
					</div>
					<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
						<h3 className="text-lg font-semibold mb-2">Deeds</h3>
						<p className="text-sm text-slate-600">
							Register schemes and issue title certificates
						</p>
					</div>
					<div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
						<h3 className="text-lg font-semibold mb-2">Operations</h3>
						<p className="text-sm text-slate-600">
							Manage transfers, mortgages, and amendments
						</p>
					</div>
				</section>
			</main>
		</div>
	);
}

