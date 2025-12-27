/**
 * Public landing page for APR system
 * Matches the design from the provided image
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRightCircle, ShieldCheck, FileCheck, MapPin, Building2, Award } from "lucide-react";
import NotificationBell from "../../components/header/NotificationBell";
import UserMenu from "../../components/header/UserMenu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const headerNavigation = [
	{
		label: "Property Processes",
		links: [
			{ label: "Planning Processes", href: "/planning" },
			{ label: "Deeds Processes", href: "/deeds/registration" },
		],
	},
	{
		label: "Surveying",
		links: [
			{ label: "Survey Processes Hub", href: "/survey/processes" },
			{ label: "Upload Parent Parcel", href: "/survey/computations/upload" },
			{ label: "SG Review & Approval", href: "/survey/approval" },
			{ label: "Property Analysis", href: "/property/analysis" },
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

interface Statistics {
	totalDeedsRegistered: number;
	monthlyDeedsRegistered: number;
	year: number;
}

export default function PublicLandingPage() {
	const [statistics, setStatistics] = useState<Statistics>({
		totalDeedsRegistered: 145678,
		monthlyDeedsRegistered: 3421,
		year: 2025,
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadStatistics();
	}, []);

	const loadStatistics = async () => {
		try {
			const response = await fetch('/api/public/statistics');
			const data = await response.json();
			if (data.success && data.statistics) {
				setStatistics(data.statistics);
			}
		} catch (error) {
			console.error('Failed to load statistics:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 text-slate-900">
			{/* Header - Navigation remains the same */}
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

			<main className="container mx-auto px-4 py-8">
				<div className="flex gap-8 items-start">
					{/* Left Sidebar */}
					<aside className="w-80 flex-shrink-0 space-y-4 sticky top-24">
						{/* Total Deeds Registered Card */}
						<Card className="bg-white border border-slate-200 shadow-sm">
							<CardContent className="p-6">
								<div className="text-sm font-medium text-slate-600 mb-2">
									Total Deeds Registered: {statistics.year}
								</div>
								<div className="text-4xl font-bold text-slate-900 mb-1">
									{loading ? '...' : statistics.totalDeedsRegistered.toLocaleString()}
								</div>
								<div className="text-xs text-slate-500">
									All time registrations
								</div>
							</CardContent>
						</Card>

						{/* Monthly Deeds Card */}
						<Card className="bg-white border border-slate-200 shadow-sm">
							<CardContent className="p-6">
								<div className="text-sm font-medium text-slate-600 mb-2">
									Deeds Registered: This Month
								</div>
								<div className="text-4xl font-bold text-slate-900 mb-1">
									{loading ? '...' : statistics.monthlyDeedsRegistered.toLocaleString()}
								</div>
								<div className="text-xs text-slate-500">
									Deeds processed in current month
								</div>
							</CardContent>
						</Card>

						{/* Detailed Dashboard Button */}
						<Link href="/dashboard">
							<Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold">
								Detailed Dashboard
							</Button>
						</Link>
						<p className="text-xs text-slate-500 text-center">
							Click for detailed statistics
						</p>

						{/* Platform Capabilities Section - Moved below Detailed Dashboard */}
						<div className="pt-6 mt-6 border-t border-slate-200">
							<h2 className="text-xl font-bold text-slate-900 mb-4">
								Platform Capabilities
							</h2>
							<div className="space-y-4">
								{/* Planning Approval Card */}
								<Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
									<CardContent className="p-4">
										<div className="flex items-start gap-3">
											<div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
												<FileCheck className="h-5 w-5 text-blue-600" />
											</div>
											<div>
												<h3 className="text-sm font-semibold text-slate-900 mb-1">
													Planning Approval
												</h3>
												<p className="text-xs text-slate-600">
													Submit and track sectional title schemes through the approval process
												</p>
											</div>
										</div>
									</CardContent>
								</Card>

								{/* Survey Validation Card */}
								<Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
									<CardContent className="p-4">
										<div className="flex items-start gap-3">
											<div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
												<MapPin className="h-5 w-5 text-orange-600" />
											</div>
											<div>
												<h3 className="text-sm font-semibold text-slate-900 mb-1">
													Survey Validation
												</h3>
												<p className="text-xs text-slate-600">
													Professional land survey computation and Surveyor-General approval
												</p>
											</div>
										</div>
									</CardContent>
								</Card>

								{/* Scheme Registration Card */}
								<Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
									<CardContent className="p-4">
										<div className="flex items-start gap-3">
											<div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
												<Building2 className="h-5 w-5 text-emerald-600" />
											</div>
											<div>
												<h3 className="text-sm font-semibold text-slate-900 mb-1">
													Scheme Registration
												</h3>
												<p className="text-xs text-slate-600">
													Complete sectional scheme registration with legal compliance
												</p>
											</div>
										</div>
									</CardContent>
								</Card>

								{/* Title Certificates Card */}
								<Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
									<CardContent className="p-4">
										<div className="flex items-start gap-3">
											<div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
												<Award className="h-5 w-5 text-purple-600" />
											</div>
											<div>
												<h3 className="text-sm font-semibold text-slate-900 mb-1">
													Title Certificates
												</h3>
												<p className="text-xs text-slate-600">
													Issuance of legally defensible Certificates of Sectional Title
												</p>
											</div>
										</div>
									</CardContent>
								</Card>
							</div>
						</div>
					</aside>

					{/* Main Content Area */}
					<div className="flex-1 space-y-12">
						{/* Upper Section: System Overview */}
						<section>
							<div className="flex items-start justify-between gap-8">
								{/* Left: Title and Description */}
								<div className="flex-1 space-y-4">
									<h1 className="text-4xl font-bold text-slate-900">
										Automated Property Registration System
									</h1>
									<p className="text-lg text-slate-600 max-w-2xl">
										Modernizing Zimbabwe's communal land sectional title registration process with integrated workflows, spatial validation, and digital signatures
									</p>
								</div>

								{/* Right: Verify Certificate Card */}
								<Card className="w-80 bg-white border border-slate-200 shadow-sm rounded-xl">
									<CardContent className="p-6">
										<Link href="/verify/certificate">
											<Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mb-4">
												<ShieldCheck className="mr-2 h-4 w-4" />
												Verify Certificate
											</Button>
										</Link>
										<p className="text-sm font-semibold text-slate-900">
											Verify Your officially Issued Property Records
										</p>
									</CardContent>
								</Card>
							</div>
						</section>
					</div>
				</div>
			</main>
		</div>
	);
}
