import { describe, expect, it } from "vitest"
import { getOrderedFocusResults, getOrderedScoreDrivers } from "./scoreBreakdown"
import type { UserPriorityContext } from "./priorityRanking"

describe("getOrderedFocusResults", () => {
  it("orders flagged markers by lab severity when no priority context", () => {
    const report = [
      { name: "Ferritin", status: "suboptimal" },
      { name: "25-OH Vitamin D", status: "deficient" },
    ]
    const focus = getOrderedFocusResults(report, 3, null)
    expect(focus.map((r) => r.name)).toEqual(["25-OH Vitamin D", "Ferritin"])
    expect(getOrderedScoreDrivers(report, 2, null).map((d) => d.markerName)).toEqual([
      "25-OH Vitamin D",
      "Ferritin",
    ])
  })

  it("aligns with ordered drivers when symptom context boosts iron", () => {
    const report = [
      { name: "Ferritin", status: "suboptimal" },
      { name: "25-OH Vitamin D", status: "suboptimal" },
    ]
    const ctx: UserPriorityContext = {
      symptoms: "fatigue",
      profileType: "endurance_athlete",
      sport: "running",
    }
    const drivers = getOrderedScoreDrivers(report, 3, ctx)
    const focus = getOrderedFocusResults(report, 3, ctx)
    expect(focus.map((r) => r.name)).toEqual(drivers.map((d) => d.markerName))
    expect(drivers[0]?.markerName).toBe("Ferritin")
  })
})
