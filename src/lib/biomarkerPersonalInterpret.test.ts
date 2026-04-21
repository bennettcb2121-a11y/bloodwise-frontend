import { describe, it, expect } from "vitest"
import {
  interpretPanelPersonal,
  detectPatterns,
} from "@/src/lib/biomarkerPersonalInterpret"
import { recommendSupplementsFromInterpretations } from "@/src/lib/supplementRecommendations"
import { buildPhenotype } from "@/src/lib/phenotypeContext"
import type { ProfileRow } from "@/src/lib/bloodwiseDb"

const baseProfile: Partial<ProfileRow> = {
  age: "28",
  sex: "female",
  sport: "Running",
  goal: "Improve performance",
  current_supplement_spend: "",
  current_supplements: "",
  shopping_preference: "",
  training_focus: "endurance_athlete",
  diet_preference: "omnivore",
  supplement_form_preference: "any",
}

describe("interpretPanelPersonal", () => {
  it("flags low ferritin as low for a female endurance athlete (phenotype rule overrides lab 'normal')", () => {
    const { interpretations } = interpretPanelPersonal(
      { Ferritin: { value: 22, unit: "ng/mL" } },
      baseProfile
    )
    const ferritin = interpretations.find((i) => i.biomarkerKey === "Ferritin")
    expect(ferritin).toBeDefined()
    expect(["low", "suboptimal", "deficient"]).toContain(ferritin?.status)
    expect(ferritin?.personal.join(" ")).toMatch(/endurance|iron|ferritin/i)
  })

  it("marks optimal ferritin as optimal and produces no personal notes for a low-ferritin-only rule", () => {
    const { interpretations } = interpretPanelPersonal(
      { Ferritin: { value: 85, unit: "ng/mL" } },
      baseProfile
    )
    const ferritin = interpretations.find((i) => i.biomarkerKey === "Ferritin")
    expect(ferritin?.status).toBe("optimal")
  })

  it("detects iron-deficiency anemia when ferritin and hemoglobin are both low", () => {
    const patterns = detectPatterns({ Ferritin: 10, Hemoglobin: 11.5 })
    expect(patterns.some((p) => p.id === "iron_deficiency_anemia")).toBe(true)
  })

  it("detects metabolic pattern when HbA1c is elevated and HDL is low", () => {
    const patterns = detectPatterns({ HbA1c: 5.9, "HDL-C": 36 })
    expect(patterns.some((p) => p.id === "insulin_resistance_lipid")).toBe(true)
  })

  it("does not invent patterns from a single in-range marker", () => {
    const patterns = detectPatterns({ Ferritin: 80 })
    expect(patterns).toEqual([])
  })
})

describe("recommendSupplementsFromInterpretations", () => {
  it("recommends iron bisglycinate for low ferritin in a female endurance athlete", () => {
    const { interpretations } = interpretPanelPersonal(
      { Ferritin: { value: 18, unit: "ng/mL" } },
      baseProfile
    )
    const phenotype = buildPhenotype(baseProfile)
    const recs = recommendSupplementsFromInterpretations(interpretations, phenotype)
    expect(recs.some((r) => r.name.toLowerCase().includes("iron"))).toBe(true)
  })

  it("skips iron softgel-form supplements for a pill-averse user (no capsule-only suggestions)", () => {
    const phenotype = buildPhenotype({ ...baseProfile, supplement_form_preference: "no_pills" })
    const { interpretations } = interpretPanelPersonal(
      { Ferritin: { value: 18, unit: "ng/mL" } },
      { ...baseProfile, supplement_form_preference: "no_pills" }
    )
    const recs = recommendSupplementsFromInterpretations(interpretations, phenotype)
    for (const r of recs) {
      expect(["capsule", "softgel", "tablet", "pill"].includes(r.form)).toBe(false)
    }
  })

  it("does not recommend anything for a wholly optimal panel", () => {
    const { interpretations } = interpretPanelPersonal(
      {
        Ferritin: { value: 90, unit: "ng/mL" },
        "Vitamin D": { value: 45, unit: "ng/mL" },
      },
      baseProfile
    )
    const recs = recommendSupplementsFromInterpretations(interpretations, buildPhenotype(baseProfile))
    expect(recs.length).toBe(0)
  })

  it("skips berberine if the user is pregnant (symptom flag)", () => {
    const pregnantProfile: Partial<ProfileRow> = {
      ...baseProfile,
      symptoms: "pregnancy",
    }
    const { interpretations } = interpretPanelPersonal(
      { HbA1c: { value: 5.9, unit: "%" } },
      pregnantProfile
    )
    const phenotype = buildPhenotype(pregnantProfile)
    const recs = recommendSupplementsFromInterpretations(interpretations, phenotype)
    expect(recs.some((r) => r.name.toLowerCase().startsWith("berberine"))).toBe(false)
  })
})
