type ActiveUnit = "mg" | "mcg" | "IU"

type SupplementProduct = {
  id: string
  brand: string
  productName: string
  form: string
  price: number
  unitsPerBottle: number
  amountPerUnit: number
  activeUnit: ActiveUnit
  costPerUnitActive: number
  costPer1000IU?: number
  notes?: string
  assumptions?: string[]
  caution?: string[]
}

type SupplementLeaderboardEntry = SupplementProduct & {
  rankByValue: number
  rankByPotency: number
}

type SupplementRecommendation = {
  name: string
  brand: string
  marker: string
  supplementKey: string
  dose: string
  status?: string
  bestValue: SupplementLeaderboardEntry
  highestPotency: SupplementLeaderboardEntry
  leaderboard: SupplementLeaderboardEntry[]
  estimatedMonthlyCost: number
}

type OptimizedStackItem = SupplementRecommendation & {
  duplicateMarkersMerged?: string[]
}

type OptimizedStackResult = {
  stack: OptimizedStackItem[]
  totalMonthlyCost: number
  totalUniqueSupplements: number
  savingsVsHighestPotency: number
  cheapestPlanMonthlyCost: number
  highestPotencyPlanMonthlyCost: number
}

function round2(value: number) {
  return Number(value.toFixed(2))
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, "").replace(/_/g, "").replace(/-/g, "")
}

function estimateMonthlyCostForProduct(
  product: SupplementProduct,
  unitsPerDay = 1
) {
  return round2(((product.price / product.unitsPerBottle) * 30) * unitsPerDay)
}

function dedupeBySupplementKey(
  recommendations: SupplementRecommendation[]
): OptimizedStackItem[] {
  const grouped = new Map<string, SupplementRecommendation[]>()

  for (const rec of recommendations) {
    const key = normalize(rec.supplementKey)
    const existing = grouped.get(key) || []
    existing.push(rec)
    grouped.set(key, existing)
  }

  const merged: OptimizedStackItem[] = []

  for (const [, group] of grouped) {
    const sorted = [...group].sort(
      (a, b) => a.estimatedMonthlyCost - b.estimatedMonthlyCost
    )

    const base = sorted[0]

    merged.push({
      ...base,
      duplicateMarkersMerged: group.map((g) => g.marker),
    })
  }

  return merged
}

function calculateCheapestPlanMonthlyCost(stack: OptimizedStackItem[]) {
  return round2(
    stack.reduce((sum, item) => sum + item.estimatedMonthlyCost, 0)
  )
}

function calculateHighestPotencyPlanMonthlyCost(stack: OptimizedStackItem[]) {
  return round2(
    stack.reduce((sum, item) => {
      return sum + estimateMonthlyCostForProduct(item.highestPotency)
    }, 0)
  )
}

export function optimizeStack(
  recommendations: SupplementRecommendation[] = []
): OptimizedStackResult {
  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return {
      stack: [],
      totalMonthlyCost: 0,
      totalUniqueSupplements: 0,
      savingsVsHighestPotency: 0,
      cheapestPlanMonthlyCost: 0,
      highestPotencyPlanMonthlyCost: 0,
    }
  }

  const dedupedStack = dedupeBySupplementKey(recommendations)

  const cheapestPlanMonthlyCost =
    calculateCheapestPlanMonthlyCost(dedupedStack)

  const highestPotencyPlanMonthlyCost =
    calculateHighestPotencyPlanMonthlyCost(dedupedStack)

  const savingsVsHighestPotency = round2(
    highestPotencyPlanMonthlyCost - cheapestPlanMonthlyCost
  )

  return {
    stack: dedupedStack,
    totalMonthlyCost: cheapestPlanMonthlyCost,
    totalUniqueSupplements: dedupedStack.length,
    savingsVsHighestPotency,
    cheapestPlanMonthlyCost,
    highestPotencyPlanMonthlyCost,
  }
}