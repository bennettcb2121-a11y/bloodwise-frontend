import { describe, it, expect } from "vitest"
import {
  shouldOmitStackItemForLabs,
  filterStackItemsByLabSafety,
  getStackItemBadgeKind,
} from "./stackLabSafety"
import type { SavedSupplementStackItem } from "./bloodwiseDb"

describe("stackLabSafety", () => {
  const b12Item: SavedSupplementStackItem = {
    supplementName: "Methyl B12 5000 mcg",
    dose: "1 daily",
    monthlyCost: 12,
    recommendationType: "Core",
    reason: "test",
    marker: "Vitamin B12",
  }

  it("omits B12 stack row when Vitamin B12 lab is high", () => {
    const analysis = [{ name: "Vitamin B12", status: "high" }]
    expect(shouldOmitStackItemForLabs(b12Item, analysis)).toBe(true)
    expect(filterStackItemsByLabSafety([b12Item], analysis)).toHaveLength(0)
  })

  it("keeps B12 when status is suboptimal", () => {
    const analysis = [{ name: "Vitamin B12", status: "suboptimal" }]
    expect(shouldOmitStackItemForLabs(b12Item, analysis)).toBe(false)
  })

  it("returns maintenance badge when stackHint is set", () => {
    const item: SavedSupplementStackItem = {
      supplementName: "Iron",
      dose: "—",
      monthlyCost: 4,
      recommendationType: "Context-dependent",
      reason: "test",
      marker: "Ferritin",
      stackHint: "maintenance",
    }
    expect(getStackItemBadgeKind(item, [{ name: "Ferritin", status: "optimal" }])).toBe("maintenance")
  })

  it("omits iron row when ferritin is high", () => {
    const iron: SavedSupplementStackItem = {
      supplementName: "Iron 65 mg",
      dose: "1 daily",
      monthlyCost: 5,
      recommendationType: "Core",
      reason: "test",
      marker: "Ferritin",
    }
    expect(shouldOmitStackItemForLabs(iron, [{ name: "Ferritin", status: "high" }])).toBe(true)
  })

  it("returns user_product_review when suboptimal fit and user kept product", () => {
    const item: SavedSupplementStackItem = {
      supplementName: "Iron liquid",
      dose: "5 mL",
      monthlyCost: 0,
      recommendationType: "Context-dependent",
      reason: "test",
      marker: "Ferritin",
      fitStatus: "suboptimal",
      userChoseKeepProduct: true,
    }
    expect(getStackItemBadgeKind(item, [{ name: "Ferritin", status: "high" }])).toBe("user_product_review")
  })
})

