/**
 * Blood test partners for the “Get bloodwork” onboarding step.
 * Each row maps to a common user goal: lowest cost, broadest panel, fastest turnaround, or creator affiliate.
 *
 * Clarion does not run labs. Replace Everlywell URL with your partner link when approved
 * (see resolveBloodTestCtaUrl).
 */

export type BloodTestProvider = {
  id: string
  name: string
  description: string
  /** Short badge shown in UI (category). */
  badge?: string
  /** Biomarkers covered (summary). */
  biomarkersIncluded: string
  /** Price as displayed (e.g. "$89" or "From $49"). */
  priceDisplay: string
  /** Default CTA (non-affiliate or fallback). */
  ctaUrl: string
  ctaLabel: string
  /** FTC-style note when Clarion may earn from the link. */
  affiliateDisclosure?: string
}

/**
 * Curated picks (one per goal):
 * - Cheapest: discount lab broker → Quest/Labcorp network (typically lowest $/marker vs bundled DTC).
 * - Most biomarkers: membership-style large panels (count and cadence vary; verify on site).
 * - Fastest: direct-to-lab patient ordering + local draw (usually quicker than mail-in kits).
 * - Affiliate: Everlywell — at-home DTC; apply for partner/affiliate (Impact, ShareASale, brand program).
 */
export const BLOOD_TEST_PROVIDERS: BloodTestProvider[] = [
  {
    id: "walk-in-lab",
    name: "Walk-In Lab",
    description:
      "Order lab tests online and visit a Quest or Labcorp patient service center. Usually the lowest cost per marker compared with bundled wellness kits.",
    badge: "Cheapest",
    biomarkersIncluded: "Build your own panel (CBC, lipids, ferritin, vitamin D, thyroid, and many more).",
    priceDisplay: "Varies; often lowest per test",
    ctaUrl: "https://www.walkinlab.com",
    ctaLabel: "View tests",
  },
  {
    id: "function-health",
    name: "Function Health",
    description:
      "Membership-based testing with very large biomarker counts and repeat testing on a schedule—strong when you want breadth and tracking over time.",
    badge: "Most biomarkers",
    biomarkersIncluded: "Very broad panels (100+ analytes on a membership cadence; confirm current menu on their site).",
    priceDisplay: "Membership",
    ctaUrl: "https://www.functionhealth.com",
    ctaLabel: "View membership",
  },
  {
    id: "labcorp-ondemand",
    name: "Labcorp OnDemand",
    description:
      "Order tests online and get a blood draw at Labcorp locations. Often the fastest path to results versus shipping a sample from home.",
    badge: "Fastest results",
    biomarkersIncluded: "Order individual tests or panels; digital results after your draw.",
    priceDisplay: "Varies",
    ctaUrl: "https://www.ondemand.labcorp.com",
    ctaLabel: "Order & find a lab",
  },
  {
    id: "everlywell",
    name: "Everlywell",
    description:
      "At-home sample collection with clear digital reports. A practical choice for DTC kits; Everlywell commonly runs partner/affiliate programs for publishers—apply and set NEXT_PUBLIC_EVERLYWELL_AFFILIATE_URL.",
    badge: "Affiliate-friendly",
    biomarkersIncluded: "Single markers and panels (vitamin D, lipids, thyroid, HbA1c, food sensitivity, and more).",
    priceDisplay: "Varies by test",
    ctaUrl: "https://www.everlywell.com",
    ctaLabel: "View tests",
    affiliateDisclosure:
      "Clarion may earn a commission from qualifying purchases made through this link when an affiliate URL is configured.",
  },
]

/** Use your Everlywell partner / affiliate URL when approved (must be https). */
export function resolveBloodTestCtaUrl(provider: BloodTestProvider): string {
  if (provider.id !== "everlywell") return provider.ctaUrl
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_EVERLYWELL_AFFILIATE_URL) {
    const u = process.env.NEXT_PUBLIC_EVERLYWELL_AFFILIATE_URL.trim()
    if (u.startsWith("https://")) return u
  }
  return provider.ctaUrl
}
