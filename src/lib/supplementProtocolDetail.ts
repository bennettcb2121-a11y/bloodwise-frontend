/**
 * Supplement timing, avoid, and safety notes for stack display and onboarding.
 * Keyed by biomarker (e.g. Ferritin, Vitamin D) for lookup from stack item marker.
 */

export type SupplementDetail = {
  timing?: string
  avoid?: string
  safetyNotes?: string
}

/** By biomarker key (matches stack item marker). */
export const SUPPLEMENT_DETAIL_BY_MARKER: Record<string, SupplementDetail> = {
  Ferritin: {
    timing: "Morning or with first meal; pair with vitamin C.",
    avoid: "Calcium, coffee, tea within 1–2 hours.",
    safetyNotes: "Do not megadose; retest in 8–12 weeks.",
  },
  "Vitamin D": {
    timing: "With a meal (fat helps absorption).",
    avoid: "None required.",
    safetyNotes: "High-dose use should be clinician-supervised.",
  },
  "25-OH Vitamin D": {
    timing: "With a meal (fat helps absorption).",
    avoid: "None required.",
    safetyNotes: "High-dose use should be clinician-supervised.",
  },
  "Vitamin B12": {
    timing: "Any time; sublingual can be on empty stomach.",
    avoid: "None required.",
    safetyNotes: "Retest in 8–12 weeks; severe deficiency needs clinician.",
  },
  Magnesium: {
    timing: "Evening preferred for sleep support.",
    avoid: "Take separately from zinc if high-dose zinc.",
    safetyNotes: "High doses can cause loose stools; glycinate often better tolerated.",
  },
  Folate: {
    timing: "With or without food.",
    avoid: "Do not exceed 1,000 mcg folic acid without clinician.",
    safetyNotes: "Confirm B12 status when supplementing folate.",
  },
}

/**
 * Get timing, avoid, and safety notes for a stack item (uses marker first, then infers from supplement name).
 */
export function getSupplementDetail(marker?: string | null, supplementName?: string): SupplementDetail | null {
  if (marker && SUPPLEMENT_DETAIL_BY_MARKER[marker]) return SUPPLEMENT_DETAIL_BY_MARKER[marker]
  const name = (supplementName ?? "").toLowerCase()
  if (name.includes("iron") || name.includes("ferritin")) return SUPPLEMENT_DETAIL_BY_MARKER.Ferritin
  if (name.includes("vitamin d") || name.includes("vit d")) return SUPPLEMENT_DETAIL_BY_MARKER["Vitamin D"]
  if (name.includes("b12") || name.includes("cobalamin")) return SUPPLEMENT_DETAIL_BY_MARKER["Vitamin B12"]
  if (name.includes("magnesium")) return SUPPLEMENT_DETAIL_BY_MARKER.Magnesium
  if (name.includes("folate") || name.includes("folic") || name.includes("5-mthf")) return SUPPLEMENT_DETAIL_BY_MARKER.Folate
  return null
}
