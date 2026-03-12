/**
 * Blood test partners / affiliate config. Reusable data structure for the
 * "Do you already have lab results?" → No → recommendation step.
 */

export type BloodTestProvider = {
  id: string
  name: string
  description: string
  /** Short badge: "Best value" | "Most complete" | etc. */
  badge?: string
  /** Biomarkers covered (summary) */
  biomarkersIncluded: string
  /** Price as displayed (e.g. "$89" or "From $49") */
  priceDisplay: string
  /** CTA link (affiliate or direct) */
  ctaUrl: string
  ctaLabel: string
}

export const BLOOD_TEST_PROVIDERS: BloodTestProvider[] = [
  {
    id: "inside-tracker",
    name: "InsideTracker",
    description: "Comprehensive panels with personalized insights. Strong for athletes and performance-focused users.",
    badge: "Most complete",
    biomarkersIncluded: "CBC, metabolic panel, lipids, ferritin, vitamin D, B12, hs-CRP, and more.",
    priceDisplay: "From $99",
    ctaUrl: "https://www.insidetracker.com",
    ctaLabel: "View options",
  },
  {
    id: "everlywell",
    name: "Everlywell",
    description: "At-home testing with clear results. Good variety of single-marker and panel options.",
    badge: "Best value",
    biomarkersIncluded: "Vitamin D, lipids, thyroid, HbA1c, and other single tests or panels.",
    priceDisplay: "Varies by test",
    ctaUrl: "https://www.everlywell.com",
    ctaLabel: "View tests",
  },
  {
    id: "own-your-labs",
    name: "Own Your Labs",
    description: "Order the same lab tests your doctor would, often at lower cost. You choose the biomarkers.",
    biomarkersIncluded: "Wide range; order individual markers or panels (e.g. ferritin, vitamin D, lipids).",
    priceDisplay: "Varies",
    ctaUrl: "https://www.ownyourlabs.com",
    ctaLabel: "Order labs",
  },
]
