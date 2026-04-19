import type { SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"
import type { BiomarkerResult } from "@/src/lib/analyzeBiomarkers"
import { resolveBiomarkerForStackItem } from "@/src/lib/stackAffiliate"
import { resolveMarkerKey, shouldSkipSupplementForHighMarker } from "@/src/lib/supplements"

export type StackProductFit = "aligned" | "suboptimal" | "unknown"

/** Drives chip color — avoids calling optimal labs “unclear”. */
export type StackProductFitChipTone = "aligned" | "suboptimal" | "in_range" | "needs_context" | "unmapped"

export type StackProductFitResult = {
  fit: StackProductFit
  rationale: string
  /** Short chip text on the protocol card (full rationale in popover). */
  chipLabel: string
  chipTone: StackProductFitChipTone
}

/**
 * Rule-based educational fit: not medical advice. Uses latest analyzed labs + inferred marker.
 */
export function computeStackProductFit(
  supplementName: string,
  markerFromResolve: string | null | undefined,
  analysisResults: BiomarkerResult[]
): StackProductFitResult {
  const row: SavedSupplementStackItem = {
    supplementName: supplementName.trim(),
    dose: "",
    monthlyCost: 0,
    recommendationType: "Context-dependent",
    reason: "From what you take today.",
    ...(markerFromResolve?.trim() ? { marker: markerFromResolve.trim() } : {}),
  }

  const bio = resolveBiomarkerForStackItem(row)
  const matchedKey = bio ? resolveMarkerKey(bio) : null

  if (!matchedKey || analysisResults.length === 0) {
    return {
      fit: "unknown",
      chipTone: "unmapped",
      chipLabel: "Can’t compare yet",
      rationale:
        "We couldn’t match this to a lab marker on file, or labs aren’t loaded yet. Add bloodwork for a personalized fit check — and always confirm changes with your clinician.",
    }
  }

  const labRow = analysisResults.find((a) => resolveMarkerKey(a.name) === matchedKey)
  if (!labRow) {
    return {
      fit: "unknown",
      chipTone: "unmapped",
      chipLabel: "Marker not on panel",
      rationale: `We inferred “${matchedKey}” from this product, but that marker isn’t in your latest panel. Discuss with your clinician.`,
    }
  }

  const st = (labRow.status || "").toLowerCase()
  const label = labRow.name || matchedKey

  if (st === "high") {
    if (matchedKey === "Ferritin") {
      return {
        fit: "suboptimal",
        chipTone: "suboptimal",
        chipLabel: "Review suggested",
        rationale:
          "Your iron/ferritin-related labs are high — routine iron supplementation may not be appropriate without clinician guidance.",
      }
    }
    if (matchedKey === "Testosterone") {
      return {
        fit: "suboptimal",
        chipTone: "suboptimal",
        chipLabel: "Review suggested",
        rationale:
          "Your testosterone is high — adding typical ‘support’ supplements for this marker may not fit without clinician input.",
      }
    }
    if (shouldSkipSupplementForHighMarker(matchedKey, labRow.status)) {
      return {
        fit: "suboptimal",
        chipTone: "suboptimal",
        chipLabel: "Review suggested",
        rationale: `Your ${label} is high — taking more of this nutrient orally may not be appropriate; your clinician should advise.`,
      }
    }
    return {
      fit: "unknown",
      chipTone: "needs_context",
      chipLabel: "Ask your clinician",
      rationale: `Your ${label} is high — whether this product is appropriate depends on your full context; ask your clinician.`,
    }
  }

  if (st === "deficient" || st === "suboptimal" || st === "low") {
    return {
      fit: "aligned",
      chipTone: "aligned",
      chipLabel: "Supports your labs",
      rationale: `Your ${label} looks below optimal — this category of supplement may align with what your labs suggest (confirm dosing with your clinician).`,
    }
  }

  if (st === "optimal") {
    return {
      fit: "unknown",
      chipTone: "in_range",
      chipLabel: "Labs in range",
      rationale: `Your ${label} is in range — continuing may be reasonable for maintenance; still confirm product choice and dose with your clinician.`,
    }
  }

  return {
    fit: "unknown",
    chipTone: "needs_context",
    chipLabel: "Ask your clinician",
    rationale: "Review lab trends and product choice with your clinician for personalized guidance.",
  }
}
