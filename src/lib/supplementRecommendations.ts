/**
 * Phenotype-filtered supplement recommendations.
 *
 * Takes the interpretations produced by biomarkerPersonalInterpret and the user's phenotype,
 * filters suggestions against diet/form preferences, and attaches evidence strength.
 *
 * This module is deliberately rule-based. The AI narrative layer (api/labs/interpret) quotes
 * these recommendations but never invents new ones — safety and auditability first.
 */

import type { PersonalInterpretation } from "@/src/lib/biomarkerPersonalInterpret"
import type { Phenotype } from "@/src/lib/phenotypeContext"

export type EvidenceStrength = "strong" | "moderate" | "emerging" | "weak"

export type SupplementRecommendation = {
  /** Canonical name shown in UI and used for search/affiliate lookup. */
  name: string
  /** Short reason tying the suggestion to the user's own labs. */
  reason: string
  biomarkerKey: string
  /** Dose string as it would appear on a bottle ("500 mg 2×/day"). */
  dose: string
  form: string // capsule | softgel | powder | liquid | gummy | any
  evidence: EvidenceStrength
  /** Supplements that conflict with this recommendation — UI surfaces as "note". */
  interactsWith: string[]
  /** Why a user might skip it (e.g. kidney disease, anticoagulants). */
  cautionWhen: string[]
}

type Catalog = Record<
  string,
  {
    name: string
    forms: string[] // for form-preference filtering
    defaultDose: string
    evidence: EvidenceStrength
    biomarkerKey: string
    reasonTemplate: (interp: PersonalInterpretation) => string
    interactsWith?: string[]
    cautionWhen?: string[]
    veganSafe?: boolean
    /** Hard-skip this catalog entry if any predicate returns true. */
    skipIf?: (p: Phenotype) => boolean
  }
>

