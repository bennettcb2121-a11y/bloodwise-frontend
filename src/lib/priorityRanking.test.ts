import { describe, it, expect } from "vitest"
import { computeDriverPriorityScore, isPriorityContextEmpty, type UserPriorityContext } from "./priorityRanking"
import { getOrderedScoreDrivers } from "./scoreBreakdown"

describe("priorityRanking", () => {
  it("treats empty context as empty", () => {
    expect(isPriorityContextEmpty({})).toBe(true)
    expect(isPriorityContextEmpty(undefined)).toBe(true)
    expect(isPriorityContextEmpty({ age: "  " })).toBe(true)
    expect(isPriorityContextEmpty({ age: "29" })).toBe(false)
  })

  it("boosts ferritin over unrelated markers for endurance + fatigue when severity ties", () => {
    const report = [
      { name: "Ferritin", status: "deficient", value: 10 },
      { name: "Sodium", status: "deficient", value: 120 },
    ]
    const ctx: UserPriorityContext = {
      profileType: "endurance_athlete",
      symptoms: "fatigue,low_energy",
      sport: "Marathon running",
      sex: "Female",
      age: "24",
    }
    const ferritin = computeDriverPriorityScore("Ferritin", "deficient", report, ctx)
    const sodium = computeDriverPriorityScore("Sodium", "deficient", report, ctx)
    expect(ferritin).toBeGreaterThan(sodium)
  })

  it("orders drivers via getOrderedScoreDrivers with context", () => {
    const report = [
      { name: "Sodium", status: "deficient" },
      { name: "Ferritin", status: "deficient" },
    ]
    const drivers = getOrderedScoreDrivers(report, 10, {
      profileType: "endurance_athlete",
      symptoms: "fatigue",
      sport: "Runner",
    })
    expect(drivers[0]?.markerName).toBe("Ferritin")
  })

  it("gives male hormone profiles extra weight to testosterone when flagged", () => {
    const report = [{ name: "Testosterone", status: "suboptimal", value: 300 }]
    const ctx: UserPriorityContext = {
      profileType: "male_hormone_bodycomp",
      sex: "Male",
      age: "32",
    }
    const t = computeDriverPriorityScore("Testosterone", "suboptimal", report, ctx)
    const d = computeDriverPriorityScore("Vitamin D", "suboptimal", report, ctx)
    expect(t).toBeGreaterThan(d)
  })
})
