/**
 * Maps saved stack items (supplement name / recommendationType) to biomarker and affiliate product URL.
 * Used for "Reorder on Amazon" on the dashboard and full stack view.
 */

import type { SavedSupplementStackItem } from "./bloodwiseDb"
import {
  getAffiliateProductsForBiomarker,
  AFFILIATE_TAG,
  type AffiliateProduct,
} from "./affiliateProducts"

/** Normalize text for matching: lowercase, collapse spaces/hyphens/underscores. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim().replace(/-/g, " ").replace(/_/g, " ")
}

/**
 * Infer biomarker from supplement name when marker is not stored on the stack item.
 * Uses keyword matching; order matters (more specific first).
 */
function inferBiomarkerFromSupplementName(supplementName: string): string | null {
  const n = normalize(supplementName)
  if (!n) return null
  // Ferritin / iron
  if (/\b(iron|ferritin|ferrous|bisglycinate)\b/.test(n) && !/\b(transferrin)\b/.test(n)) return "Ferritin"
  // Vitamin D
  if (/\b(vitamin\s*d|d3|cholecalciferol)\b/.test(n)) return "Vitamin D"
  // B12
  if (/\b(b12|b-12|cobalamin|methyl.*b\s*12|cyanocobalamin)\b/.test(n)) return "Vitamin B12"
  // Folate
  if (/\b(folate|folic|methylfolate|5-mthf|5mthf|methyl.*folate)\b/.test(n)) return "Folate"
  // Magnesium
  if (/\b(magnesium|glycinate|citrate|threonate)\b/.test(n)) return "Magnesium"
  // Omega / lipids
  if (/\b(omega|fish\s*oil|epa|dha|fish oil)\b/.test(n)) return "Triglycerides"
  // CRP / inflammation
  if (/\b(crp|curcumin|turmeric)\b/.test(n)) return "hs-CRP"
  // Glucose / metabolic
  if (/\b(berberine|glucose|blood\s*sugar)\b/.test(n)) return "Glucose"
  return null
}

/**
 * Resolve biomarker for a stack item: use stored marker first, then infer from supplement name.
 */
function resolveBiomarkerForStackItem(item: SavedSupplementStackItem): string | null {
  const stored = item.marker?.trim()
  if (stored) {
    // Normalize to a key we have products for
    const lower = stored.toLowerCase()
    if (lower.includes("ferritin") || lower === "iron") return "Ferritin"
    if (lower.includes("vitamin d") || lower.includes("25-oh")) return "Vitamin D"
    if (lower.includes("b12") || lower.includes("b-12")) return "Vitamin B12"
    if (lower.includes("folate")) return "Folate"
    if (lower.includes("magnesium")) return "Magnesium"
    if (lower.includes("glucose") || lower.includes("hbA1c") || lower.includes("hba1c")) return "Glucose"
    if (lower.includes("ldl") || lower.includes("cholesterol")) return "LDL-C"
    if (lower.includes("triglyceride") || lower.includes("omega")) return "Triglycerides"
    if (lower.includes("crp") || lower.includes("hs-crp")) return "hs-CRP"
    return stored
  }
  return inferBiomarkerFromSupplementName(item.supplementName)
}

/**
 * Get the best affiliate product for a stack item (overall_winner preferred).
 * Returns null if no product is found for the inferred biomarker.
 */
export function getAffiliateProductForStackItem(
  item: SavedSupplementStackItem
): AffiliateProduct | null {
  const biomarker = resolveBiomarkerForStackItem(item)
  if (!biomarker) return null
  const options = getAffiliateProductsForBiomarker(biomarker, [
    "overall_winner",
    "premium",
    "cheapest",
  ])
  return options[0] ?? null
}

/**
 * Fallback: Amazon search URL with supplement name and affiliate tag.
 * Use when getAffiliateProductForStackItem returns null.
 */
export function getAmazonSearchUrl(supplementName: string): string {
  const query = encodeURIComponent(`${supplementName} supplement`)
  return `https://www.amazon.com/s?k=${query}&tag=${AFFILIATE_TAG}`
}
