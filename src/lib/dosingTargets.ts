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
  if (valueNgMl >= 80) return "high"
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
 */
export function targetVitaminDIuPerDay(band: VitaminDBand): number {
  switch (band) {
    case "deficient":
      return 4000
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

const ID_EXCLUDE_ALWAYS = new Set(["vitd_now_50000_50"])

/**
 * Remove inappropriate SKUs (mega-dose daily softgels) before ranking.
 * - Always drop 50,000 IU daily-style SKU from automated picks.
 * - Deficient: allow up to 10,000 IU/unit daily, or weekly repletion (e.g. 25k 1x/week).
 * - Suboptimal/maintenance: cap effective daily IU at 5,000.
 */
export function filterVitaminDCatalog(
  products: VitaminDProductLike[],
  band: VitaminDBand
): VitaminDProductLike[] {
  if (band === "high") return []

  let list = products.filter((p) => !ID_EXCLUDE_ALWAYS.has(p.id))

  if (band === "deficient") {
    return list.filter((p) => {
      if (p.activeUnit !== "IU") return false
      const daily = effectiveVitaminDIuPerDay(p)
      if (p.amountPerUnit <= 10_000 && daily <= 10_000) return true
      if ((p.servingsPerWeek ?? 7) <= 2 && p.amountPerUnit <= 30_000) return true
      return false
    })
  }

  return list.filter((p) => {
    if (p.activeUnit !== "IU") return false
    const daily = effectiveVitaminDIuPerDay(p)
    return daily <= 5000 && p.amountPerUnit <= 5000
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

/** User-facing title: avoid raw “50,000 IU” as the only headline. */
export function vitaminDRecommendationDisplayName(
  product: VitaminDProductLike,
  targetIuPerDay: number
): string {
  const eff = Math.round(effectiveVitaminDIuPerDay(product))
  const target = Math.round(targetIuPerDay)
  return `Vitamin D3 — ~${eff} IU/day (example: ${product.brand}; discuss ~${target} IU/day with your clinician)`
}
