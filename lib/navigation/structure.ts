import {
  Activity,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gavel,
  Map,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";

export type NavigationCategorySlug =
  | "reporting"
  | "verifications"
  | "property-processes"
  | "administration";

export interface NavigationSubItem {
  title: string;
  description: string;
  href: string;
}

export interface NavigationCategory {
  slug: NavigationCategorySlug;
  label: string;
  description: string;
  hero: string;
  highlight: string;
  icon: typeof Users;
  subItems: NavigationSubItem[];
  cta: {
    label: string;
    href: string;
  };
}

export const navigationCategories: NavigationCategory[] = [
  {
    slug: "reporting",
    label: "Reporting",
    description:
      "Access reports, statistics, and verification tools for land ownership records.",
    hero: "Comprehensive reporting and verification services for land ownership transparency.",
    highlight:
      "Verify certificates, view statistics, generate reports, and access public resources.",
    icon: TrendingUp,
    subItems: [
      {
        title: "Analytics Dashboard",
        description:
          "View comprehensive analytics and insights for land ownership records.",
        href: "/analytics/dashboard",
      },
      {
        title: "Property Search (Map Viewer Support)",
        description:
          "Search properties with interactive map viewer supporting multiple layers.",
        href: "/property/search",
      },
      {
        title: "Verify a Survey",
        description: "Check the seal metadata for a sealed survey plan.",
        href: "/verify/survey",
      },
      {
        title: "General Records Search",
        description:
          "Search across planning documents, survey plans, title certificates, mortgages, and other documents.",
        href: "/documents/search",
      },
      {
        title: "Public Dashboard",
        description:
          "View aggregated statistics about schemes, titles, and transfers.",
        href: "/dashboard",
      },
      {
        title: "Public Announcements",
        description: "Stay up-to-date with latest circulars and updates.",
        href: "/news",
      },
      {
        title: "Verify a Certificate",
        description: "Verify the authenticity of a QR-coded title certificate.",
        href: "/verify/certificate",
      },
    ],
    cta: {
      label: "Explore Reporting Tools",
      href: "/navigation/reporting",
    },
  },
  {
    slug: "verifications",
    label: "Verifications",
    description:
      "Professional teams coordinate planning, surveying, and submissions.",
    hero: "Designed for developers, planners, and survey firms managing complex schemes.",
    highlight:
      "Submit planning applications, upload survey data, and handshake with approval teams.",
    icon: ClipboardList,
    subItems: [
      {
        title: "Verification of Records",
        description:
          "Confirm that a QR-coded certificate is officially issued.",
        href: "/verify/certificate",
      },
      {
        title: "Digital Signature Validation",
        description:
          "Validate digital signatures through PKI verification process.",
        href: "/verify/signature",
      },
      {
        title: "New Planning Submission",
        description:
          "Start a sectional scheme application with uploads and validations.",
        href: "/planning/schemes/new",
      },
      {
        title: "Planning Reviews",
        description: "Monitor the status of submissions and review comments.",
        href: "/planning/review",
      },
      {
        title: "My Submissions",
        description: "Manage your own drafts, documents, and GIS previews.",
        href: "/planning/schemes",
      },
    ],
    cta: {
      label: "Navigate Verification Workflows",
      href: "/navigation/verifications",
    },
  },
  {
    slug: "property-processes",
    label: "Property Processes",
    description:
      "Core property administration workflows across deeds, transfers, and amendments.",
    hero: "Streamline drafting, examination, registration, and transfer operations.",
    highlight:
      "Deeds drafters, examiners, registrars, and operators coordinate from one portal.",
    icon: Gavel,
    subItems: [
      {
        title: "Deeds Processes Hub",
        description:
          "Overview of Modules 3, 4 & 5: Scheme Registration, Deeds Creation, and Operations.",
        href: "/deeds/processes",
      },
      {
        title: "Scheme Registration",
        description:
          "Register sealed surveys as legal schemes and create Body Corporate.",
        href: "/deeds/schemes",
      },
      {
        title: "Select Scheme",
        description:
          "Choose a registered scheme with sealed survey to begin drafting.",
        href: "/deeds/titles/select",
      },
      {
        title: "Deeds Drafting",
        description:
          "Prepare sectional title legal descriptions and conveyancing packets.",
        href: "/deeds/titles/draft",
      },
      {
        title: "Deeds Examination",
        description:
          "Review submitted titles, inspect defects, and approve/reject.",
        href: "/deeds/examination",
      },
      {
        title: "Title Registration",
        description: "Register approved titles and issue certificates.",
        href: "/deeds/registration",
      },
      {
        title: "Transfers Operations",
        description: "Process ownership transfers unlocked by deed registrars.",
        href: "/operations/transfers",
      },
      {
        title: "Amendments",
        description:
          "Submit and review scheme amendments (extensions, consolidations).",
        href: "/operations/amendments",
      },
      {
        title: "Mortgage Registration",
        description:
          "Register charges and mortgages on sectional titles. Track encumbrances and financial institution links.",
        href: "/operations/mortgages",
      },
      {
        title: "Lease Management",
        description:
          "Register and manage leases on sectional titles. Track lease terms, expiry dates, and renewals.",
        href: "/operations/leases",
      },
      {
        title: "Objections Processing",
        description:
          "Submit and process objections to planning applications. Manage objection windows and hearings.",
        href: "/operations/objections",
      },
      {
        title: "Dispute Resolution",
        description:
          "Create and manage disputes related to property rights. Track dispute resolution workflows.",
        href: "/operations/disputes",
      },
      {
        title: "Property Records Analysis",
        description:
          "Comprehensive analysis of all records related to a property across planning, survey, and deeds.",
        href: "/property/analysis",
      },
      {
        title: "Surveying Processes",
        description: "Overview of Module 2 flows and approvals.",
        href: "/survey/processes",
      },
    ],
    cta: {
      label: "Explore Property Workflows",
      href: "/navigation/property-processes",
    },
  },
  {
    slug: "administration",
    label: "Security & PKI",
    description:
      "Governance tools for onboarding, RBAC, and digital signatures.",
    hero: "Ensure only certified planners and authorities can transact securely.",
    highlight:
      "Manage roles, approvals, and PKI workflows from one control plane.",
    icon: Activity,
    subItems: [
      {
        title: "User Access Management",
        description:
          "Approve planners, assign roles, and monitor user activity.",
        href: "/admin/security#user-access",
      },
      {
        title: "Digital Signatures",
        description:
          "Review the PKI queue and sign documents manually when needed.",
        href: "/admin/security#digital-signatures",
      },
      {
        title: "Security Monitoring",
        description: "View uptime, alerts, and infrastructure health.",
        href: "/admin/monitoring",
      },
      {
        title: "Performance Dashboard",
        description:
          "Review throughput, response times, and related analytics.",
        href: "/analytics/performance",
      },
      {
        title: "Job Queue Management",
        description:
          "Monitor and manage background jobs, queues, and processing tasks.",
        href: "/admin/jobs",
      },
    ],
    cta: {
      label: "Visit Security & PKI Space",
      href: "/navigation/administration",
    },
  },
];

export function getNavigationCategory(
  slug: string
): NavigationCategory | undefined {
  return navigationCategories.find((entry) => entry.slug === slug);
}

