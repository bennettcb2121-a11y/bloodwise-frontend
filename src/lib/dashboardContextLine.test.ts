import { describe, expect, it } from "vitest"
import { getContextualInsight } from "./dashboardContextLine"

describe("getContextualInsight", () => {
  it("prefers top ordered driver with value and date", () => {
    const line = getContextualInsight({
      orderedDrivers: [{ markerName: "Ferritin" }],
      analysisResults: [{ name: "Ferritin", value: 45 }],
      reportDateRelative: "Updated 3 days ago",
      retestCountdown: null,
    })
    expect(line).toContain("Ferritin")
    expect(line).toContain("45")
    expect(line).toContain("Updated 3 days ago")
  })

  it("falls back to retest when no drivers", () => {
    const line = getContextualInsight({
      orderedDrivers: [],
      analysisResults: [],
      reportDateRelative: null,
      retestCountdown: { type: "until", weeks: 4 },
    })
    expect(line).toContain("retest")
    expect(line).toContain("4")
  })
})
