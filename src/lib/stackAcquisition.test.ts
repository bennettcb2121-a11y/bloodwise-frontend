import { describe, expect, it } from "vitest"
import type { SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"
import {
  getEffectiveAcquisitionMode,
  itemImpliesUserAlreadyHasSupply,
  mergeInferredAcquisitionDefaults,
} from "./stackAcquisition"

function labRow(name: string, marker?: string): SavedSupplementStackItem {
  return {
    supplementName: name,
    dose: "",
    monthlyCost: 0,
    recommendationType: "Core",
    reason: "Labs",
    marker,
  }
}

describe("itemImpliesUserAlreadyHasSupply", () => {
  it("is true for https product URL", () => {
    expect(itemImpliesUserAlreadyHasSupply({ ...labRow("Iron"), productUrl: "https://shop.example/p" })).toBe(true)
  })

  it("is true for stackEntryId from profile intake", () => {
    expect(itemImpliesUserAlreadyHasSupply({ ...labRow("Vitamin D"), stackEntryId: "c1" })).toBe(true)
  })

  it("is true when user chose to keep product", () => {
    expect(itemImpliesUserAlreadyHasSupply({ ...labRow("Mg"), userChoseKeepProduct: true })).toBe(true)
  })

  it("is false when only lab row with no profile signals", () => {
    expect(itemImpliesUserAlreadyHasSupply(labRow("Iron Tablets", "Ferritin"))).toBe(false)
  })
})

describe("getEffectiveAcquisitionMode", () => {
  it("infers have when map is empty but item has saved URL", () => {
    const item = { ...labRow("Iron"), productUrl: "https://a.co/iron" }
    expect(getEffectiveAcquisitionMode(item, "ferritin", {})).toBe("have")
  })

  it("respects explicit ordered over inferred have", () => {
    const item = { ...labRow("Iron"), productUrl: "https://a.co/iron" }
    expect(getEffectiveAcquisitionMode(item, "ferritin", { ferritin: { mode: "ordered" } })).toBe("ordered")
  })
})

describe("mergeInferredAcquisitionDefaults", () => {
  it("writes have for items with product URL", () => {
    const stack = [{ ...labRow("D"), productUrl: "https://example.com/d", marker: "Vitamin D" }]
    const { map, changed } = mergeInferredAcquisitionDefaults(stack, {})
    expect(changed).toBe(true)
    expect(map["vitamin d"]?.mode).toBe("have")
  })
})
