/**
 * Shared Layout Component for Property Processes Pages
 * Provides consistent header with logo, title, sub-menu navigation, and hero description
 */

"use client";

import MenuSectionLayout from "./MenuSectionLayout";

interface PropertyProcessesLayoutProps {
	children: React.ReactNode;
	currentPage: "planning" | "surveying" | "deeds";
	heroTitle: string;
	heroDescription: string;
}

const propertyProcessesSubMenu = [
	{
		label: "Planning Processes",
		href: "/planning",
		id: "planning",
		description: "Submit sectional scheme applications and track their progress through the approval workflow.",
	},
	{
		label: "Surveying",
		href: "/surveying",
		id: "surveying",
		description: "Complete workflow for approved planning plans: upload parent parcel geometry, run computations, generate sectional diagrams, and follow through to Surveyor-General approval and sealing.",
	},
	{
		label: "Deeds Processes",
		href: "/deeds",
		id: "deeds",
		description: "Register schemes and issue sectional title certificates with legal compliance.",
	},
];

export default function PropertyProcessesLayout({
	children,
	currentPage,
	heroTitle,
	heroDescription,
}: PropertyProcessesLayoutProps) {
	return (
		<MenuSectionLayout
			sectionTitle="Property Processes"
			subMenuItems={propertyProcessesSubMenu}
			currentPageId={currentPage}
			heroTitle={heroTitle}
			heroDescription={heroDescription}>
			{children}
		</MenuSectionLayout>
	);
}

