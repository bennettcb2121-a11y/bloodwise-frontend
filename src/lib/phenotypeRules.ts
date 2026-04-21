/**
 * Explicit, editable rule data that modifies biomarker interpretation based on phenotype.
 *
 * Each rule is a tuple of (predicate over phenotype + value) → { adjustedStatus, note, supplementHints }.
 * This is deliberately NOT a free-text LLM decision — the LLM only narrates what the rules already decide.
 */

import type { Phenotype } from "@/src/lib/phenotypeContext"

export type BiomarkerStatus = "optimal" | "suboptimal" | "low" | "high" | "deficient" | "unknown"

export type PhenotypeRule = {
  id: string
  biomarkerKey: string
  /** When this rule applies to a specific value, return adjusted status + editorial note. */
  appliesTo: (phenotype: Phenotype, value: number) => boolean
  status?: BiomarkerStatus
  note: string
  /** Supplement directives that other layers respect (supplementRecommendations.ts filter). */
  supplementHints?: {
    suggest?: string[]
    avoid?: string[]
    /** Preferred form when the user has chosen "no_pills". */
    preferForm?: string[]
  }
  /** Hard safety signal — when set, interpret layer escalates to "see clinician" narrative. */
  redFlag?: boolean
}

export const PHENOTYPE_RULES: PhenotypeRule[] = [
  // ————— Ferritin —————
  {
    id: "ferritin_female_endurance_low",
    biomarkerKey: "Ferritin",
    appliesTo: (p, v) =>
      p.sex === "female" &&
      (p.trainingFocus === "endurance_athlete" || p.trainingFocus === "female_athlete") &&
      v < 30,
    status: "low",
    note:
      "Endurance-training women show performance decrements well before the lab's lower reference — a ferritin under 30 ng/mL is often symptomatic here even when flagged normal.",
    supplementHints: {
      suggest: ["Iron bisglycinate 18–25 mg/day with vitamin C", "Heme iron 2–3×/week"],
    },
  },
  {
    id: "ferritin_high_inflammation",
    biomarkerKey: "Ferritin",
    appliesTo: (_p, v) => v > 300,
    note:
      "High ferritin in a well person is often an acute-phase reactant signal. Pair with hs-CRP; if CRP is normal and ferritin stays >300, discuss with a clinician.",
  },
  {
    id: "ferritin_pregnancy_low",
    biomarkerKey: "Ferritin",
    appliesTo: (p, v) => p.flags.pregnancy && v < 30,
    status: "low",
    note:
      "In pregnancy, ferritin under 30 ng/mL is the commonly used threshold for repletion. Work with your OB on specific supplementation.",
  },

  // ————— Vitamin D —————
  {
    id: "vitd_older_adult_low",
    biomarkerKey: "Vitamin D",
    appliesTo: (p, v) => (p.ageBand === "65_plus" || p.ageBand === "55_64") && v < 40,
    status: "suboptimal",
    note:
      "Older adults lose cutaneous vitamin D synthesis efficiency. Aim for 40–60 ng/mL for bone and muscle function rather than the population-general floor.",
    supplementHints: {
      suggest: ["Vitamin D3 2000–4000 IU/day with a fatty meal"],
    },
  },
  {
    id: "vitd_high_toxicity",
    biomarkerKey: "Vitamin D",
    appliesTo: (_p, v) => v > 100,
    status: "high",
    note: "A 25-OH level above 100 ng/mL can drive hypercalcemia — pause supplementation and recheck with your clinician.",
    supplementHints: { avoid: ["Vitamin D3", "Vitamin D2"] },
    redFlag: true,
  },

  // ————— Magnesium —————
  {
    id: "magnesium_low_pills_avoid",
    biomarkerKey: "Magnesium",
    appliesTo: (_p, v) => v < 1.8,
    status: "low",
    note:
      "Serum magnesium is insensitive — a value under 1.8 mg/dL usually reflects a real deficit. Start magnesium glycinate or citrate; oxide is poorly absorbed.",
    supplementHints: {
      suggest: ["Magnesium glycinate 300–400 mg elemental before bed"],
      avoid: ["Magnesium oxide"],
      preferForm: ["powder", "drink"],
    },
  },

  // ————— Homocysteine —————
  {
    id: "homocysteine_elevated_bvitamin_gap",
    biomarkerKey: "Homocysteine",
    appliesTo: (_p, v) => v >= 11,
    status: "suboptimal",
    note:
      "Elevated homocysteine is most often a functional B12, folate, or B6 deficiency. Repleting those vitamins and re-testing in 8–12 weeks is first line.",
    supplementHints: {
      suggest: [
        "Methylfolate 400–800 mcg/day",
        "Methylcobalamin B12 1000 mcg/day",
        "Vitamin B6 25–50 mg/day",
      ],
    },
  },
  {
    id: "homocysteine_pregnancy",
    biomarkerKey: "Homocysteine",
    appliesTo: (p, v) => p.flags.pregnancy && v >= 8,
    status: "suboptimal",
    note:
      "In pregnancy, lower homocysteine is preferred. Review folate and B12 intake with your OB.",
  },

  // ————— HbA1c —————
  {
    id: "hba1c_prediabetic",
    biomarkerKey: "HbA1c",
    appliesTo: (_p, v) => v >= 5.7 && v < 6.5,
    status: "suboptimal",
    note:
      "This is the prediabetes range. The highest-leverage move is 5–7% weight loss plus 150 min/week of moderate exercise, with a lower-glycemic food pattern.",
    supplementHints: {
      suggest: ["Berberine 500 mg 2–3×/day with meals (check meds first)", "Myo-inositol 2–4 g/day"],
      avoid: ["High-dose chromium picolinate (>1000 mcg/day)"],
    },
  },
  {
    id: "hba1c_diabetic_seek_care",
    biomarkerKey: "HbA1c",
    appliesTo: (_p, v) => v >= 6.5,
    status: "high",
    note: "HbA1c ≥ 6.5% meets diabetes criteria. Please review with a clinician before changing any medications or supplements.",
    redFlag: true,
  },

  // ————— LDL-C / ApoB —————
  {
    id: "ldl_high_family_hx",
    biomarkerKey: "LDL-C",
    appliesTo: (p, v) => p.healthGoalIds.includes("heart_health") && v >= 160,
    status: "high",
    note:
      "LDL-C at 160+ in someone specifically concerned about heart health usually warrants ApoB or Lp(a) follow-up and a clinician discussion on lipid-lowering therapy.",
  },
  {
    id: "apob_high",
    biomarkerKey: "ApoB",
    appliesTo: (_p, v) => v > 100,
    status: "high",
    note:
      "ApoB above 100 mg/dL is the atherogenic particle burden most current guidelines prioritize over LDL-C. Discuss targets with your clinician.",
  },

  // ————— TSH —————
  {
    id: "tsh_subclinical_high",
    biomarkerKey: "TSH",
    appliesTo: (p, v) => !p.flags.thyroidMedication && v >= 4.5 && v < 10,
    status: "suboptimal",
    note:
      "Subclinical hypothyroidism (TSH 4.5–10) is often paired with positive TPO antibodies. Add Free T4 and TPO antibodies; repeat in 6–8 weeks before treating.",
  },
  {
    id: "tsh_suppressed_on_med",
    biomarkerKey: "TSH",
    appliesTo: (p, v) => p.flags.thyroidMedication && v < 0.4,
    status: "low",
    note: "A suppressed TSH while on thyroid medication usually means the dose is a touch too high — discuss with your clinician.",
  },

  // ————— hs-CRP —————
  {
    id: "hscrp_high_chronic",
    biomarkerKey: "hs-CRP",
    appliesTo: (_p, v) => v >= 3,
    status: "high",
    note:
      "hs-CRP ≥ 3 mg/L is the higher-cardio-risk band. Repeat in 4–6 weeks to rule out acute illness before acting on it.",
  },
  {
    id: "hscrp_training_elevated",
    biomarkerKey: "hs-CRP",
    appliesTo: (p, v) =>
      (p.trainingFocus === "endurance_athlete" || p.trainingFocus === "high_volume") &&
      v >= 2 &&
      v < 5,
    note:
      "Elevated hs-CRP in high-volume athletes can reflect recent hard training or under-recovery — time the test to a light week when possible.",
  },

  // ————— Testosterone —————
  {
    id: "testosterone_low_male",
    biomarkerKey: "Testosterone",
    appliesTo: (p, v) => p.sex === "male" && v < 300,
    status: "low",
    note:
      "Total testosterone under 300 ng/dL in men is the traditional threshold for hypogonadism. Pair with LH, FSH, SHBG, and prolactin before starting therapy.",
  },
  {
    id: "testosterone_high_female_pcos",
    biomarkerKey: "Testosterone",
    appliesTo: (p, v) => p.sex === "female" && v > 60,
    status: "high",
    note: "A high total testosterone in women prompts PCOS and adrenal workup — consider SHBG, DHEA-S, and 17-OHP.",
  },

  // ————— Omega-3 Index —————
  {
    id: "o3_low_need_boost",
    biomarkerKey: "Omega-3 Index",
    appliesTo: (_p, v) => v < 6,
    status: "suboptimal",
    note:
      "An Omega-3 Index under 6% is where we see the strongest cardiovascular-risk signal. 1–2 g/day EPA+DHA typically brings it into the 8% target over ~4 months.",
    supplementHints: {
      suggest: ["EPA+DHA 1–2 g/day with a fatty meal"],
      preferForm: ["liquid", "gummy"],
    },
  },

  // ————— Uric acid —————
  {
    id: "uric_acid_high_gout",
    biomarkerKey: "Uric acid",
    appliesTo: (_p, v) => v >= 6.8,
    status: "high",
    note:
      "A uric acid at or above 6.8 mg/dL is near the saturation point for urate crystals. Reduce fructose/alcohol and add tart cherry; speak with your clinician about allopurinol if you have had gout flares.",
  },

  // ————— Vegan / vegetarian context —————
  {
    id: "b12_vegan_low_normal",
    biomarkerKey: "Vitamin B12",
    appliesTo: (p, v) => (p.dietPreference === "vegan" || p.dietPreference === "vegetarian") && v < 400,
    status: "suboptimal",
    note:
      "Plant-based eaters sit within the lab-normal range while running functionally low. Pair B12 with MMA or holoTC for certainty, and consider routine 500–1000 mcg/day.",
    supplementHints: { suggest: ["Methylcobalamin B12 500–1000 mcg/day"] },
  },

  // ————— Statin context —————
  {
    id: "statin_muscle_check_coq10",
    biomarkerKey: "CoQ10",
    appliesTo: (p, v) => p.flags.onStatin && v < 0.8,
    status: "suboptimal",
    note:
      "Low CoQ10 in a statin user with muscle aches is a reasonable reason to trial 100–200 mg/day ubiquinol for 8–12 weeks with clinician awareness.",
    supplementHints: { suggest: ["Ubiquinol 100–200 mg/day with a fatty meal"] },
  },

  // ————— eGFR & kidney caution —————
  {
    id: "egfr_ckd_warning",
    biomarkerKey: "eGFR",
    appliesTo: (p, v) => !p.flags.kidneyDisease && v < 60,
    status: "low",
    note:
      "An eGFR under 60 mL/min/1.73m² sustained over 3 months meets CKD criteria. Re-test with cystatin C. Avoid chronic NSAIDs and high-dose protein while this is confirmed.",
    supplementHints: {
      avoid: ["High-dose creatine (interferes with eGFR estimate)", "High-dose NSAID-like herbs"],
    },
  },

  // ————— Zinc / female athlete context —————
  {
    id: "zinc_low_female_athlete",
    biomarkerKey: "Zinc",
    appliesTo: (p, v) => p.sex === "female" && v < 80,
    status: "suboptimal",
    note:
      "Women, especially plant-forward eaters and athletes, are often zinc-marginal. 15–25 mg/day zinc picolinate for 8–12 weeks is a reasonable trial; don't stack with iron at the same meal.",
    supplementHints: {
      suggest: ["Zinc picolinate 15–25 mg/day"],
      avoid: ["High-dose zinc (>40 mg/day chronically)"],
    },
  },
]

/** Get every rule that fires for a given biomarker value and phenotype. */
export function getMatchingRules(
  biomarkerKey: string,
  phenotype: Phenotype,
  value: number
): PhenotypeRule[] {
  return PHENOTYPE_RULES.filter(
    (r) => r.biomarkerKey === biomarkerKey && r.appliesTo(phenotype, value)
  )
}
