/**
 * Educational dosing targets (IU/day, etc.) for matching retail SKUs to lab bands.
 * Not medical advice — copy elsewhere should defer to a clinician.
 */

export type VitaminDBand = "deficient" | "suboptimal" | "high" | "maintenance"

export type VitaminDProductLike = {
  id: string
  brand: string
  productName: string
  form: string
  price: number
  unitsPerBottle: number
  amountPerUnit: number
  activeUnit: string
  costPerUnitActive: number
  servingsPerWeek?: number
}

/** Map analysis status to band for vitamin D supplement logic. */
export function vitaminDBandFromStatus(status?: string): VitaminDBand {
  const s = (status || "").toLowerCase()
  if (s === "high") return "high"
  if (s === "deficient") return "deficient"
  if (s === "suboptimal" || s === "low") return "suboptimal"
  return "maintenance"
}

/** General 25-OH Vitamin D (ng/mL) bands aligned with biomarkerDatabase.ranges.general. */
export function vitaminDBandFromNgMl(valueNgMl: number): VitaminDBand {
  if (valueNgMl >= 150) return "high"
  if (valueNgMl < 20) return "deficient"
  if (valueNgMl < 30) return "suboptimal"
  return "maintenance"
}

export function mergeVitaminDBands(a: VitaminDBand, b: VitaminDBand): VitaminDBand {
  if (a === "high" || b === "high") return "high"
  if (a === "deficient" || b === "deficient") return "deficient"
  if (a === "suboptimal" || b === "suboptimal") return "suboptimal"
  return "maintenance"
}

/** Combine status-based band with optional lab value (ng/mL) when both are present. */
export function resolveVitaminDBand(status?: string, valueNgMl?: number): VitaminDBand {
  const fromStatus = vitaminDBandFromStatus(status)
  if (valueNgMl == null || !Number.isFinite(valueNgMl)) return fromStatus
  return mergeVitaminDBands(fromStatus, vitaminDBandFromNgMl(valueNgMl))
}

/**
 * Typical discussion-range target IU/day by band (education only).
 * Used to pick a product whose *effective* daily IU is close to this target.
 *
 * All values sit at or below the 4,000 IU/day (100 mcg) adult Tolerable Upper Intake Level
 * (IOM 2010 / NIH Office of Dietary Supplements). Higher short-term "loading" doses are
 * a clinician decision and are intentionally not automated here.
 */
export function targetVitaminDIuPerDay(band: VitaminDBand): number {
  switch (band) {
    case "deficient":
      return 3000
    case "suboptimal":
      return 2000
    case "maintenance":
      return 1000
    case "high":
      return 0
    default:
      return 2000
  }
}

/** Effective IU per calendar day (handles weekly dosing via servingsPerWeek). */
export function effectiveVitaminDIuPerDay(product: VitaminDProductLike): number {
  if (product.activeUnit !== "IU") return 0
  const perWeek = product.servingsPerWeek ?? 7
  return product.amountPerUnit * (perWeek / 7)
}

/**
 * Belt-and-suspenders deny-set for SKU ids that must never reach an automated recommendation,
 * regardless of band or filter bug. Currently a no-op (the listed SKUs have been removed from
 * the product catalog) but kept as a defensive guard against future catalog edits.
 */
const ID_EXCLUDE_ALWAYS = new Set(["vitd_now_50000_50", "vitd_now_10000_240"])

/**
 * Remove inappropriate SKUs before ranking.
 *
 * Anchored on the 4,000 IU/day (100 mcg) adult Tolerable Upper Intake Level
 * (IOM 2010 / NIH Office of Dietary Supplements):
 *  - Always drop the 50,000 IU and 10,000 IU daily softgels from automated picks — those
 *    are clinician-directed repletion doses, not consumer recommendations.
 *  - Deficient: allow daily SKUs up to 4,000 IU/unit (at the UL) OR once/twice-weekly SKUs
 *    whose averaged daily dose stays at or below 4,000 IU/day.
 *  - Suboptimal / maintenance: cap effective daily IU at 2,000 to stay well under the UL.
 *  - High: return none — do not supplement.
 */
export function filterVitaminDCatalog(
  products: VitaminDProductLike[],
  band: VitaminDBand
): VitaminDProductLike[] {
  if (band === "high") return []

  const list = products.filter((p) => !ID_EXCLUDE_ALWAYS.has(p.id))

  if (band === "deficient") {
    return list.filter((p) => {
      if (p.activeUnit !== "IU") return false
      const daily = effectiveVitaminDIuPerDay(p)
      // Daily SKU capped at the 4,000 IU/day UL.
      if ((p.servingsPerWeek ?? 7) >= 7 && p.amountPerUnit <= 4_000 && daily <= 4_000) return true
      // Weekly / twice-weekly repletion SKU: averaged daily dose must stay ≤ UL, single capsule ≤ 30,000 IU.
      if ((p.servingsPerWeek ?? 7) <= 2 && p.amountPerUnit <= 30_000 && daily <= 4_000) return true
      return false
    })
  }

  return list.filter((p) => {
    if (p.activeUnit !== "IU") return false
    const daily = effectiveVitaminDIuPerDay(p)
    return daily <= 2000 && p.amountPerUnit <= 2000
  })
}

function monthlyCostEstimate(product: VitaminDProductLike): number {
  const perWeek = product.servingsPerWeek ?? 7
  const unitsPerDay = perWeek / 7
  return Number((((product.price / product.unitsPerBottle) * 30) * unitsPerDay).toFixed(2))
}

/**
 * Pick product closest to target IU/day; tie-break with lower monthly cost.
 */
export function pickVitaminDProductByTarget(
  products: VitaminDProductLike[],
  targetIuPerDay: number
): VitaminDProductLike | null {
  if (products.length === 0) return null
  const scored = products.map((p) => {
    const eff = effectiveVitaminDIuPerDay(p)
    const dist = Math.abs(eff - targetIuPerDay)
    const cost = monthlyCostEstimate(p)
    return { p, dist, cost }
  })
  scored.sort((a, b) => a.dist - b.dist || a.cost - b.cost)
  return scored[0].p
}

/** User-facing title: avoid raw "50,000 IU" as the only headline and reference the adult UL. */
export function vitaminDRecommendationDisplayName(
  product: VitaminDProductLike,
  targetIuPerDay: number
): string {
  const eff = Math.round(effectiveVitaminDIuPerDay(product))
  const target = Math.round(targetIuPerDay)
  return `Vitamin D3 — ~${eff} IU/day (example: ${product.brand}; discuss ~${target} IU/day with your clinician — adult UL 4,000 IU/day)`
}
