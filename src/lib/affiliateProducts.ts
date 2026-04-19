/**
 * Curated Amazon affiliate product recommendations for the Clarion Core Biomarker Set.
 * Product selection is based on form, dosage, brand trust, and practical fit for the biomarker pathway.
 *
 * **Associates tag:** Set `NEXT_PUBLIC_AMAZON_ASSOCIATES_TAG` (e.g. `yoursite-20`) in `.env` / Vercel
 * so all generated Amazon links and tag rewrites use your store ID. Falls back to `clarionlabs-20` if unset.
 */

import { resolveActionPlanDbKey } from "./biomarkerAliases"
import { coreBiomarkerProtocols, getCoreProtocol, CLARION_CORE_BIOMARKERS } from "./coreBiomarkerProtocols"
import { shouldSkipSupplementForHighMarker } from "./supplements"

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

const FALLBACK_AMAZON_ASSOCIATES_TAG = "clarionlabs-20"

/**
 * Amazon Associates tracking ID (e.g. `mystore-20`). Used for every `/dp/` and search link we build,
 * and when rewriting user-saved Amazon URLs for reorder CTAs.
 */
export function getAmazonAssociatesTag(): string {
  if (typeof process !== "undefined") {
    const t = (process.env.NEXT_PUBLIC_AMAZON_ASSOCIATES_TAG ?? "").trim()
    if (t) return t
  }
  return FALLBACK_AMAZON_ASSOCIATES_TAG
}

function isAmazonRetailHostname(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === "amazon.com" || h.endsWith(".amazon.com")) return true
  const tlds = ["co.uk", "de", "fr", "ca", "in", "es", "it", "com.au", "co.jp", "com.mx", "nl", "se", "pl", "com.be", "com.tr"]
  for (const t of tlds) {
    if (h === `amazon.${t}` || h.endsWith(`.amazon.${t}`)) return true
  }
  return false
}

/**
 * Ensures `tag` on Amazon retail URLs matches {@link getAmazonAssociatesTag} (sets or replaces).
 * Non-Amazon URLs and short links (`amzn.to`, etc.) are returned unchanged.
 */
export function applyAmazonAssociatesTag(url: string): string {
  const trimmed = url.trim()
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return trimmed
  let u: URL
  try {
    u = new URL(trimmed)
  } catch {
    return trimmed
  }
  if (!isAmazonRetailHostname(u.hostname)) return trimmed
  u.searchParams.set("tag", getAmazonAssociatesTag())
  return u.toString()
}

const baseUrl = (asin: string) =>
  `https://www.amazon.com/dp/${encodeURIComponent(asin)}?tag=${encodeURIComponent(getAmazonAssociatesTag())}`

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

export type AffiliateProductsOptions = {
  /** When the lab is high, omit “take more” supplement SKUs for repletion nutrients (D, B12, iron, etc.). */
  status?: string
}

/** Get affiliate product options for a biomarker. optionTypes filter (cheapest, premium, overall_winner, lifestyle_tool). */
export function getAffiliateProductsForBiomarker(
  biomarker: string,
  optionTypes?: AffiliateOptionType[],
  opts?: AffiliateProductsOptions
): AffiliateProduct[] {
  const list =
    affiliateProductsByBiomarker[biomarker] ??
    affiliateProductsByBiomarker[biomarker.trim()] ??
    []
  const status = (opts?.status ?? "").toLowerCase()
  const dbKey = resolveActionPlanDbKey(biomarker.trim())
  if (status === "high" && shouldSkipSupplementForHighMarker(dbKey, "high")) {
    const tools = list.filter((p) => p.category === "lifestyle_tool")
    if (!optionTypes?.length) return tools
    return tools.filter((p) => optionTypes.includes(p.optionType))
  }
  if (!optionTypes?.length) return list
  return list.filter((p) => optionTypes.includes(p.optionType))
}

/** Get the core protocol for a biomarker (foods, lifestyle, suggested protocol, warnings). */
export { getCoreProtocol, coreBiomarkerProtocols, CLARION_CORE_BIOMARKERS }
export type { CoreBiomarkerProtocol } from "./coreBiomarkerProtocols"
