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
})
