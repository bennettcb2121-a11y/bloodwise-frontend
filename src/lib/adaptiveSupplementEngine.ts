/**
 * Adaptive supplement selection: combines lab context, cost efficiency, form/diet preferences,
 * and shopping intent (save money vs quality-first). Education and decision support only — not medical advice.
 */

export type BudgetMode = "maximize_value" | "balanced" | "quality_first"

/** Per-SKU metadata for ranking and filtering (maintain alongside supplementDatabase in supplements.ts). */
export type SupplementAdaptiveMeta = {
  /** 1 = economy / strongest $ per active unit, 2 = mainstream, 3 = premium / often third-party tested */
  qualityTier: 1 | 2 | 3
  /** Typical shelf positioning */
  priceTier: "budget" | "mid" | "premium"
  /** True when product is typically suitable for vegans (no animal gelatin; verify label). */
  veganFriendly?: boolean
  /** Common softgel fish oil / gelatin caps */
  animalGelatin?: boolean
}

export type AdaptiveSupplementContext = {
  budgetMode: BudgetMode
  /** Profile diet_preference: e.g. vegan, vegetarian, omnivore */
  dietPreference?: string | null
  supplementFormPreference?: "any" | "no_pills"
}

export type ProfileAdaptiveInput = {
  shopping_preference?: string | null
  diet_preference?: string | null
  supplement_form_preference?: string | null
  improvement_preference?: string | null
}

function servingsPerDayFromProduct(p: { servingsPerWeek?: number }): number {
  return (p.servingsPerWeek ?? 7) / 7
}

/** Monthly cost estimate aligned with supplements.ts estimateMonthlyCost */
export function estimateMonthlyCostAdaptive(p: {
  price: number
  unitsPerBottle: number
  servingsPerWeek?: number
}): number {
  const unitsPerDay = servingsPerDayFromProduct(p)
  return Number((((p.price / p.unitsPerBottle) * 30) * unitsPerDay).toFixed(2))
}

/**
 * Map saved shopping preference + improvement hint to engine budget mode.
 */
export function inferBudgetModeFromProfile(profile: ProfileAdaptiveInput): BudgetMode {
  const sp = (profile.shopping_preference || "").toLowerCase()
  const imp = (profile.improvement_preference || "").toLowerCase()

  if (
    sp.includes("premium") ||
    sp.includes("best quality") ||
    sp.includes("top tier") ||
    imp.includes("quality") ||
    imp.includes("premium")
  ) {
    return "quality_first"
  }
  if (
    sp.includes("value") ||
    sp.includes("budget") ||
    sp.includes("cheap") ||
    sp.includes("lowest") ||
    sp.includes("save") ||
    sp.includes("cost")
  ) {
    return "maximize_value"
  }
  return "balanced"
}

function isVeganDiet(diet: string | null | undefined): boolean {
  if (!diet) return false
  const d = diet.toLowerCase()
  return d.includes("vegan")
}

function isVegetarianDiet(diet: string | null | undefined): boolean {
  if (!diet) return false
  const d = diet.toLowerCase()
  return d.includes("vegetarian") || d.includes("vegan")
}

/**
 * Drop SKUs incompatible with strict plant-based preferences when alternatives exist.
 */
export function filterByDietPreference<T extends { adaptive?: SupplementAdaptiveMeta }>(
  products: T[],
  dietPreference: string | null | undefined
): T[] {
  if (!isVegetarianDiet(dietPreference)) return products

  const vegan = isVeganDiet(dietPreference)
  const compatible = products.filter((p) => {
    const m = p.adaptive
    if (!m) return true
    if (vegan) {
      if (m.animalGelatin) return m.veganFriendly === true
      return m.veganFriendly !== false
    }
    /* vegetarian: exclude obvious gelatin when marked */
    if (m.animalGelatin && m.veganFriendly === false) return false
    return true
  })

  return compatible.length > 0 ? compatible : products
}

