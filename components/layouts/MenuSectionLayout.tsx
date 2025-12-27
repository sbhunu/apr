/**
 * Generic Layout Component for Menu Sections with Sub-items
 * Provides consistent header with logo, title, sub-menu navigation, and hero description
 */

"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SubMenuItem {
	label: string;
	href: string;
	id: string;
	description: string;
}

interface MenuSectionLayoutProps {
	children: React.ReactNode;
	sectionTitle: string;
	subMenuItems: SubMenuItem[];
	currentPageId: string;
	heroTitle: string;
	heroDescription: string;
}

export default function MenuSectionLayout({
	children,
	sectionTitle,
	subMenuItems,
	currentPageId,
	heroTitle,
	heroDescription,
}: MenuSectionLayoutProps) {
	const pathname = usePathname();

	return (
		<div className="min-h-screen bg-slate-50 text-slate-900">
			{/* Header with Logo and Title */}
			<header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center gap-4 mb-4">
						<Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
							<Image
								src="/deed02.png"
								alt="APR Logo"
								width={40}
								height={40}
								className="h-10 w-10 object-contain"
							/>
						</Link>
						<h1 className="text-3xl font-bold text-slate-900">{sectionTitle}</h1>
					</div>

					{/* Sub-menu Navigation */}
					<nav className="flex gap-2 border-t border-slate-200 pt-4 flex-wrap">
						{subMenuItems.map((item) => {
							const isActive = currentPageId === item.id;
							return (
								<Link
									key={item.id}
									href={item.href}
									className={cn(
										"px-4 py-2 rounded-lg text-sm font-medium transition-colors",
										isActive
											? "bg-emerald-600 text-white"
											: "text-slate-600 hover:bg-slate-100 hover:text-emerald-700"
									)}>
									{item.label}
								</Link>
							);
						})}
					</nav>
				</div>
			</header>

			{/* Hero Section */}
			<section className="bg-white border-b border-slate-200">
				<div className="container mx-auto px-4 py-8">
					<h2 className="text-2xl font-semibold text-slate-900 mb-2">{heroTitle}</h2>
					<p className="text-lg text-slate-600 max-w-3xl">{heroDescription}</p>
				</div>
			</section>

			{/* Page Content */}
			<main>{children}</main>
		</div>
	);
}

