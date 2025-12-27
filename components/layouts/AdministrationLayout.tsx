/**
 * Administration Section Layout
 * Wrapper for Administration menu section pages
 */

"use client";

import MenuSectionLayout from "./MenuSectionLayout";

const administrationSubMenu = [
	{
		label: "Admin Security",
		href: "/admin/security",
		id: "security",
		description: "Manage security settings, PKI configuration, and access controls for the system.",
	},
	{
		label: "User Access Management",
		href: "/admin/users",
		id: "users",
		description: "Manage user accounts, roles, permissions, and access rights across the system.",
	},
	{
		label: "Performance Dashboard",
		href: "/analytics/performance",
		id: "performance",
		description: "Monitor system performance metrics, response times, and operational health.",
	},
	{
		label: "Job Queue Management",
		href: "/admin/jobs",
		id: "jobs",
		description: "Monitor and manage background jobs, queues, and processing tasks.",
	},
];

interface AdministrationLayoutProps {
	children: React.ReactNode;
	currentPage: "security" | "users" | "performance" | "jobs";
	heroTitle: string;
	heroDescription: string;
}

export default function AdministrationLayout({
	children,
	currentPage,
	heroTitle,
	heroDescription,
}: AdministrationLayoutProps) {
	return (
		<MenuSectionLayout
			sectionTitle="Administration"
			subMenuItems={administrationSubMenu}
			currentPageId={currentPage}
			heroTitle={heroTitle}
			heroDescription={heroDescription}>
			{children}
		</MenuSectionLayout>
	);
}