/** Small, curated catalog — intentionally not exhaustive. Extend with care. */
const CATALOG: Catalog = {
  iron_bisglycinate: {
    name: "Iron bisglycinate 18–25 mg",
    forms: ["capsule", "liquid"],
    defaultDose: "18–25 mg elemental iron, every other day with vitamin C",
    evidence: "strong",
    biomarkerKey: "Ferritin",
    reasonTemplate: (i) =>
      `Your ferritin is ${i.value} ${i.unit} — below our target, which commonly drives fatigue and poor training recovery.`,
    interactsWith: ["Calcium supplements", "Thyroid medication (separate by 4 h)"],
    cautionWhen: ["hemochromatosis"],
  },
  vitamin_d3_2000iu: {
    name: "Vitamin D3 2000–4000 IU",
    forms: ["softgel", "liquid", "gummy"],
    defaultDose: "2000–4000 IU/day with a fatty meal",
    evidence: "strong",
    biomarkerKey: "Vitamin D",
    reasonTemplate: (i) => `Your 25-OH vitamin D is ${i.value} ${i.unit} — below our target range.`,
    cautionWhen: ["hypercalcemia", "sarcoidosis"],
  },
  magnesium_glycinate: {
    name: "Magnesium glycinate 300–400 mg",
    forms: ["powder", "capsule"],
    defaultDose: "300–400 mg elemental, 1 hour before bed",
    evidence: "strong",
    biomarkerKey: "Magnesium",
    reasonTemplate: (i) => `Your magnesium is ${i.value} ${i.unit} — the glycinate form has the best absorption profile.`,
    cautionWhen: ["advanced kidney disease"],
  },
  methyl_b12: {
    name: "Methylcobalamin B12 500–1000 mcg",
    forms: ["sublingual", "capsule", "gummy"],
    defaultDose: "500–1000 mcg/day",
    evidence: "strong",
    biomarkerKey: "Vitamin B12",
    reasonTemplate: (i) => `Your B12 is ${i.value} ${i.unit} — low-normal range, especially worth repleting on a plant-based pattern.`,
    veganSafe: true,
  },
  methylfolate: {
    name: "Methylfolate 400–800 mcg",
    forms: ["capsule", "sublingual"],
    defaultDose: "400–800 mcg/day",
    evidence: "moderate",
    biomarkerKey: "Homocysteine",
    reasonTemplate: (i) => `Elevated homocysteine (${i.value} ${i.unit}) often reflects a functional folate/B12 gap.`,
  },
  b6_p5p: {
    name: "Vitamin B6 (P5P) 25–50 mg",
    forms: ["capsule"],
    defaultDose: "25–50 mg/day",
    evidence: "moderate",
    biomarkerKey: "Homocysteine",
    reasonTemplate: () => "Supports homocysteine transsulfuration.",
    cautionWhen: ["peripheral neuropathy"],
  },
  omega_3: {
    name: "EPA+DHA 1–2 g",
    forms: ["softgel", "liquid", "gummy"],
    defaultDose: "1–2 g EPA+DHA daily with a fatty meal",
    evidence: "strong",
    biomarkerKey: "Omega-3 Index",
    reasonTemplate: (i) => `Your Omega-3 Index is ${i.value}% — target is ≥8%, reachable in about 4 months at this dose.`,
    interactsWith: ["Anticoagulants (talk with your clinician)"],
  },
  zinc_picolinate: {
    name: "Zinc picolinate 15–25 mg",
    forms: ["capsule"],
    defaultDose: "15–25 mg/day away from calcium/iron",
    evidence: "moderate",
    biomarkerKey: "Zinc",
    reasonTemplate: (i) => `Zinc at ${i.value} ${i.unit} is suboptimal — common in plant-forward eaters and hard trainers.`,
  },
  coq10_ubiquinol: {
    name: "Ubiquinol 100–200 mg",
    forms: ["softgel"],
    defaultDose: "100–200 mg/day with a fatty meal",
    evidence: "moderate",
    biomarkerKey: "CoQ10",
    reasonTemplate: (i) => `Low CoQ10 (${i.value} ${i.unit}) in a statin user often improves symptoms over 8–12 weeks.`,
  },
  berberine: {
    name: "Berberine 500 mg (with meals)",
    forms: ["capsule"],
    defaultDose: "500 mg 2–3× daily before meals",
    evidence: "moderate",
    biomarkerKey: "HbA1c",
    reasonTemplate: (i) => `An HbA1c of ${i.value}% is in the prediabetes band — berberine has RCT support for glycemic control, but clear it with your clinician if you take diabetes meds.`,
    interactsWith: ["Metformin", "Sulfonylureas", "Cyclosporine"],
    cautionWhen: ["pregnancy"],
  },
  myo_inositol: {
    name: "Myo-inositol 2–4 g",
    forms: ["powder", "capsule"],
    defaultDose: "2 g twice daily",
    evidence: "moderate",
    biomarkerKey: "HbA1c",
    reasonTemplate: () => "Supportive for insulin sensitivity, especially with PCOS phenotypes.",
  },
  tart_cherry: {
    name: "Tart cherry extract",
    forms: ["capsule", "powder"],
    defaultDose: "480 mg/day or 8 oz tart cherry juice",
    evidence: "emerging",
    biomarkerKey: "Uric acid",
    reasonTemplate: (i) => `Uric acid at ${i.value} ${i.unit} is near the saturation threshold.`,
  },
  psyllium: {
    name: "Psyllium husk 10 g",
    forms: ["powder"],
    defaultDose: "5 g twice daily with water",
    evidence: "strong",
    biomarkerKey: "LDL-C",
    reasonTemplate: () => "Soluble fiber lowers LDL-C by 5–10% over 8 weeks and is first-line alongside diet changes.",
  },
  plant_sterols: {
    name: "Plant sterols 2 g",
    forms: ["capsule", "softgel"],
    defaultDose: "2 g with main meal",
    evidence: "strong",
    biomarkerKey: "LDL-C",
    reasonTemplate: () => "Plant sterols reduce LDL absorption; additive with statin therapy.",
  },
  selenium: {
    name: "Selenium 100–200 mcg",
    forms: ["capsule"],
    defaultDose: "100–200 mcg/day, not exceeding 400 mcg total including diet",
    evidence: "moderate",
    biomarkerKey: "Selenium",
    reasonTemplate: (i) => `Selenium at ${i.value} ${i.unit} — supports thyroid hormone conversion and glutathione peroxidase.`,
    cautionWhen: ["history of type 2 diabetes (SELECT trial signal)"],
  },
}

