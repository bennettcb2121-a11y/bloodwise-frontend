import { describe, expect, it } from "vitest"
import type { SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"
import { filterOrphanLifestyleRowsFromLabSnapshot, mergeLabStackWithProfileStack } from "./profileStackMerge"

function row(name: string): SavedSupplementStackItem {
  return {
    supplementName: name,
    dose: "",
    monthlyCost: 0,
    recommendationType: "Context-dependent",
    reason: "",
  }
}

describe("mergeLabStackWithProfileStack", () => {
  it("merges profile productUrl and dose onto lab row when keys match (same biomarker)", () => {
    const lab: SavedSupplementStackItem = {
      supplementName: "Magnesium glycinate",
      dose: "200 mg",
      monthlyCost: 12,
      recommendationType: "Optimize",
      reason: "Labs suggest low RBC magnesium context.",
      marker: "Magnesium",
    }
    const profile: SavedSupplementStackItem = {
      supplementName: "Magnesium citrate",
      dose: "400 mg nightly",
      monthlyCost: 0,
      recommendationType: "Context-dependent",
      reason: "From what you take today.",
      marker: "Magnesium",
      productUrl: "https://example.com/my-mag",
      stackEntryId: "client-abc",
      fitStatus: "suboptimal",
    }
    const out = mergeLabStackWithProfileStack([lab], [profile])
    expect(out).toHaveLength(1)
    expect(out[0].supplementName).toBe("Magnesium glycinate")
    expect(out[0].recommendationType).toBe("Optimize")
    expect(out[0].productUrl).toBe("https://example.com/my-mag")
    expect(out[0].dose).toBe("400 mg nightly")
    expect(out[0].stackEntryId).toBe("client-abc")
    expect(out[0].fitStatus).toBe("suboptimal")
  })

  it("still appends profile-only rows when lab stack does not cover that key", () => {
    const profileOnly: SavedSupplementStackItem = {
      supplementName: "Custom herb blend",
      dose: "1 cap",
      monthlyCost: 0,
      recommendationType: "Context-dependent",
      reason: "From what you take today.",
    }
    const lab: SavedSupplementStackItem = {
      supplementName: "Vitamin D3",
      dose: "2000 IU",
      monthlyCost: 8,
      recommendationType: "Optimize",
      reason: "Low 25-OH D.",
      marker: "Vitamin D",
    }
    const out = mergeLabStackWithProfileStack([lab], [profileOnly])
    expect(out).toHaveLength(2)
    expect(out.map((r) => r.supplementName).sort()).toEqual(["Custom herb blend", "Vitamin D3"])
  })
})

describe("filterOrphanLifestyleRowsFromLabSnapshot", () => {
  it("always strips Electrolytes and Protein powder from persisted snapshot rows", () => {
    const snap = [row("Vitamin C 500 mg"), row("Electrolytes"), row("Protein powder"), row("Vitamin D")]
    const out = filterOrphanLifestyleRowsFromLabSnapshot(snap)
    expect(out.map((r) => r.supplementName)).toEqual(["Vitamin C 500 mg", "Vitamin D"])
  })

  it("strips lifestyle rows even when a profile list would have matched (re-add happens only via profile merge)", () => {
    const snap = [row("Electrolytes"), row("Magnesium")]
    const out = filterOrphanLifestyleRowsFromLabSnapshot(snap)
    expect(out.map((r) => r.supplementName)).toEqual(["Magnesium"])
  })
})
