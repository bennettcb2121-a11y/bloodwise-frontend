import { describe, it, expect } from "vitest"
import { getLabReviewItemsForCurrentSupplements } from "./stackComparison"

describe("getLabReviewItemsForCurrentSupplements", () => {
  it("flags vitamin D on current list when lab status is high", () => {
    const raw = JSON.stringify([{ id: "vitamin_d", name: "Vitamin D" }])
    const items = getLabReviewItemsForCurrentSupplements(raw, [{ name: "Vitamin D", status: "high" }])
    expect(items).toHaveLength(1)
    expect(items[0].presetId).toBe("vitamin_d")
    expect(items[0].marker).toBe("Vitamin D")
  })

  it("returns empty when no high markers", () => {
    const raw = JSON.stringify([{ id: "vitamin_d", name: "Vitamin D" }])
    expect(getLabReviewItemsForCurrentSupplements(raw, [{ name: "Vitamin D", status: "optimal" }])).toHaveLength(0)
  })
})
