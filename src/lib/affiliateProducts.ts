/**
 * Curated Amazon affiliate product recommendations for the Clarion Core Biomarker Set.
 * Product selection is based on form, dosage, brand trust, and practical fit for the biomarker pathway.
 * Replace AFFILIATE_TAG with your Amazon Associates tag (e.g. clarionlabs-20).
 */

import { coreBiomarkerProtocols, getCoreProtocol, CLARION_CORE_BIOMARKERS } from "./coreBiomarkerProtocols"

export type AffiliateOptionType = "cheapest" | "premium" | "overall_winner" | "best_value" | "diet" | "lifestyle_tool"

export type AffiliateProduct = {
  id: string
  category: "supplement" | "food" | "lifestyle_tool"
  biomarker: string
  title: string
  subtitle: string
  description: string
  monthlyCostEstimate?: number
  whyRecommended: string
  affiliateUrl: string
  optionType: AffiliateOptionType
  dosageOrUse?: string
  evidenceNote?: string
  /** Optional product image (e.g. from Amazon ASIN). */
  imageUrl?: string
}

/** Replace with your Amazon Associates tag (e.g. yourtag-20). Links use ?tag=YOURTAG-20 */
export const AFFILIATE_TAG = "clarionlabs-20"

const baseUrl = (asin: string) =>
  `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`

const imageUrlFromAsin = (asin: string) =>
  `https://m.media-amazon.com/images/P/${asin}._SL160_.jpg`

export const AFFILIATE_DISCLOSURE =
  "Clarion may earn a commission from qualifying purchases made through affiliate links. Product selection is based on form, dosage, brand trust, and practical fit for the biomarker pathway."

/** Stack / leaderboard monthly estimates — prices are static snapshots; dosing varies by product. */
export const MONTHLY_COST_DISCLAIMER =
  "Monthly costs are approximate: they use listed bottle prices and typical serving frequency (e.g. daily or weekly for some vitamin D products). Check the label and current retailer prices."

function buildAffiliateProductsFromCore(): Record<string, AffiliateProduct[]> {
  const out: Record<string, AffiliateProduct[]> = {}
  for (const [key, protocol] of Object.entries(coreBiomarkerProtocols)) {
    const list: AffiliateProduct[] = []
    const { products, lifestyleTools, suggestedProtocol } = protocol

    list.push({
      id: `${key}-cheapest`,
      category: "supplement",
      biomarker: key,
      title: products.cheapest.productName,
      subtitle: products.cheapest.label,
      description: "",
      whyRecommended: products.cheapest.why,
      affiliateUrl: baseUrl(products.cheapest.asin),
      optionType: "cheapest",
      dosageOrUse: suggestedProtocol?.slice(0, 120) + (suggestedProtocol && suggestedProtocol.length > 120 ? "…" : ""),
      imageUrl: imageUrlFromAsin(products.cheapest.asin),
    })
    list.push({
      id: `${key}-premium`,
      category: "supplement",
      biomarker: key,
      title: products.premium.productName,
      subtitle: products.premium.label,
      description: "",
      whyRecommended: products.premium.why,
      affiliateUrl: baseUrl(products.premium.asin),
      optionType: "premium",
      dosageOrUse: suggestedProtocol?.slice(0, 120) + (suggestedProtocol && suggestedProtocol.length > 120 ? "…" : ""),
      imageUrl: imageUrlFromAsin(products.premium.asin),
    })
    list.push({
      id: `${key}-overall`,
      category: "supplement",
      biomarker: key,
      title: products.overallWinner.productName,
      subtitle: products.overallWinner.label,
      description: "",
      whyRecommended: products.overallWinner.why,
      affiliateUrl: baseUrl(products.overallWinner.asin),
      optionType: "overall_winner",
      dosageOrUse: suggestedProtocol?.slice(0, 120) + (suggestedProtocol && suggestedProtocol.length > 120 ? "…" : ""),
      imageUrl: imageUrlFromAsin(products.overallWinner.asin),
    })

    if (protocol.lifestyleTools?.length) {
      protocol.lifestyleTools.forEach((t, i) => {
        list.push({
          id: `${key}-tool-${i}`,
          category: "lifestyle_tool",
          biomarker: key,
          title: t.name,
          subtitle: "Lifestyle / diet tool",
          description: t.why,
          whyRecommended: t.why,
          affiliateUrl: baseUrl(t.asin),
          optionType: "lifestyle_tool",
          imageUrl: imageUrlFromAsin(t.asin),
        })
      })
    }

    out[key] = list
    // Also map common aliases so "Vitamin D" and "Glucose" resolve
    if (key === "25-OH Vitamin D") out["Vitamin D"] = list
    if (key === "Fasting Glucose") out["Glucose"] = list
  }
  return out
}

export const affiliateProductsByBiomarker: Record<string, AffiliateProduct[]> =
  buildAffiliateProductsFromCore()

/** Get affiliate product options for a biomarker. optionTypes filter (cheapest, premium, overall_winner, lifestyle_tool). */
export function getAffiliateProductsForBiomarker(
  biomarker: string,
  optionTypes?: AffiliateOptionType[]
): AffiliateProduct[] {
  const protocol = getCoreProtocol(biomarker)
  const list =
    affiliateProductsByBiomarker[biomarker] ??
    affiliateProductsByBiomarker[biomarker.trim()] ??
    []
  if (!optionTypes?.length) return list
  return list.filter((p) => optionTypes.includes(p.optionType))
}

/** Get the core protocol for a biomarker (foods, lifestyle, suggested protocol, warnings). */
export { getCoreProtocol, coreBiomarkerProtocols, CLARION_CORE_BIOMARKERS }
export type { CoreBiomarkerProtocol } from "./coreBiomarkerProtocols"
