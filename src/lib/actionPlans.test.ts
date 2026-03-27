import { describe, it, expect } from "vitest"
import {
  getActionPlanForBiomarker,
  resolveActionPlanDbKey,
  getActionPlanGuideSlug,
} from "./actionPlans"

describe("actionPlans", () => {
  it("uses explicit PLANS for Ferritin", () => {
    const p = getActionPlanForBiomarker("Ferritin")
    expect(p).not.toBeNull()
    expect(p!.dailyActions[0]).toMatch(/iron/i)
    expect(p!.sourceGuideSlug).toBe("iron")
  })

  it("builds plan from database for markers without PLANS", () => {
    const p = getActionPlanForBiomarker("ALT")
    expect(p).not.toBeNull()
    expect(p!.dailyActions.length).toBeGreaterThan(0)
    expect(p!.weeklyActions.length).toBeGreaterThan(0)
    expect(p!.retestWindow).toBeTruthy()
  })

  it("resolves aliases to database keys", () => {
    expect(resolveActionPlanDbKey("25-OH Vitamin D")).toBe("Vitamin D")
    expect(resolveActionPlanDbKey("Fasting Glucose")).toBe("Glucose")
    const p = getActionPlanForBiomarker("25-OH Vitamin D")
    expect(p).not.toBeNull()
    expect(p!.dailyActions.length).toBeGreaterThan(0)
  })

  it("getActionPlanGuideSlug prefers explicit guide from PLANS", () => {
    expect(getActionPlanGuideSlug("Ferritin")).toBe("iron")
  })
})
