/**
 * Lab-aware guidance for the shop.
 *
 * Given a supplement catalog entry and the user's saved bloodwork + profile,
 * pick the right "do I actually need this?" message. Pure function — no I/O.
 */

import { analyzeBiomarkers, type BiomarkerResult } from "./analyzeBiomarkers"
import type { LabAwarenessStatus, SupplementShopEntry } from "./supplementShopCatalog"

type BloodworkInput = Record<string, string | number>
type ProfileLike = Parameters<typeof analyzeBiomarkers>[1]

/**
 * Compute the lab-awareness status for one supplement entry.
 *
 * Rules:
 *   - No entry.labAwareness.biomarker → always "unknown" (returns the generic note).
 *     This is how we handle supplements that don't have a lab backbone
 *     (e.g. creatine, ashwagandha, melatonin).
 *   - No biomarker_inputs or no matching value → "unknown".
 *   - Biomarker deficient or suboptimal → "priority".
 *   - Biomarker high → for supplements keyed to a nutrient level (vitamin D,
 *     ferritin, B12, folate, magnesium), treat as "optimal" — they already
 *     have enough, so don't push more. For downstream markers where "high is
 *     the problem" (LDL-C, triglycerides, HbA1c, hs-CRP), high → "priority"
 *     because the supplement is meant to *lower* the number.
 *   - Biomarker optimal → "optimal".
 */
export function computeLabAwarenessStatus(
  entry: SupplementShopEntry,
  bloodwork: BloodworkInput,
  profile: ProfileLike
): LabAwarenessStatus {
  const target = entry.labAwareness.biomarker
  if (!target) return "unknown"

  const match = findLabValue(target, entry.labAwareness.biomarkerAliases ?? [], bloodwork, profile)
  if (!match) return "unknown"

  const isDownstreamMarker = DOWNSTREAM_MARKERS_WHERE_HIGH_IS_PRIORITY.has(target)

  switch (match.status) {
    case "deficient":
    case "suboptimal":
      return "priority"
    case "high":
      return isDownstreamMarker ? "priority" : "optimal"
    case "optimal":
      return "optimal"
    case "unknown":
    default:
      return "unknown"
  }
}

/**
 * "Downstream" markers are the ones where elevated = problem, and the
 * supplement is meant to lower the number (psyllium for LDL, berberine for A1c,
 * omega-3 for triglycerides, curcumin for hs-CRP). For nutrient markers
 * (vitamin D, B12, folate, ferritin, magnesium), high = over-repleted and the
 * user should NOT take more.
 */
const DOWNSTREAM_MARKERS_WHERE_HIGH_IS_PRIORITY = new Set<string>([
  "LDL-C",
  "Triglycerides",
  "HbA1c",
  "Glucose",
  "Fasting Glucose",
  "hs-CRP",
])

/**
 * Walk the user's saved biomarker_inputs and return the first matching
 * BiomarkerResult for the target name or any provided alias. Case-insensitive,
 * space-collapsed matching — lab providers name the same marker a dozen ways.
 */
function findLabValue(
  target: string,
  aliases: string[],
  bloodwork: BloodworkInput,
  profile: ProfileLike
): BiomarkerResult | null {
  const results = analyzeBiomarkers(bloodwork, profile)
  if (results.length === 0) return null

  const candidates = [target, ...aliases].map(normalizeKey)
  return (
    results.find((r) => candidates.includes(normalizeKey(r.name))) ??
    // Some lab providers label with units embedded ("25-OH Vitamin D (ng/mL)");
    // fall back to a "starts-with" pass before giving up.
    results.find((r) => {
      const rn = normalizeKey(r.name)
      return candidates.some((c) => rn.startsWith(c))
    }) ??
    null
  )
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ")
}
