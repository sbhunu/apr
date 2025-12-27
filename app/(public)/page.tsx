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
			{ label: "Surveying", href: "/surveying" },
			{ label: "Deeds Processes", href: "/deeds" },
		],
	},
	{
		label: "Reporting",
		links: [
			{ label: "Reporting Hub", href: "/reporting" },
			{ label: "Analytics and Reporting", href: "/analytics/dashboard" },
			{ label: "Public Dashboard", href: "/dashboard" },
			{ label: "Property Search (Map Viewer Support)", href: "/property/search" },
			{ label: "General Records Search", href: "/documents/search" },
		],
	},
	{
		label: "Verifications",
		links: [
			{ label: "Verifications Hub", href: "/verifications" },
			{ label: "Verification of Records", href: "/verify/certificate" },
			{ label: "Digital Signature Validation", href: "/verify/signature" },
		],
	},
	{
		label: "Administration",
		links: [
			{ label: "Administration Hub", href: "/administration" },
			{ label: "Admin Security", href: "/admin/security" },
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
	const currentYear = new Date().getFullYear();
	const currentMonth = new Date().toLocaleString('default', { month: 'long' });
	const [statistics, setStatistics] = useState<Statistics>({
		totalDeedsRegistered: 0,
		monthlyDeedsRegistered: 0,
		year: currentYear,
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
					<Link href="/" className="flex items-center gap-3 justify-start hover:opacity-80 transition-opacity">
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
					</Link>
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
							<CardContent className="p-6 text-center">
								<div className="text-sm text-slate-600 mb-2">
									Deeds registered : {currentYear}
								</div>
								<div className="text-4xl font-bold text-slate-900 mb-1">
									{loading ? '...' : statistics.totalDeedsRegistered.toLocaleString()}
								</div>
								<div className="text-sm text-slate-600">
									Running total
								</div>
							</CardContent>
						</Card>

						{/* Monthly Deeds Card */}
						<Card className="bg-white border border-slate-200 shadow-sm">
							<CardContent className="p-6 text-center">
								<div className="text-sm text-slate-600 mb-2">
									Deeds Registered: {currentMonth}
								</div>
								<div className="text-4xl font-bold text-slate-900 mb-1">
									{loading ? '...' : statistics.monthlyDeedsRegistered.toLocaleString()}
								</div>
								<div className="text-sm text-slate-600">
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
					</aside>

					{/* Main Content Area */}
					<div className="flex-1 space-y-12">
						{/* Upper Section: System Overview */}
						<section>
							<div className="flex items-start justify-between gap-8">
								{/* Left: Title and Description */}
								<div className="flex-1 space-y-4 mt-[100px] px-[80px] text-center">
									<h1 className="text-4xl font-bold text-slate-900">
										Automating Communal Sectional Title Registrations
									</h1>
									<p className="text-lg text-slate-600 max-w-2xl mx-auto">
										Modernizing Zimbabwe's communal land sectional title registration process with integrated workflows, spatial validation, and digital signatures
									</p>
								</div>

								{/* Right: Verify Certificate Card */}
								<Card className="w-80 bg-white border border-slate-200 shadow-sm rounded-xl mt-[50px]">
									<CardContent className="px-6 pt-6 pb-[84px]">
										<Link href="/verify/certificate">
											<Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mb-4">
												<ShieldCheck className="mr-2 h-4 w-4" />
												Verify your records here
											</Button>
										</Link>
										<p className="text-sm text-slate-600">
											Verify Your officially Issued Property Records
										</p>
									</CardContent>
								</Card>
							</div>
						</section>

					</div>
				</div>

				{/* Lower Section: Platform Capabilities - Full Width Centered */}
				<section className="mt-[100px] w-full">
					<div className="container mx-auto px-4">
						<h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
							Platform Capabilities
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
							{/* Planning Approval Card */}
							<Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
								<CardContent className="p-6">
									<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
										<FileCheck className="h-6 w-6 text-blue-600" />
									</div>
									<h3 className="text-lg font-semibold text-slate-900 mb-2">
										Planning Approval
									</h3>
									<p className="text-sm text-slate-600">
										Submit and track sectional title schemes through the approval process
									</p>
								</CardContent>
							</Card>

							{/* Survey Validation Card */}
							<Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
								<CardContent className="p-6">
									<div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
										<MapPin className="h-6 w-6 text-orange-600" />
									</div>
									<h3 className="text-lg font-semibold text-slate-900 mb-2">
										Survey Validation
									</h3>
									<p className="text-sm text-slate-600">
										Professional land survey computation and Surveyor-General approval
									</p>
								</CardContent>
							</Card>

							{/* Scheme Registration Card */}
							<Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
								<CardContent className="p-6">
									<div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
										<Building2 className="h-6 w-6 text-emerald-600" />
									</div>
									<h3 className="text-lg font-semibold text-slate-900 mb-2">
										Scheme Registration
									</h3>
									<p className="text-sm text-slate-600">
										Complete sectional scheme registration with legal compliance
									</p>
								</CardContent>
							</Card>

							{/* Title Certificates Card */}
							<Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
								<CardContent className="p-6">
									<div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
										<Award className="h-6 w-6 text-purple-600" />
									</div>
									<h3 className="text-lg font-semibold text-slate-900 mb-2">
										Title Certificates
									</h3>
									<p className="text-sm text-slate-600">
										Issuance of legally defensible Certificates of Sectional Title
									</p>
								</CardContent>
							</Card>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
