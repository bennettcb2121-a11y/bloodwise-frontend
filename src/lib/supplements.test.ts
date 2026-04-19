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

  it("adds vitamin C when iron is recommended and stack has no vitamin C yet", () => {
    const recs = supplementRecommendations([{ name: "Ferritin", status: "deficient" }])
    const vitC = recs.find((r) => r.marker === "Vitamin C")
    expect(vitC).toBeDefined()
    expect(vitC!.supplementKey).toBe("vitamin_c")
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

  it("never recommends more B12 when vitamin B12 status is high", () => {
    const recs = supplementRecommendations([{ name: "Vitamin B12", status: "high", value: 950 }])
    expect(recs.filter((r) => r.marker === "Vitamin B12")).toHaveLength(0)
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

  it("adds optional maintenance iron for endurance profile when ferritin is optimal but mid-range", () => {
    const recs = supplementRecommendations(
      [{ name: "Ferritin", status: "optimal", value: 57 }],
      {
        profile: {
          sport: "running",
          profile_type: null,
          health_goals: null,
          activity_level: null,
          shopping_preference: "Best value",
          diet_preference: null,
          supplement_form_preference: "any",
          improvement_preference: null,
          goal: null,
        },
      }
    )
    const iron = recs.find((r) => r.marker === "Ferritin")
    expect(iron).toBeDefined()
    expect(iron?.stackHint).toBe("maintenance")
  })

  it("does not add maintenance iron when ferritin is optimal but profile is not endurance", () => {
    const recs = supplementRecommendations(
      [{ name: "Ferritin", status: "optimal", value: 57 }],
      {
        profile: {
          sport: "general health",
          profile_type: null,
          health_goals: null,
          activity_level: null,
          shopping_preference: "Best value",
          diet_preference: null,
          supplement_form_preference: "any",
          improvement_preference: null,
          goal: null,
        },
      }
    )
    expect(recs.filter((r) => r.marker === "Ferritin")).toHaveLength(0)
  })

  it("weekly vitamin D SKU uses servingsPerWeek for monthly cost vs naive daily multiply", () => {
    const weekly = supplementDatabase["Vitamin D"].find((p) => p.id === "vitd_celebrate_25000_90")
    expect(weekly?.servingsPerWeek).toBe(1)
    const naiveDaily = Number((((weekly!.price / weekly!.unitsPerBottle) * 30) * 1).toFixed(2))
    const adjusted = estimateMonthlyCost(weekly!)
    expect(adjusted).toBeLessThan(naiveDaily * 0.3)
  })
})

/**
 * Regulatory & safety invariants. These tests lock in the Apr-2026 regulatory audit fixes
 * so a future catalog edit cannot silently reintroduce the issues. If you intentionally
 * change a UL threshold or add a clinician-only SKU, update BOTH the catalog flag and the
 * corresponding assertion below.
 */
describe("supplementDatabase — regulatory invariants (NIH ODS / IOM)", () => {
  const allSkus = Object.values(supplementDatabase).flat()

  it("no vitamin D SKU exceeds 4,000 IU/day average — consumer safety", () => {
    const vitDs = supplementDatabase["Vitamin D"] ?? []
    for (const p of vitDs) {
      const perDay = p.amountPerUnit * ((p.servingsPerWeek ?? 7) / 7)
      expect(perDay).toBeLessThanOrEqual(4_000)
    }
  })

  it("no 50,000 IU or 10,000 IU daily vitamin D SKU is in the catalog", () => {
    const ids = (supplementDatabase["Vitamin D"] ?? []).map((p) => p.id)
    expect(ids).not.toContain("vitd_now_50000_50")
    expect(ids).not.toContain("vitd_now_10000_240")
  })

  it("no zinc SKU at or above the 40 mg/day UL is in the catalog without explicit clinician gating", () => {
    const testosterone = supplementDatabase["Testosterone"] ?? []
    const zincs = testosterone.filter(
      (p) => p.activeUnit === "mg" && /zinc/i.test(p.productName)
    )
    for (const z of zincs) {
      expect(z.amountPerUnit).toBeLessThan(40)
    }
  })

  it("no magnesium SKU exceeds 400 mg/unit, and 350 mg+ SKUs flag exceedsAdultUL + caution", () => {
    const all = [
      ...(supplementDatabase["Magnesium"] ?? []),
      ...((supplementDatabase["CRP"] ?? []).filter((p) => /magnesium/i.test(p.productName))),
    ]
    for (const m of all) {
      expect(m.amountPerUnit).toBeLessThanOrEqual(400)
      if (m.amountPerUnit > 350) {
        expect(m.exceedsAdultUL).toBe(true)
        expect((m.caution ?? []).some((c) => /350 mg\/day/.test(c))).toBe(true)
      }
    }
  })

  it("every SKU that meets or exceeds an adult UL has caution[] and a pregnancyCaveat", () => {
    const overUl = allSkus.filter((p) => p.exceedsAdultUL)
    expect(overUl.length).toBeGreaterThan(0)
    for (const p of overUl) {
      expect(Array.isArray(p.caution) && p.caution.length).toBeGreaterThan(0)
      expect(typeof p.pregnancyCaveat === "string" && p.pregnancyCaveat.length).toBeGreaterThan(0)
    }
  })

  it("iron SKUs in the recommendation catalog include both interaction + pregnancy guidance", () => {
    const iron = supplementDatabase["Ferritin"] ?? []
    expect(iron.length).toBeGreaterThan(0)
    for (const p of iron) {
      expect(p.interactions && p.interactions.length).toBeGreaterThan(0)
      expect((p.interactions ?? []).some((i) => /calcium/i.test(i))).toBe(true)
      expect((p.interactions ?? []).some((i) => /levothyroxine|fluoroquinolone|tetracycline/i.test(i))).toBe(true)
      expect(p.pregnancyCaveat).toBeDefined()
    }
  })

  it("ashwagandha carries explicit pregnancy avoidance and thyroid/hepatic cautions", () => {
    const t = supplementDatabase["Testosterone"] ?? []
    const ash = t.find((p) => /ashwagandha/i.test(p.productName))
    expect(ash).toBeDefined()
    expect(ash!.pregnancyCaveat).toMatch(/do not use|avoid/i)
    expect((ash!.caution ?? []).some((c) => /liver|hepat/i.test(c))).toBe(true)
    expect((ash!.interactions ?? []).some((i) => /thyroid|levothyroxine/i.test(i))).toBe(true)
  })

  it("turmeric/curcumin includes anticoagulant interaction + pregnancy avoidance", () => {
    const crp = supplementDatabase["CRP"] ?? []
    const curc = crp.find((p) => /turmeric|curcumin/i.test(p.productName))
    expect(curc).toBeDefined()
    expect((curc!.interactions ?? []).some((i) => /anticoagulant|antiplatelet|bleeding/i.test(i))).toBe(true)
    expect(curc!.pregnancyCaveat).toMatch(/not recommended|avoid/i)
  })

  it("omega-3 carries bleeding-risk interaction note", () => {
    const crp = supplementDatabase["CRP"] ?? []
    const o3 = crp.find((p) => /omega|fish oil/i.test(p.productName))
    expect(o3).toBeDefined()
    expect((o3!.interactions ?? []).some((i) => /bleeding|anticoag/i.test(i))).toBe(true)
  })

  it("every catalog SKU has at least some pregnancy note (generic is acceptable)", () => {
    for (const p of allSkus) {
      expect(typeof p.pregnancyCaveat === "string" && p.pregnancyCaveat.length).toBeGreaterThan(0)
    }
  })
})
