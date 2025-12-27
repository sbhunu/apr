/**
 * Verifications Section Layout
 * Wrapper for Verifications menu section pages
 */

"use client";

import MenuSectionLayout from "./MenuSectionLayout";

const verificationsSubMenu = [
	{
		label: "Verification of Records",
		href: "/verify/certificate",
		id: "certificate",
		description: "Verify the authenticity of property records and certificates using certificate numbers or QR codes.",
	},
	{
		label: "Digital Signature Validation",
		href: "/verify/signature",
		id: "signature",
		description: "Validate digital signatures against PKI certificate chains to ensure document integrity and authenticity.",
	},
	{
		label: "Survey Verification",
		href: "/verify/survey",
		id: "survey",
		description: "Verify that a survey plan is sealed and signed by the Surveyor-General. Check seal metadata and signature status.",
	},
];

interface VerificationsLayoutProps {
	children: React.ReactNode;
	currentPage: "certificate" | "signature" | "survey";
	heroTitle: string;
	heroDescription: string;
}

export default function VerificationsLayout({
	children,
	currentPage,
	heroTitle,
	heroDescription,
}: VerificationsLayoutProps) {
	return (
		<MenuSectionLayout
			sectionTitle="Verifications"
			subMenuItems={verificationsSubMenu}
			currentPageId={currentPage}
			heroTitle={heroTitle}
			heroDescription={heroDescription}>
			{children}
		</MenuSectionLayout>
	);
}

