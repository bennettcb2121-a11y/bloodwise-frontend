import { describe, it, expect } from "vitest"
import { supplementRecommendations, supplementDatabase, estimateMonthlyCost } from "./supplements"

describe("supplementRecommendations", () => {
  it("does not recommend products for high testosterone", () => {
    const recs = supplementRecommendations([{ name: "Testosterone", status: "high" }])
    expect(recs).toHaveLength(0)
  })

  it("does not recommend iron when ferritin is high", () => {
    const recs = supplementRecommendations([{ name: "Ferritin", status: "high" }])
    expect(recs).toHaveLength(0)
  })

  it("recommends iron when ferritin is deficient", () => {
    const recs = supplementRecommendations([{ name: "Ferritin", status: "deficient" }])
    expect(recs.length).toBeGreaterThan(0)
    expect(recs[0].marker).toBe("Ferritin")
  })

  it("does not pick 50,000 IU vitamin D as best value for suboptimal status", () => {
    const recs = supplementRecommendations([{ name: "Vitamin D", status: "suboptimal", value: 25 }])
    const vd = recs.find((r) => r.marker === "Vitamin D")
    expect(vd).toBeDefined()
    expect(vd!.bestOverall.id).not.toBe("vitd_now_50000_50")
    expect(vd!.bestValue.id).not.toBe("vitd_now_50000_50")
    expect(vd!.name).not.toMatch(/50[,\s]?000/i)
  })

  it("allows higher-potency vitamin D SKUs when deficient but still excludes 50k daily SKU", () => {
    const recs = supplementRecommendations([{ name: "Vitamin D", status: "deficient", value: 14 }])
    const vd = recs.find((r) => r.marker === "Vitamin D")
    expect(vd).toBeDefined()
    expect(vd!.bestOverall.id).not.toBe("vitd_now_50000_50")
  })

  it("skips vitamin D supplement recommendation when status is high", () => {
    const recs = supplementRecommendations([{ name: "Vitamin D", status: "high", value: 95 }])
    expect(recs.filter((r) => r.marker === "Vitamin D")).toHaveLength(0)
  })

  it("drops duplicate magnesium from CRP picks when magnesium is its own flagged marker", () => {
    const recs = supplementRecommendations([
      { name: "CRP", status: "high" },
      { name: "Magnesium", status: "deficient" },
    ])
    const crp = recs.find((r) => r.marker === "CRP")
    expect(crp).toBeDefined()
    expect(crp!.bestOverall.id).not.toBe("mag_sv_400_250_crp")
  })

  it("weekly vitamin D SKU uses servingsPerWeek for monthly cost vs naive daily multiply", () => {
    const weekly = supplementDatabase["Vitamin D"].find((p) => p.id === "vitd_celebrate_25000_90")
    expect(weekly?.servingsPerWeek).toBe(1)
    const naiveDaily = Number((((weekly!.price / weekly!.unitsPerBottle) * 30) * 1).toFixed(2))
    const adjusted = estimateMonthlyCost(weekly!)
    expect(adjusted).toBeLessThan(naiveDaily * 0.3)
  })
})
