/**
 * Reporting Section Layout
 * Wrapper for Reporting menu section pages
 */

"use client";

import MenuSectionLayout from "./MenuSectionLayout";

const reportingSubMenu = [
	{
		label: "Analytics and Reporting",
		href: "/analytics/dashboard",
		id: "analytics",
		description: "Comprehensive analytics and reporting tools for performance metrics, trends, and data insights.",
	},
	{
		label: "Public Dashboard",
		href: "/dashboard",
		id: "dashboard",
		description: "Public-facing dashboard displaying national statistics and registration metrics.",
	},
	{
		label: "Property Search (Map Viewer Support)",
		href: "/property/search",
		id: "property-search",
		description: "Search for properties using map viewer with spatial data visualization and cadastral layers.",
	},
	{
		label: "General Records Search",
		href: "/documents/search",
		id: "records-search",
		description: "Search and retrieve general records and documents from the system.",
	},
];

interface ReportingLayoutProps {
	children: React.ReactNode;
	currentPage: "analytics" | "dashboard" | "property-search" | "records-search";
	heroTitle: string;
	heroDescription: string;
}

export default function ReportingLayout({
	children,
	currentPage,
	heroTitle,
	heroDescription,
}: ReportingLayoutProps) {
	const currentItem = reportingSubMenu.find((item) => item.id === currentPage);

	return (
		<MenuSectionLayout
			sectionTitle="Reporting"
			subMenuItems={reportingSubMenu}
			currentPageId={currentPage}
			heroTitle={heroTitle}
			heroDescription={heroDescription}>
			{children}
		</MenuSectionLayout>
	);
}

