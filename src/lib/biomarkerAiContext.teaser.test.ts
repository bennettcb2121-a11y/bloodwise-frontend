import { describe, expect, it } from "vitest"
import { buildBiomarkerTeaserInsights } from "./biomarkerAiContext"
import type { BiomarkerResult } from "./analyzeBiomarkers"

describe("buildBiomarkerTeaserInsights", () => {
  it("includes value, target band, and gap for high BUN", () => {
    const results: BiomarkerResult[] = [
      {
        name: "BUN",
        value: 27,
        optimalMin: 7,
        optimalMax: 20,
        status: "high",
        description: "",
      },
    ]
    const [row] = buildBiomarkerTeaserInsights(results, 3)
    expect(row.markerLabel).toBe("BUN")
    expect(row.valueSummary).toContain("27")
    expect(row.valueSummary).toContain("above")
    expect(row.valueSummary).toContain("7–20")
    expect(row.valueSummary).toContain("7 above")
    expect(row.worryLine.length).toBeGreaterThan(10)
  })
})
