import { describe, it, expect } from "vitest"
import { optimizeStack } from "./stackOptimizer"
import { supplementRecommendations } from "./supplements"

describe("optimizeStack", () => {
  it("dedupes by supplement key and sums cheapest monthly cost", () => {
    const recs = supplementRecommendations([
      { name: "Vitamin D", status: "deficient" },
      { name: "Magnesium", status: "deficient" },
    ])
    const out = optimizeStack(recs)
    expect(out.totalUniqueSupplements).toBe(recs.length)
    expect(out.totalMonthlyCost).toBeGreaterThan(0)
    expect(out.stack).toHaveLength(2)
  })
})
