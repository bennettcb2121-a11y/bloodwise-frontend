/**
 * Supplement timing, avoid, and safety notes for stack display and onboarding.
 * Keyed by biomarker (e.g. Ferritin, Vitamin D) for lookup from stack item marker.
 */

export type SupplementDetail = {
  timing?: string
  /** Helpful pairings / absorption (shown in protocol “Interactions”). */
  pairWith?: string
  avoid?: string
  safetyNotes?: string
}

export type TimingBadgeKind = "morning" | "evening" | "anytime"

/**
 * Map free-text timing strings to a compact badge for the daily protocol UI.
 */
export function parseTimingBadge(timing?: string): { label: string; kind: TimingBadgeKind } {
  const t = (timing ?? "").toLowerCase()
  if (!t.trim()) {
    return { label: "With food", kind: "anytime" }
  }
  if (
    t.includes("evening") ||
    t.includes("night") ||
    t.includes("bed") ||
    t.includes("sleep support")
  ) {
    return { label: "Evening", kind: "evening" }
  }
  if (
    t.includes("morning") ||
    t.includes("first meal") ||
    t.includes("am ") ||
    t.startsWith("am")
  ) {
    return { label: "Morning", kind: "morning" }
  }
  if (t.includes("any time") || t.includes("anytime") || t.includes("empty stomach")) {
    return { label: "Anytime", kind: "anytime" }
  }
  if (t.includes("meal") || t.includes("food") || t.includes("fat")) {
    return { label: "With food", kind: "anytime" }
  }
  /* Plan default: non-morning/evening free text → “With food” bucket for grouping */
  return { label: "With food", kind: "anytime" }
}

/** By biomarker key (matches stack item marker). */
export const SUPPLEMENT_DETAIL_BY_MARKER: Record<string, SupplementDetail> = {
  Ferritin: {
    timing: "Morning or with first meal.",
    pairWith: "Vitamin C (or vitamin C–rich foods) in the same meal improves non-heme iron absorption.",
    avoid: "Space calcium-rich foods or supplements, coffee, and tea 1–2 hours away when possible.",
    safetyNotes: "Do not megadose; retest in 8–12 weeks.",
  },
  "Vitamin C": {
    timing: "With meals or split through the day.",
    pairWith: "With iron in the same meal supports non-heme iron absorption.",
    avoid: "Very high doses may upset stomach; separate from aluminum-containing antacids if your clinician advised.",
    safetyNotes: "Discuss long-term high-dose use with your clinician.",
  },
  "Vitamin D": {
    timing: "With a meal (fat helps absorption).",
    pairWith: "Meals containing some fat improve absorption.",
    avoid: "None required for most people.",
    safetyNotes: "High-dose use should be clinician-supervised.",
  },
  "25-OH Vitamin D": {
    timing: "With a meal (fat helps absorption).",
    pairWith: "Meals containing some fat improve absorption.",
    avoid: "None required for most people.",
    safetyNotes: "High-dose use should be clinician-supervised.",
  },
  "Vitamin B12": {
    timing: "Any time; sublingual can be on empty stomach.",
    pairWith: "Can be taken with or without food; sublingual forms bypass stomach acid.",
    avoid: "None required for most people.",
    safetyNotes: "Retest in 8–12 weeks; severe deficiency needs clinician.",
  },
  Magnesium: {
    timing: "Evening preferred for sleep support.",
    pairWith: "Often taken with dinner; separate from high-dose zinc if you use both.",
    avoid: "Take separately from high-dose zinc if both are supplemented.",
    safetyNotes: "High doses can cause loose stools; glycinate often better tolerated.",
  },
  Folate: {
    timing: "With or without food.",
    pairWith: "Often considered alongside B12 status when supplementing folate alone.",
    avoid: "Do not exceed 1,000 mcg folic acid without clinician guidance.",
    safetyNotes: "Confirm B12 status when supplementing folate.",
  },
  CRP: {
    timing: "As directed on label.",
    pairWith: "Supportive stack is context-specific; inflammation drivers vary.",
    avoid: "Not a substitute for finding the cause of elevated CRP.",
    safetyNotes: "Discuss persistent elevation with your clinician.",
  },
}

/**
 * Get timing, avoid, and safety notes for a stack item (uses marker first, then infers from supplement name).
 */
/** True if this stack row is an iron / ferritin supplement (pairing UI may apply). */
export function isIronStackRow(marker?: string | null, supplementName?: string): boolean {
  const blob = `${supplementName ?? ""} ${marker ?? ""}`.toLowerCase()
  return (
    blob.includes("iron") ||
    blob.includes("ferritin") ||
    blob.includes("ferrous") ||
    marker === "Ferritin"
  )
}

