import { describe, expect, it } from "vitest"

import {
  getLipidPanelCoachingNote,
  isLipidRelatedMarkerName,
} from "@/src/lib/lipidPanelContext"

describe("isLipidRelatedMarkerName", () => {
  it("detects common lipid names", () => {
    expect(isLipidRelatedMarkerName("LDL-C")).toBe(true)
    expect(isLipidRelatedMarkerName("HDL-C")).toBe(true)
    expect(isLipidRelatedMarkerName("Non-HDL cholesterol")).toBe(true)
    expect(isLipidRelatedMarkerName("Triglycerides")).toBe(true)
    expect(isLipidRelatedMarkerName("ApoB")).toBe(true)
  })

  it("returns false for unrelated markers", () => {
    expect(isLipidRelatedMarkerName("Ferritin")).toBe(false)
    expect(isLipidRelatedMarkerName("TSH")).toBe(false)
  })
})

describe("getLipidPanelCoachingNote", () => {
  it("returns null when no lipid flags", () => {
    expect(
      getLipidPanelCoachingNote([
        { name: "LDL-C", status: "optimal" },
        { name: "HDL-C", status: "optimal" },
      ])
    ).toBeNull()
  })

  it("returns panel message when two or more lipid markers are flagged", () => {
    const note = getLipidPanelCoachingNote([
      { name: "LDL-C", status: "high" },
      { name: "HDL-C", status: "suboptimal" },
    ])
    expect(note).toContain("whole lipid panel")
  })

  it("classifies Non-HDL before HDL for single-flag copy", () => {
    const note = getLipidPanelCoachingNote([{ name: "Non-HDL cholesterol", status: "high" }])
    expect(note).toContain("Non-HDL")
    expect(note).not.toContain("HDL is only one part")
  })

  it("uses HDL-specific copy for lone HDL flag", () => {
    const note = getLipidPanelCoachingNote([{ name: "HDL-C", status: "suboptimal" }])
    expect(note).toContain("HDL is only one part")
  })
})
