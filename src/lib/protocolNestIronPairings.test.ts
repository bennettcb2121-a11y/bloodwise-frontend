import { describe, expect, it } from "vitest"
import type { SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"
import { prepareProtocolRowsWithVitaminCNestingUnderIron } from "./protocolNestIronPairings"

function row(name: string, marker?: string): SavedSupplementStackItem {
  return {
    supplementName: name,
    dose: "",
    monthlyCost: 0,
    recommendationType: "Core",
    reason: "",
    ...(marker ? { marker } : {}),
  }
}

describe("prepareProtocolRowsWithVitaminCNestingUnderIron", () => {
  it("removes vitamin C from flat list and attaches to first iron when both exist", () => {
    const rows = [row("Iron Tablets", "Ferritin"), row("Magnesium"), row("Vitamin C 500 mg", "Vitamin C")]
    const out = prepareProtocolRowsWithVitaminCNestingUnderIron(rows)
    expect(out.displayRows.map((r) => r.supplementName)).toEqual(["Iron Tablets", "Magnesium"])
    expect(out.nestedVitaminC.map((r) => r.supplementName)).toEqual(["Vitamin C 500 mg"])
    expect(out.firstIronStorageKey).toBeTruthy()
  })

  it("leaves vitamin C in the list when iron is not in the stack", () => {
    const rows = [row("Vitamin C", "Vitamin C"), row("Magnesium")]
    const out = prepareProtocolRowsWithVitaminCNestingUnderIron(rows)
    expect(out.displayRows.length).toBe(2)
    expect(out.nestedVitaminC.length).toBe(0)
    expect(out.firstIronStorageKey).toBeNull()
  })
})