/** True if this stack row is vitamin D. */
export function isVitaminDStackRow(marker?: string | null, supplementName?: string): boolean {
  const blob = `${supplementName ?? ""} ${marker ?? ""}`.toLowerCase()
  return (
    blob.includes("vitamin d") ||
    blob.includes("vit d") ||
    blob.includes("cholecalciferol") ||
    blob.includes("25-oh") ||
    /\bd3\b/.test(blob) ||
    marker === "Vitamin D" ||
    marker === "25-OH Vitamin D"
  )
}

/** True if this stack row is vitamin C (may nest under iron for absorption pairing). */
export function isVitaminCStackRow(marker?: string | null, supplementName?: string): boolean {
  const blob = `${supplementName ?? ""} ${marker ?? ""}`.toLowerCase()
  return (
    blob.includes("vitamin c") ||
    blob.includes("ascorbic") ||
    blob.includes("liposomal c") ||
    /\bvit\s*c\b/.test(blob) ||
    marker === "Vitamin C"
  )
}

/** Suggested add-on when iron is in the plan but vitamin C isn’t in the stack — supplemental, not a logged “driver.” */
export function getIronVitaminCSupplementalPairing(): {
  label: string
  doseLine: string
  footnote: string
} {
  return {
    label: "Vitamin C",
    doseLine: "250–500 mg with the same meal as iron (or vitamin C–rich food in that meal).",
    footnote: "Supplemental to support non-heme iron absorption — add on Plan if it’s not in your stack.",
  }
}

export function getSupplementDetail(marker?: string | null, supplementName?: string): SupplementDetail | null {
  if (marker && SUPPLEMENT_DETAIL_BY_MARKER[marker]) return SUPPLEMENT_DETAIL_BY_MARKER[marker]
  const name = (supplementName ?? "").toLowerCase()
  if (name.includes("iron") || name.includes("ferritin")) return SUPPLEMENT_DETAIL_BY_MARKER.Ferritin
  if (name.includes("vitamin c") || name.includes("ascorbic")) return SUPPLEMENT_DETAIL_BY_MARKER["Vitamin C"]
  if (name.includes("vitamin d") || name.includes("vit d")) return SUPPLEMENT_DETAIL_BY_MARKER["Vitamin D"]
  if (name.includes("b12") || name.includes("cobalamin")) return SUPPLEMENT_DETAIL_BY_MARKER["Vitamin B12"]
  if (name.includes("magnesium")) return SUPPLEMENT_DETAIL_BY_MARKER.Magnesium
  if (name.includes("folate") || name.includes("folic") || name.includes("5-mthf")) return SUPPLEMENT_DETAIL_BY_MARKER.Folate
  if (name.includes("crp") || name.includes("c-reactive")) return SUPPLEMENT_DETAIL_BY_MARKER.CRP
  if (name.includes("omega") || name.includes("fish oil") || name.includes("epa") || name.includes("dha")) {
    return {
      timing: "Often with meals to reduce fishy aftertaste.",
      pairWith: "Fat-containing meals improve absorption of EPA/DHA.",
      avoid: "May interact with blood thinners — clinician input if on anticoagulants.",
      safetyNotes: "Choose quality-tested products; discuss high doses with your clinician.",
    }
  }
  if (name.includes("zinc")) {
    return {
      timing: "Often with food.",
      pairWith: "Copper balance matters with long-term zinc; separate from high-dose iron if advised.",
      avoid: "Can interact with certain antibiotics and minerals — spacing per label/clinician.",
      safetyNotes: "Long-term high-dose zinc needs monitoring.",
    }
  }
  if (name.includes("turmeric") || name.includes("curcumin")) {
    return {
      timing: "Often with food.",
      pairWith: "Black pepper extract (piperine) in many formulas improves curcumin uptake.",
      avoid: "Caution with blood thinners and gallbladder disease — ask your clinician.",
      safetyNotes: "Stop before surgery if your team advises.",
    }
  }
  return null
}

/** Structured lines for the daily protocol “Interactions & spacing” panel (every supplement row). */
export function getProtocolInteractionBlocks(marker?: string | null, supplementName?: string): { label: string; text: string }[] {
  const d = getSupplementDetail(marker, supplementName)
  const blocks: { label: string; text: string }[] = []
  if (d?.pairWith?.trim()) blocks.push({ label: "Pairs well / absorption", text: d.pairWith.trim() })
  if (d?.avoid?.trim() && !/^none required/i.test(d.avoid.trim())) {
    blocks.push({ label: "Spacing or avoid", text: d.avoid.trim() })
  }
  if (d?.safetyNotes?.trim()) blocks.push({ label: "Safety", text: d.safetyNotes.trim() })
  if (blocks.length === 0) {
    blocks.push({
      label: "General",
      text: "Follow your product label. Ask your clinician about interactions with prescriptions and other supplements.",
    })
  }
  return blocks
}
