import { describe, it, expect } from "vitest"
import { computeStackProductFit } from "./stackProductFit"

describe("computeStackProductFit", () => {
  it("returns unknown when no marker or empty labs", () => {
    const { fit, rationale, chipLabel, chipTone } = computeStackProductFit("Some vitamin", null, [])
    expect(fit).toBe("unknown")
    expect(chipTone).toBe("unmapped")
    expect(chipLabel).toBe("Can’t compare yet")
    expect(rationale.length).toBeGreaterThan(10)
  })

  it("flags suboptimal when ferritin is high and product maps to ferritin", () => {
    const { fit } = computeStackProductFit("Iron bisglycinate", "Ferritin", [
      {
        name: "Ferritin",
        status: "high",
        value: 400,
        optimalMin: 50,
        optimalMax: 150,
        description: "",
      },
    ])
    expect(fit).toBe("suboptimal")
  })

  it("returns aligned when marker is deficient and product maps to that marker", () => {
    const { fit } = computeStackProductFit("Iron", "Ferritin", [
      {
        name: "Ferritin",
        status: "deficient",
        value: 15,
        optimalMin: 50,
        optimalMax: 150,
        description: "",
      },
    ])
    expect(fit).toBe("aligned")
  })

  it("uses Labs in range label when marker is optimal (not “unclear”)", () => {
    const { fit, chipLabel, chipTone } = computeStackProductFit("Iron", "Ferritin", [
      {
        name: "Ferritin",
        status: "optimal",
        value: 95,
        optimalMin: 50,
        optimalMax: 150,
        description: "",
      },
    ])
    expect(fit).toBe("unknown")
    expect(chipTone).toBe("in_range")
    expect(chipLabel).toBe("Labs in range")
  })
})
