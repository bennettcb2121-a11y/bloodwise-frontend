import { describe, it, expect } from "vitest"
import { getActionPlanForBiomarker } from "./actionPlans"

describe("getActionPlanForBiomarker high-status", () => {
  it("does not tell users to take vitamin D when 25-OH D is high", () => {
    const plan = getActionPlanForBiomarker("Vitamin D", [], {
      status: "high",
      value: 165,
      profile: { age: "30", sex: "male", sport: "General fitness" },
    })
    expect(plan).not.toBeNull()
    const text = [...(plan?.dailyActions ?? []), ...(plan?.weeklyActions ?? [])].join(" ").toLowerCase()
    expect(text).toMatch(/stop|reduce|do not|not add|review/)
    expect(text).not.toMatch(/take vitamin d3 supplement \(dose per your protocol\)/)
  })

  it("does not tell users to take B12 when B12 is high", () => {
    const plan = getActionPlanForBiomarker("Vitamin B12", [], {
      status: "high",
      value: 1200,
      profile: { age: "30", sex: "male", sport: "General fitness" },
    })
    expect(plan).not.toBeNull()
    const text = [...(plan?.dailyActions ?? []), ...(plan?.weeklyActions ?? [])].join(" ").toLowerCase()
    expect(text).toMatch(/do not add more b12|not something to/)
  })
})