function formAllowed(entry: Catalog[string], phenotype: Phenotype): boolean {
  if (phenotype.supplementFormPreference === "any") return true
  const banned = new Set(["capsule", "softgel", "tablet", "pill"])
  return entry.forms.some((f) => !banned.has(f))
}

function dietCompatible(entry: Catalog[string], phenotype: Phenotype): boolean {
  if (phenotype.dietPreference !== "vegan") return true
  if (entry.veganSafe) return true
  // Iron bisglycinate, omega-3 (unless algal), gelatin softgels — mark caller-side.
  return !/iron|omega|softgel|fish|gelatin/i.test(entry.name)
}

function skippedByPhenotype(entry: Catalog[string], phenotype: Phenotype): boolean {
  if (entry.skipIf && entry.skipIf(phenotype)) return true
  // Safety cutouts:
  if (entry.biomarkerKey === "Magnesium" && phenotype.flags.kidneyDisease) return true
  if (entry.biomarkerKey === "LDL-C" && entry.name.includes("sterols") && phenotype.flags.pregnancy) return true
  if (entry.name.startsWith("Iron") && phenotype.symptomIds.includes("hemochromatosis")) return true
  if (entry.name.startsWith("Berberine") && phenotype.flags.pregnancy) return true
  return false
}

/** Choose the 1–2 best catalog picks for each non-optimal interpretation. */
export function recommendSupplementsFromInterpretations(
  interpretations: PersonalInterpretation[],
  phenotype: Phenotype
): SupplementRecommendation[] {
  const out: SupplementRecommendation[] = []

  for (const interp of interpretations) {
    if (interp.status === "optimal" || interp.status === "unknown") continue

    const candidates = Object.values(CATALOG).filter(
      (c) =>
        c.biomarkerKey === interp.biomarkerKey &&
        !skippedByPhenotype(c, phenotype) &&
        formAllowed(c, phenotype) &&
        dietCompatible(c, phenotype)
    )

    // Rank: strong > moderate > emerging > weak, then alphabetical for stability.
    const ranked = candidates.sort((a, b) => {
      const order: Record<EvidenceStrength, number> = { strong: 0, moderate: 1, emerging: 2, weak: 3 }
      return order[a.evidence] - order[b.evidence] || a.name.localeCompare(b.name)
    })

    // Also look for supplement hints directly from phenotype rules — dedupe by canonical name prefix.
    const seen = new Set<string>()
    for (const entry of ranked.slice(0, 2)) {
      const key = entry.name.split(" ")[0].toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const banned = new Set(["capsule", "softgel", "tablet", "pill"])
      const preferredForm =
        phenotype.supplementFormPreference === "no_pills"
          ? entry.forms.find((f) => !banned.has(f)) ?? "any"
          : entry.forms[0] ?? "any"
      out.push({
        name: entry.name,
        reason: entry.reasonTemplate(interp),
        biomarkerKey: interp.biomarkerKey,
        dose: entry.defaultDose,
        form: preferredForm,
        evidence: entry.evidence,
        interactsWith: entry.interactsWith ?? [],
        cautionWhen: entry.cautionWhen ?? [],
      })
    }
  }

  // Deduplicate by name — same supplement may be suggested by more than one biomarker.
  const seenGlobally = new Set<string>()
  return out.filter((r) => {
    if (seenGlobally.has(r.name)) return false
    seenGlobally.add(r.name)
    return true
  })
}
