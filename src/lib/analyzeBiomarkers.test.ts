import { describe, it, expect } from "vitest"
import { analyzeBiomarkers } from "./analyzeBiomarkers"

describe("analyzeBiomarkers", () => {
  it("marks unknown lab keys as unknown, not optimal", () => {
    const results = analyzeBiomarkers({ TotallyUnknownMarkerXYZ: 42 }, {})
    expect(results).toHaveLength(1)
    expect(results[0].status).toBe("unknown")
    expect(results[0].optimalMin).toBeNull()
    expect(results[0].optimalMax).toBeNull()
  })

  it("classifies ferritin when present in database", () => {
    const results = analyzeBiomarkers({ Ferritin: 15 }, { sex: "male", sport: "running" })
    const f = results.find((r) => r.name === "Ferritin")
    expect(f).toBeDefined()
    expect(f!.status).not.toBe("unknown")
  })

  it("uses ADA-style HbA1c bands (prediabetes is suboptimal, diabetes is high)", () => {
    const r = analyzeBiomarkers({ HbA1c: 5.5 }, {})
    expect(r[0].status).toBe("optimal")
    expect(analyzeBiomarkers({ HbA1c: 5.8 }, {})[0].status).toBe("suboptimal")
    expect(analyzeBiomarkers({ HbA1c: 6.5 }, {})[0].status).toBe("high")
  })

  it("treats mid-range vitamin D (ng/mL) as optimal, not high", () => {
    const r = analyzeBiomarkers({ "25-OH Vitamin D": 69 }, { sex: "male", sport: "general health" })
    expect(r[0].status).toBe("optimal")
  })

  it("treats high-normal B12 (pg/mL) as optimal", () => {
    const r = analyzeBiomarkers({ "Vitamin B12": 931 }, {})
    expect(r[0].status).toBe("optimal")
  })
})
