/**
 * Verifications Landing Page
 * Entry point for verification features
 */

'use client'

import VerificationsLayout from "@/components/layouts/VerificationsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileCheck } from "lucide-react";
import Link from "next/link";

export default function VerificationsLandingPage() {
	return (
		<VerificationsLayout
			currentPage="certificate"
			heroTitle="Verification of Records"
			heroDescription="Verify the authenticity of property records and certificates using certificate numbers or QR codes. Ensure document integrity and validate digital signatures.">
			<div className="container mx-auto px-4 py-8">
				<div className="grid md:grid-cols-3 gap-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileCheck className="h-5 w-5" />
								Certificate Verification
							</CardTitle>
							<CardDescription>
								Verify property records and certificates by number or QR code
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/verify/certificate">
								<Button className="w-full">Verify Certificate</Button>
							</Link>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<ShieldCheck className="h-5 w-5" />
								Digital Signature Validation
							</CardTitle>
							<CardDescription>
								Validate digital signatures against PKI certificate chains
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/verify/signature">
								<Button variant="outline" className="w-full">Validate Signature</Button>
							</Link>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<FileCheck className="h-5 w-5" />
								Survey Verification
							</CardTitle>
							<CardDescription>
								Verify sealed survey plans and check Surveyor-General signatures
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/verify/survey">
								<Button variant="outline" className="w-full">Verify Survey</Button>
							</Link>
						</CardContent>
					</Card>
				</div>
			</div>
		</VerificationsLayout>
	);
}

