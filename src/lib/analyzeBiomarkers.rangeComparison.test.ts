import { describe, it, expect } from "vitest"
import { getRangeComparison, getRangeTiers } from "./analyzeBiomarkers"
import type { UserProfile } from "./classifyUser"

describe("getRangeComparison", () => {
  it("flags ferritin 40 for a male endurance runner as standard-optimal / personal-low", () => {
    const runner: UserProfile = { sex: "male", age: 32, sport: "running" }
    const c = getRangeComparison("Ferritin", 40, runner)

    expect(c.standardMin).toBe(40)
    expect(c.standardMax).toBe(150)
    expect(c.personalMin).toBe(60)
    expect(c.personalMax).toBe(150)
    expect(c.isPersonalized).toBe(true)
    expect(c.mismatch).toBe("standard_optimal_personal_low")
    expect(c.profileLabel).toContain("male")
    expect(c.profileLabel).toContain("endurance")
    expect(c.profileLabel).toContain("32")
  })

  it("reports aligned_in_range for a mid-range value on a general profile", () => {
    const general: UserProfile = {}
    const c = getRangeComparison("Vitamin D", 55, general)

    expect(c.standardMin).toBe(30)
    expect(c.standardMax).toBe(100)
    expect(c.personalMin).toBe(30)
    expect(c.personalMax).toBe(100)
    expect(c.mismatch).toBe("aligned_in_range")
    expect(c.isPersonalized).toBe(false)
  })

  it("returns unknown + null ranges for markers not in the library", () => {
    const c = getRangeComparison("TotallyFakeMarker", 5, {})

    expect(c.standardMin).toBeNull()
    expect(c.standardMax).toBeNull()
    expect(c.personalMin).toBeNull()
    expect(c.personalMax).toBeNull()
    expect(c.isPersonalized).toBe(false)
    expect(c.mismatch).toBe("unknown")
  })

  it("treats general profile as not personalized for ferritin", () => {
    const c = getRangeComparison("Ferritin", 80, {})

    expect(c.isPersonalized).toBe(false)
    expect(c.standardMin).toBe(c.personalMin)
    expect(c.standardMax).toBe(c.personalMax)
  })

  it("resolves lab-label aliases so 25-OH Vitamin D maps to Vitamin D ranges", () => {
    const c = getRangeComparison("25-OH Vitamin D", 55, {})

    expect(c.standardMin).toBe(30)
    expect(c.personalMin).toBe(30)
    expect(c.mismatch).toBe("aligned_in_range")
  })

  it("marks ferritin 35 for a runner as aligned_low (below both standard and personal)", () => {
    const runner: UserProfile = { sex: "male", age: 32, sport: "running" }
    const c = getRangeComparison("Ferritin", 35, runner)

    expect(c.mismatch).toBe("aligned_low")
    expect(c.verdictIsFlagged).toBe(true)
  })

  it("marks BUN 28 as aligned_high and produces a flagged both-lenses verdict", () => {
    const c = getRangeComparison("BUN", 28, {})

    expect(c.mismatch).toBe("aligned_high")
    expect(c.verdictIsFlagged).toBe(true)
    expect(c.verdict).toMatch(/28/)
    expect(c.verdict).toMatch(/high by both lenses/i)
  })

  it("produces a calm verdict for aligned_in_range", () => {
    const c = getRangeComparison("Vitamin D", 55, {})

    expect(c.verdictIsFlagged).toBe(false)
    expect(c.verdict).toMatch(/55/)
    expect(c.verdict).toMatch(/optimal/i)
  })

  it("produces a flagged, signature verdict for standard_optimal_personal_low", () => {
    const runner: UserProfile = { sex: "male", age: 32, sport: "running" }
    const c = getRangeComparison("Ferritin", 45, runner)

    expect(c.mismatch).toBe("standard_optimal_personal_low")
    expect(c.verdictIsFlagged).toBe(true)
    expect(c.verdict).toMatch(/45/)
    expect(c.verdict).toMatch(/below Clarion/i)
  })

  it("returns an empty verdict string for unknown markers", () => {
    const c = getRangeComparison("SomeRandomMarker", 5, {})

    expect(c.mismatch).toBe("unknown")
    expect(c.verdictIsFlagged).toBe(false)
    expect(c.verdict).toMatch(/Clarion's library/i)
  })

  it("exposes the typical lab reference interval when the library publishes one", () => {
    const c = getRangeComparison("Ferritin", 80, {})

    expect(c.labReferenceMin).toBe(15)
    expect(c.labReferenceMax).toBe(300)
    expect(c.labReferenceSource).toBeTruthy()
  })

  it("returns null lab reference when the marker lacks a published interval", () => {
    const c = getRangeComparison("Creatinine", 1.0, {})

    expect(c.labReferenceMin).toBeNull()
    expect(c.labReferenceMax).toBeNull()
    expect(c.labReferenceSource).toBeNull()
  })

  it("returns null lab reference (and empty tiers) for unknown markers", () => {
    const c = getRangeComparison("TotallyFakeMarker", 5, {})

    expect(c.labReferenceMin).toBeNull()
    expect(c.labReferenceMax).toBeNull()
    expect(c.standardTiers).toEqual([])
  })

  it("produces an ordered five-segment tier set for a classic marker", () => {
    const c = getRangeComparison("Ferritin", 80, {})
    const tiers = c.standardTiers

    expect(tiers).toHaveLength(5)
    expect(tiers[0]).toMatchObject({ from: null, to: 20, tone: "deficient" })
    expect(tiers[1]).toMatchObject({ from: 20, to: 40, tone: "suboptimal" })
    expect(tiers[2]).toMatchObject({ from: 40, to: 150, tone: "optimal" })
    expect(tiers[3]).toMatchObject({ from: 150, to: 300, tone: "suboptimal" })
    expect(tiers[4]).toMatchObject({ from: 300, to: null, tone: "high" })
  })

  it("produces ADA-style tiers for HbA1c (prediabetes then diabetes)", () => {
    const c = getRangeComparison("HbA1c", 5.5, {})
    const tiers = c.standardTiers

    const tones = tiers.map((t) => t.tone)
    expect(tones).toEqual([
      "deficient",
      "suboptimal",
      "optimal",
      "suboptimal",
      "high",
    ])
    const optimal = tiers.find((t) => t.tone === "optimal")
    expect(optimal?.from).toBe(4.5)
    expect(optimal?.to).toBe(5.7)
    const diabetes = tiers[tiers.length - 1]
    expect(diabetes.from).toBe(6.5)
    expect(diabetes.to).toBeNull()
  })
})

describe("getRangeTiers (unit)", () => {
  it("collapses deficient-equals-optimalMin into a single suboptimal pre-segment", () => {
    const tiers = getRangeTiers({ optimalMin: 30, optimalMax: 100 })
    expect(tiers).toHaveLength(3)
    expect(tiers[0]).toMatchObject({ from: null, to: 30, tone: "suboptimal" })
    expect(tiers[1]).toMatchObject({ from: 30, to: 100, tone: "optimal" })
    expect(tiers[2]).toMatchObject({ from: 100, to: null, tone: "high" })
  })

  it("splits the high side into suboptimal then high when a `high` threshold is set", () => {
    const tiers = getRangeTiers({ optimalMin: 0, optimalMax: 1, high: 3 })
    const tones = tiers.map((t) => t.tone)
    expect(tones).toEqual(["suboptimal", "optimal", "suboptimal", "high"])
  })
})