/**
 * Higher score = better fit for this context.
 */
export function adaptiveCompositeScore(
  p: {
    price: number
    unitsPerBottle: number
    servingsPerWeek?: number
    costPerUnitActive: number
    costPer1000IU?: number
    adaptive?: SupplementAdaptiveMeta
  },
  ctx: AdaptiveSupplementContext
): number {
  const monthly = estimateMonthlyCostAdaptive(p)
  const q = p.adaptive?.qualityTier ?? 2
  const priceTier = p.adaptive?.priceTier ?? "mid"
  const ptIdx = priceTier === "budget" ? 0 : priceTier === "mid" ? 1 : 2

  const costEff =
    p.costPer1000IU != null
      ? 1 / (p.costPer1000IU + 1e-9)
      : 1 / (p.costPerUnitActive + 1e-12)

  switch (ctx.budgetMode) {
    case "maximize_value":
      return costEff * 100 + monthly * -0.15 + (4 - q) * 0.2
    case "quality_first":
      // Quality and shelf tier drive the pick; cost efficiency must not swamp tier (cheap SKUs often win on $/mg alone).
      return (
        q * 100 +
        (3 - ptIdx) * 45 +
        Math.log1p(costEff) * 3 +
        monthly * -0.03
      )
    case "balanced":
    default:
      return costEff * 45 + q * 35 + (3 - ptIdx) * 12 + monthly * -0.1
  }
}

type ProductLike = {
  id: string
  price: number
  unitsPerBottle: number
  amountPerUnit: number
  activeUnit: string
  costPerUnitActive: number
  costPer1000IU?: number
  servingsPerWeek?: number
  adaptive?: SupplementAdaptiveMeta
}

/**
 * Sort candidates by adaptive score (desc). Caller passes already lab-filtered list.
 */
export function sortProductsForAdaptive<T extends ProductLike>(products: T[], ctx: AdaptiveSupplementContext): T[] {
  const filtered = filterByDietPreference(products, ctx.dietPreference)
  const list = filtered.length > 0 ? filtered : products
  return [...list].sort(
    (a, b) => adaptiveCompositeScore(b, ctx) - adaptiveCompositeScore(a, ctx)
  )
}

export function pickAdaptiveBestProduct<T extends ProductLike>(
  products: T[],
  ctx: AdaptiveSupplementContext
): T | null {
  if (!products.length) return null
  const sorted = sortProductsForAdaptive(products, ctx)
  return sorted[0] ?? null
}

export function buildAdaptiveContextFromProfile(profile: ProfileAdaptiveInput): AdaptiveSupplementContext {
  return {
    budgetMode: inferBudgetModeFromProfile(profile),
    dietPreference: profile.diet_preference ?? null,
    supplementFormPreference: profile.supplement_form_preference === "no_pills" ? "no_pills" : "any",
  }
}

/**
 * Short explanation for UI when adaptive pick differs from pure “cheapest per unit”.
 */
export function getAdaptiveRationale(
  ctx: AdaptiveSupplementContext,
  productName: string,
  monthlyCost: number
): string {
  const parts: string[] = []
  if (ctx.budgetMode === "maximize_value") {
    parts.push(`Prioritized lower ongoing cost (~$${monthlyCost.toFixed(2)}/mo est.) for ${productName}.`)
  } else if (ctx.budgetMode === "quality_first") {
    parts.push(`Prioritized trusted-form / premium-tier options for ${productName} per your shopping preferences.`)
  } else {
    parts.push(`Balanced cost and quality for ${productName} (~$${monthlyCost.toFixed(2)}/mo est.).`)
  }
  if (isVeganDiet(ctx.dietPreference)) {
    parts.push("Filtered to plant-compatible forms where labeled in our catalog.")
  } else if (isVegetarianDiet(ctx.dietPreference)) {
    parts.push("Avoided obvious animal-gelatin forms where alternatives exist in our catalog.")
  }
  return parts.join(" ")
}
