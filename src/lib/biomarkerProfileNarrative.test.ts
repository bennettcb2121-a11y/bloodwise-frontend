import { describe, it, expect } from "vitest"
import { getBiomarkerProfileNarrative } from "@/src/lib/biomarkerProfileNarrative"
import type { BiomarkerResult } from "@/src/lib/analyzeBiomarkers"
import type { ProfileRow } from "@/src/lib/bloodwiseDb"

const baseProfile = {
  user_id: "u1",
  age: "32",
  sex: "male",
  sport: "Endurance / running",
  goal: "Feel stronger on long runs",
  current_supplement_spend: "",
  current_supplements: "",
  shopping_preference: "Best value",
  symptoms: "fatigue",
  health_goals: "more_energy",
} as ProfileRow

function makeResult(partial: Partial<BiomarkerResult>): BiomarkerResult {
  return {
    name: "Ferritin",
    value: 45,
    optimalMin: 40,
    optimalMax: 150,
    status: "optimal",
    description: "Test description for ferritin.",
    ...partial,
  }
}

describe("getBiomarkerProfileNarrative", () => {
  it("returns three non-empty strings for optimal ferritin", () => {
    const n = getBiomarkerProfileNarrative("Ferritin", makeResult({}), baseProfile)
    expect(n.whatItIs.length).toBeGreaterThan(10)
    expect(n.whyForYou).toMatch(/endurance|training/i)
    expect(n.fitForGoals).toMatch(/supportive|Clarion target/i)
  })

  it("handles unknown marker status", () => {
    const n = getBiomarkerProfileNarrative(
      "Custom Lab X",
      makeResult({ name: "Custom Lab X", status: "unknown", description: "Unknown label." }),
      baseProfile
    )
    expect(n.fitForGoals).toMatch(/library/i)
  })
})
