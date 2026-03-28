import { describe, it, expect } from "vitest"
import {
  inferBudgetModeFromProfile,
  filterByDietPreference,
  pickAdaptiveBestProduct,
  buildAdaptiveContextFromProfile,
  type SupplementAdaptiveMeta,
} from "./adaptiveSupplementEngine"

const meta = (m: Partial<SupplementAdaptiveMeta>): SupplementAdaptiveMeta => ({
  qualityTier: m.qualityTier ?? 2,
  priceTier: m.priceTier ?? "mid",
  veganFriendly: m.veganFriendly,
  animalGelatin: m.animalGelatin,
})

describe("inferBudgetModeFromProfile", () => {
  it("maps Best value to maximize_value", () => {
    expect(inferBudgetModeFromProfile({ shopping_preference: "Best value" })).toBe("maximize_value")
  })
  it("maps premium language to quality_first", () => {
    expect(inferBudgetModeFromProfile({ shopping_preference: "Premium quality" })).toBe("quality_first")
  })
  it("defaults to balanced", () => {
    expect(inferBudgetModeFromProfile({ shopping_preference: "Whatever" })).toBe("balanced")
  })
})

describe("filterByDietPreference", () => {
  const products = [
    { id: "a", adaptive: meta({ animalGelatin: true, veganFriendly: false }) },
    { id: "b", adaptive: meta({ veganFriendly: true }) },
  ]
  it("filters gelatin for vegan diet", () => {
    const out = filterByDietPreference(products, "vegan")
    expect(out.map((p) => p.id)).toEqual(["b"])
  })
  it("returns all when no diet", () => {
    expect(filterByDietPreference(products, null).length).toBe(2)
  })
})

describe("pickAdaptiveBestProduct", () => {
  const list = [
    {
      id: "cheap",
      price: 5,
      unitsPerBottle: 100,
      amountPerUnit: 65,
      activeUnit: "mg" as const,
      costPerUnitActive: 0.001,
      adaptive: meta({ qualityTier: 1, priceTier: "budget" }),
    },
    {
      id: "premium",
      price: 40,
      unitsPerBottle: 60,
      amountPerUnit: 65,
      activeUnit: "mg" as const,
      costPerUnitActive: 0.01,
      adaptive: meta({ qualityTier: 3, priceTier: "premium" }),
    },
  ]
  it("prefers cheaper SKU when maximizing value", () => {
    const ctx = buildAdaptiveContextFromProfile({ shopping_preference: "Best value" })
    const pick = pickAdaptiveBestProduct(list, { ...ctx, supplementFormPreference: "any" })
    expect(pick?.id).toBe("cheap")
  })
  it("prefers higher quality when quality_first", () => {
    const ctx = buildAdaptiveContextFromProfile({ shopping_preference: "Premium products only" })
    const pick = pickAdaptiveBestProduct(list, { ...ctx, supplementFormPreference: "any" })
    expect(pick?.id).toBe("premium")
  })
})
