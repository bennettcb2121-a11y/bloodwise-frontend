export type UserClass = "endurance" | "strength" | "mixed" | "general"
export type Sex = "male" | "female" | "unknown"
export type AgeGroup = "adolescent" | "adult" | "masters"

export type BiomarkerRange = {
  deficient?: number
  suboptimalMin?: number
  optimalMin: number
  optimalMax: number
  /**
   * When set with `highMin`, implements ADA-style bands: optimal is [optimalMin, elevatedMin),
   * suboptimal is [elevatedMin, highMin), high is >= highMin (e.g. HbA1c prediabetes vs diabetes).
   */
  elevatedMin?: number
  highMin?: number
  /** Optional “concern” line for education / elevation tiering (not always used for status). */
  high?: number
  /**
   * Typical US clinical lab reference interval (LabCorp/Quest-style "normal" range) for this
   * marker — intentionally wider than Clarion's optimal band. Used by the analysis report to
   * contrast "textbook lab normal" against Clarion's tighter personal target.
   * Only attach to the `general` band; other bands inherit.
   */
  labReference?: {
    min: number
    max: number
    source?: string
  }
}

export type BiomarkerProfileRanges = {
  general: BiomarkerRange
  endurance?: BiomarkerRange
  strength?: BiomarkerRange
  mixed?: BiomarkerRange
  female?: Partial<BiomarkerRange>
  male?: Partial<BiomarkerRange>
  adolescent?: Partial<BiomarkerRange>
  masters?: Partial<BiomarkerRange>
}

export type BiomarkerDatabaseEntry = {
  description: string
  whyItMatters: string
  foods?: string
  lifestyle?: string
  supplementNotes?: string
  retest?: string
  recommendedTests?: string[]
  researchSummary?: string
  /** What the biomarker does (bullet list for UI). */
  whatItDoes?: string[]
  /** Symptoms when low. */
  symptomsLow?: string[]
  /** Symptoms when high. */
  symptomsHigh?: string[]
  ranges: BiomarkerProfileRanges
}

export const biomarkerDatabase: Record<string, BiomarkerDatabaseEntry> = {
  Ferritin: {
    description:
      "Ferritin is the body's iron storage protein. A blood ferritin reading estimates the reserve the body draws on before hemoglobin itself falls.",
    whyItMatters:
      "Low ferritin can limit energy, oxygen transport, and endurance. Iron deficiency is common, but iron supplementation carries real downside risk — particularly for adult men and postmenopausal women, in whom unexplained low-normal ferritin more often reflects hereditary iron regulation than dietary shortfall. When the cause of anemia is unclear, workup comes before repletion.",
    foods:
      "Heme iron from red meat, shellfish, and sardines absorbs several times more efficiently than iron from lentils, beans, or greens. Vitamin C at the same meal improves plant-iron uptake; coffee, tea, and a calcium-heavy meal blunt it. During repletion, keep iron meals separate from coffee and dairy.",
    lifestyle:
      "Reduce stealth inhibitors of iron absorption around iron-heavy meals: coffee, tea, calcium supplements. If ferritin keeps falling, look for the reason: blood loss, GI issues, training load, diet quality. Retest rather than guessing.",
    supplementNotes:
      "If low or suboptimal: 25–65 mg elemental iron every other day or daily depending on tolerance and clinician context. Alternate-day dosing often improves tolerance. Retest in 8–12 weeks. Do not megadose. Accidental ingestion of adult iron tablets is a leading cause of fatal poisoning in young children; store them out of reach and in original packaging.",
    retest: "Retest in 8–12 weeks after intervention.",
    recommendedTests: ["CBC", "Iron Panel", "Transferrin Saturation"],
    researchSummary:
      "Endurance athletes with persistent fatigue are sometimes repleted to ferritin targets well above the clinical anemia cutoff, though randomized evidence for symptom benefit in non-anemic athletes remains mixed.",
    whatItDoes: [
      "Iron storage",
      "Oxygen transport via hemoglobin",
      "Cellular energy production",
      "Cognitive function",
      "Hair follicle maintenance",
    ],
    symptomsLow: ["Fatigue", "Poor endurance", "Brain fog", "Hair shedding", "Restless legs"],
    symptomsHigh: ["Nausea", "Liver and joint damage in hereditary iron overload"],
    ranges: {
      general: {
        deficient: 20,
        suboptimalMin: 30,
        optimalMin: 40,
        optimalMax: 150,
        high: 300,
        labReference: { min: 15, max: 300, source: "LabCorp adult" },
      },
      endurance: {
        deficient: 30,
        suboptimalMin: 50,
        optimalMin: 60,
        optimalMax: 150,
        high: 300,
      },
      strength: {
        deficient: 25,
        suboptimalMin: 45,
        optimalMin: 50,
        optimalMax: 150,
        high: 300,
      },
      mixed: {
        deficient: 25,
        suboptimalMin: 45,
        optimalMin: 50,
        optimalMax: 150,
        high: 300,
      },
      female: {
        optimalMax: 200,
      },
      adolescent: {
        suboptimalMin: 50,
      },
    },
  },

  "Vitamin D": {
    description:
      "25-OH Vitamin D reflects vitamin D status. It supports musculoskeletal health, immunity, recovery, and bone function.",
    whyItMatters:
      "Vitamin D status is one of the most common low or low-normal findings. It connects to immunity, bone health, and general wellness. High-dose use should be personalized and clinician-supervised.",
    whatItDoes: [
      "Calcium and phosphate absorption",
      "Bone mineralization",
      "Skeletal muscle function",
      "Immune regulation",
    ],
    symptomsLow: ["Fatigue", "Weaker immunity", "Low mood", "Bone or muscle aches"],
    symptomsHigh: ["Nausea", "Weakness", "Confusion (rare)"],
    foods:
      "Food sources are limited. Fatty fish (salmon, trout, sardines) and fortified milk contribute modest amounts; egg yolks add a little. Sun exposure varies too much by latitude, season, and skin tone to rely on, so most people close the gap with a measured supplement.",
    lifestyle:
      "Consistent sunlight when feasible. Pair supplementation with regular meals for adherence. Retest after a stable routine (8–12 weeks), not after a few random doses.",
    supplementNotes:
      "Low-risk maintenance: 1,000–2,000 IU/day. For clearly low values, many protocols use 2,000–5,000 IU/day for a repletion window; recheck in 8–12 weeks. D3 (cholecalciferol) raises serum 25-OH more reliably than D2 (ergocalciferol) in most controlled trials, which is why most guidelines default to it. Many adults do well with total 25-OH vitamin D between about 30–100 ng/mL; toxicity is uncommon below roughly 150 ng/mL—avoid megadoses without monitoring.",
    retest: "Retest in 8–12 weeks.",
    recommendedTests: ["Calcium", "PTH"],
    researchSummary:
      "Deficiency is associated with bone and muscle symptoms; correcting clear deficiency is evidence-supported; supraphysiologic targets are not established for performance.",
    ranges: {
      general: {
        deficient: 20,
        suboptimalMin: 30,
        optimalMin: 30,
        optimalMax: 100,
        high: 150,
        labReference: { min: 30, max: 100, source: "LabCorp 25-OH Vitamin D" },
      },
      endurance: {
        deficient: 20,
        suboptimalMin: 35,
        optimalMin: 40,
        optimalMax: 100,
        high: 150,
      },
      strength: {
        deficient: 20,
        suboptimalMin: 30,
        optimalMin: 35,
        optimalMax: 100,
        high: 150,
      },
      mixed: {
        deficient: 20,
        suboptimalMin: 30,
        optimalMin: 35,
        optimalMax: 100,
        high: 150,
      },
    },
  },

  Magnesium: {
    description:
      "Magnesium is a cofactor for hundreds of enzymes, including those that regenerate ATP and regulate nerve-and-muscle excitability. Low status typically shows up as cramping, restless sleep, and slow recovery rather than a single dramatic symptom.",
    whatItDoes: [
      "ATP regeneration",
      "Nerve and muscle excitability",
      "Smooth muscle relaxation",
      "Bone structure",
    ],
    symptomsLow: ["Muscle cramps", "Fatigue", "Poor sleep", "Restlessness"],
    symptomsHigh: ["Diarrhea", "Weakness (rare)"],
    whyItMatters:
      "Low magnesium can contribute to poor recovery, cramps, sleep issues, and neuromuscular symptoms. NIH ODS notes many adults fall short on intake; use caution with supplements in kidney disease (hypermagnesemia risk).",
    foods:
      "Magnesium is concentrated in seeds, nuts, legumes, whole grains, and dark leafy greens. A day that includes a handful of nuts, a bean-based meal, and a green vegetable covers most adult requirements; ultra-processed patterns miss it.",
    lifestyle:
      "Improve sleep timing and recovery. Review alcohol intake if magnesium stays stubbornly low. Spread supplemental intake if GI tolerance is an issue.",
    supplementNotes:
      "Start 100–200 mg elemental magnesium per day, often in the evening; titrate toward 200–350 mg/day. NIH ODS supplemental UL 350 mg/day unless clinician directs otherwise. Glycinate is often better tolerated. Retest in 8–12 weeks.",
    retest: "Retest in 8–12 weeks.",
    recommendedTests: [],
    researchSummary:
      "Athletes can lose magnesium via sweat; intake adequacy is supported by dietary guidance and ODS intake data for the general population.",
    ranges: {
      general: {
        deficient: 1.7,
        suboptimalMin: 2.0,
        optimalMin: 2.0,
        optimalMax: 2.2,
        high: 2.5,
        labReference: { min: 1.6, max: 2.3, source: "LabCorp serum Mg" },
      },
      endurance: {
        deficient: 1.8,
        suboptimalMin: 2.1,
        optimalMin: 2.1,
        optimalMax: 2.3,
        high: 2.5,
      },
      strength: {
        deficient: 1.8,
        suboptimalMin: 2.0,
        optimalMin: 2.0,
        optimalMax: 2.3,
        high: 2.5,
      },
      mixed: {
        deficient: 1.8,
        suboptimalMin: 2.0,
        optimalMin: 2.0,
        optimalMax: 2.3,
        high: 2.5,
      },
    },
  },

  "Vitamin B12": {
    description:
      "Vitamin B12 supports red blood cell production, nervous system function, and energy metabolism.",
    whyItMatters:
      "Low or low-normal B12 often links to fatigue, RBC support, and neurological health. Absorption depends on stomach acid and intrinsic factor, so long-term acid-suppressing medication, metformin, gastric surgery, and older age all raise the risk of a deficiency that blood levels can underestimate.",
    whatItDoes: [
      "Red blood cell production",
      "Myelin maintenance in nerves",
      "Methylation reactions",
      "DNA synthesis",
    ],
    symptomsLow: ["Fatigue", "Brain fog", "Numbness or tingling", "Anemia"],
    foods:
      "B12 occurs naturally only in animal foods — clams and liver are the densest, with meat, fish, eggs, and dairy contributing steadily. Plant-based eaters almost always need fortified foods or a supplement; intake from greens or fermented foods is not reliable.",
    lifestyle:
      "Review medications (PPIs, metformin) that can affect absorption. Consider GI absorption issues if levels stay low despite intake. Retest rather than stacking more B12; severe deficiency or neurologic symptoms need clinician-guided treatment.",
    supplementNotes:
      "Low-normal or low: often 1,000 mcg/day oral or sublingual. Methylcobalamin and cyanocobalamin are both used. Retest in 8–12 weeks.",
    retest: "Retest in 8–12 weeks.",
    recommendedTests: ["Folate", "CBC"],
    researchSummary:
      "Clinical deficiency merits treatment; mild low-normal values may warrant context (diet, medications, absorption).",
    ranges: {
      general: {
        deficient: 200,
        suboptimalMin: 250,
        optimalMin: 250,
        optimalMax: 1200,
        high: 2000,
        labReference: { min: 232, max: 1245, source: "LabCorp serum B12" },
      },
      endurance: {
        deficient: 250,
        suboptimalMin: 350,
        optimalMin: 500,
        optimalMax: 1200,
        high: 2000,
      },
      strength: {
        deficient: 250,
        suboptimalMin: 350,
        optimalMin: 450,
        optimalMax: 1200,
        high: 2000,
      },
      mixed: {
        deficient: 250,
        suboptimalMin: 350,
        optimalMin: 450,
        optimalMax: 1200,
        high: 2000,
      },
      adolescent: {
        optimalMin: 450,
      },
      masters: {
        optimalMin: 450,
      },
    },
  },

  Folate: {
    description:
      "Folate (B9) is essential for DNA synthesis, cell division, and red blood cell formation. Serum or RBC folate reflects status.",
    whyItMatters:
      "Folate is broadly relevant to blood health and pairs with B12; deficiency can contribute to anemia and elevated homocysteine. High-dose folic acid can correct the anemia of a B12 deficiency while neurologic damage continues, which is why a low folate result should always be read alongside B12.",
    whatItDoes: ["DNA synthesis", "Cell division", "Red blood cell formation", "Homocysteine metabolism"],
    symptomsLow: ["Fatigue", "Anemia", "Elevated homocysteine", "Poor concentration"],
    foods:
      "The word comes from foliage — leafy greens, legumes, and asparagus are the natural sources. Since 1998, enriched flour and cereals have contributed a significant share of most American adults' intake.",
    lifestyle:
      "If folate is low, confirm B12 status too. Avoid high-dose folic acid without clinician context.",
    supplementNotes:
      "400–800 mcg/day is common; avoid above 1,000 mcg/day folic acid without guidance. Methylfolate (5-MTHF) is an active form.",
    retest: "Retest in 8–12 weeks if repleting.",
    recommendedTests: ["Vitamin B12", "CBC", "Homocysteine"],
    researchSummary:
      "Folic acid fortification has reduced deficiency in many populations; active forms (5-MTHF) may be preferred when methylation is a consideration.",
    ranges: {
      general: {
        deficient: 3,
        suboptimalMin: 4,
        optimalMin: 4,
        optimalMax: 20,
        high: 24,
        labReference: { min: 3, max: 20, source: "LabCorp serum folate" },
      },
    },
  },

  CRP: {
    description:
      "C-reactive protein (often a broader-assay CRP); rises with infection, inflammation, and tissue injury.",
    whyItMatters:
      "Elevated CRP is nonspecific—infection, strenuous training, injury, or chronic inflammatory conditions can raise it. For cardiometabolic risk refinement, many guidelines reference hs-CRP rather than generic CRP.",
    foods:
      "CRP is a downstream signal. The most reliable dietary effect comes from an overall pattern — regular fatty fish, olive oil in place of butter, a steady base of vegetables, fruit, and legumes — rather than from any single anti-inflammatory food.",
    lifestyle:
      "Check recovery load, sleep, illness, injury, and overall stress before overreacting to a single value.",
    supplementNotes:
      "Omega-3s can be useful when inflammation patterns and diet support that choice.",
    retest: "Retest in 2–6 weeks depending on context.",
    recommendedTests: ["CBC"],
    researchSummary:
      "CRP rises with acute illness and heavy training; persistent unexplained elevation warrants medical evaluation.",
    ranges: {
      general: {
        optimalMin: 0,
        optimalMax: 1,
        high: 3,
        labReference: { min: 0, max: 10, source: "typical CRP reference" },
      },
      endurance: {
        optimalMin: 0,
        optimalMax: 1,
        high: 3,
      },
      strength: {
        optimalMin: 0,
        optimalMax: 1.5,
        high: 3,
      },
      mixed: {
        optimalMin: 0,
        optimalMax: 1.2,
        high: 3,
      },
    },
  },

  Glucose: {
    description:
      "Fasting glucose reflects metabolic health and day-to-day fuel regulation. Complements HbA1c with a more immediate metabolic snapshot.",
    whyItMatters:
      "ADA standards support lifestyle-first approaches for prevention and delay of type 2 diabetes. Poor fasting glucose can signal impaired metabolic flexibility.",
    foods:
      "More legumes, oats, beans, berries, vegetables; protein-forward breakfasts. Fewer sugar-sweetened beverages and refined carb snacks.",
    lifestyle:
      "Fasting glucose reflects the average of recent days, not a single meal. Short walks after eating, breaks from long sitting, and a steady sleep schedule each lower it modestly; together, over weeks, they shift a fasting value by several points.",
    supplementNotes:
      "Psyllium 5–10 g/day in divided doses before or with meals. Berberine only with clinician awareness. Lifestyle first; retest in 8–12 weeks.",
    retest: "Retest in 8–12 weeks.",
    recommendedTests: ["HbA1c", "Insulin"],
    researchSummary:
      "Fasting glucose aligns with ADA categories for prediabetes/diabetes when paired with confirmatory testing; exercise improves insulin sensitivity in many people.",
    ranges: {
      general: {
        optimalMin: 75,
        optimalMax: 95,
        high: 100,
        labReference: { min: 70, max: 99, source: "ADA fasting normal" },
      },
      endurance: {
        optimalMin: 75,
        optimalMax: 92,
        high: 100,
      },
      strength: {
        optimalMin: 75,
        optimalMax: 95,
        high: 100,
      },
      mixed: {
        optimalMin: 75,
        optimalMax: 95,
        high: 100,
      },
    },
  },

  Insulin: {
    description:
      "Fasting insulin helps indicate insulin sensitivity and metabolic flexibility.",
    whyItMatters:
      "Higher fasting insulin can suggest reduced insulin sensitivity even when glucose still looks normal.",
    foods:
      "Higher-fiber diet, adequate protein, stable meal patterns, lower excess refined foods.",
    lifestyle:
      "Training quality, sleep, body composition, and meal timing all affect insulin dynamics.",
    supplementNotes:
      "Usually lifestyle-first unless broader medical evaluation suggests otherwise.",
    retest: "Retest in 6–12 weeks.",
    recommendedTests: ["HbA1c", "Glucose"],
    researchSummary:
      "Fasting insulin correlates with insulin sensitivity; reference intervals vary by lab and assay.",
    ranges: {
      general: {
        optimalMin: 2,
        optimalMax: 18,
        high: 25,
        labReference: { min: 2.6, max: 24.9, source: "LabCorp fasting insulin" },
      },
      endurance: {
        optimalMin: 2,
        optimalMax: 12,
        high: 18,
      },
      strength: {
        optimalMin: 2,
        optimalMax: 18,
        high: 25,
      },
      mixed: {
        optimalMin: 2,
        optimalMax: 18,
        high: 25,
      },
    },
  },

  Testosterone: {
    description:
      "Total testosterone; interpretation depends on sex, age, time of day, assay, and SHBG (affects free androgen).",
    whyItMatters:
      "In males, low values can associate with low energy availability, sleep debt, or medical causes. In females, reference ranges differ substantially—interpret with clinical context, not population “optimal” targets from male data.",
    foods:
      "Testosterone falls in response to low energy availability more than to any specific nutrient. A diet that supplies enough total calories and enough fat — roughly 20 to 35 percent of energy — supports normal production; severe restriction or very low-fat patterns tend to lower it.",
    lifestyle:
      "Training overload, poor sleep, chronic stress, and underfueling can all suppress testosterone.",
    supplementNotes:
      "Do not jump straight to supplements. First evaluate sleep, stress, calories, body composition, and training load.",
    retest: "Retest in 6–12 weeks.",
    recommendedTests: ["Free Testosterone", "LH", "FSH", "TSH"],
    researchSummary:
      "Optimal interpretation depends strongly on age, sex, sport demands, and energy availability.",
    ranges: {
      general: {
        optimalMin: 500,
        optimalMax: 900,
        high: 1000,
        labReference: { min: 264, max: 916, source: "LabCorp total T, adult male" },
      },
      endurance: {
        optimalMin: 500,
        optimalMax: 850,
        high: 950,
      },
      strength: {
        optimalMin: 600,
        optimalMax: 1000,
        high: 1100,
      },
      mixed: {
        optimalMin: 550,
        optimalMax: 950,
        high: 1050,
      },
      female: {
        optimalMin: 15,
        optimalMax: 70,
        high: 80,
      },
      masters: {
        optimalMin: 400,
        optimalMax: 800,
      },
    },
  },

  // ——— Core launch: CBC, CMP, iron, lipids, inflammation, thyroid (minimal entries for panel recommendation) ———
  Hemoglobin: {
    description: "Hemoglobin carries oxygen in red blood cells; central to the CBC.",
    whyItMatters:
      "Low hemoglobin suggests anemia until proven otherwise—interpret with MCV, ferritin, B12, and folate, and clinical context (bleeding, hemolysis). High values can reflect hemoconcentration or other causes.",
    foods: "Iron-rich foods, vitamin C for absorption.",
    lifestyle: "Hydration, altitude, training load.",
    supplementNotes: "Discuss with your doctor before supplementing; focus on diet and retest.",
    retest: "As advised by your provider.",
    recommendedTests: ["Hematocrit", "RBC", "Ferritin"],
    researchSummary: "Hemoglobin is the first value on a CBC to diverge when oxygen-carrying capacity falls, but it rarely stands alone — the pattern across MCV, RDW, and iron studies is what points to a cause.",
    ranges: {
      general: {
        deficient: 12,
        suboptimalMin: 13,
        optimalMin: 13,
        optimalMax: 17,
        high: 18,
        labReference: { min: 13.2, max: 16.6, source: "LabCorp adult male" },
      },
      endurance: { deficient: 13, suboptimalMin: 14, optimalMin: 14, optimalMax: 17, high: 18 },
      strength: { deficient: 12, suboptimalMin: 13, optimalMin: 13, optimalMax: 17, high: 18 },
      female: { deficient: 11, suboptimalMin: 12, optimalMin: 12, optimalMax: 15, high: 16 },
      masters: { deficient: 12, suboptimalMin: 13, optimalMin: 13, optimalMax: 16, high: 17 },
    },
  },
  Hematocrit: {
    description: "Hematocrit—percent of blood volume occupied by red cells (CBC).",
    whyItMatters: "Tracks with hemoglobin; low suggests anemia; high can reflect dehydration or polycythemia—interpret with the full CBC and clinical context.",
    foods: "Iron-rich diet if low.",
    lifestyle: "Hydration, training load.",
    supplementNotes: "Medical follow-up for abnormal values; do not self-treat.",
    retest: "As advised.",
    recommendedTests: ["Hemoglobin", "RBC", "Ferritin"],
    researchSummary: "Hematocrit moves with hemoglobin and adds little unique information on its own; its main role is cross-checking hemoglobin and identifying dehydration or apparent polycythemia when the two diverge.",
    ranges: {
      general: { deficient: 36, suboptimalMin: 38, optimalMin: 38, optimalMax: 50, high: 52 },
      endurance: { deficient: 39, suboptimalMin: 41, optimalMin: 41, optimalMax: 50, high: 52 },
      female: { deficient: 33, suboptimalMin: 36, optimalMin: 36, optimalMax: 44, high: 48 },
      masters: { deficient: 36, suboptimalMin: 38, optimalMin: 38, optimalMax: 48, high: 50 },
    },
  },
  RBC: {
    description: "Red blood cell count (CBC).",
    whyItMatters:
      "Interpret with hemoglobin, MCV, and iron/B12/folate status; isolated changes are less informative than the pattern.",
    foods: "Iron, B12, folate if deficient.",
    lifestyle: "Training, recovery.",
    supplementNotes: "Discuss with your doctor; focus on cause.",
    retest: "As advised.",
    recommendedTests: ["Hemoglobin", "MCV", "Ferritin"],
    researchSummary: "The red blood cell count anchors the CBC indices (MCV, MCH, RDW). It is rarely the first abnormal value on a panel; more often, the indices flag a problem before the count itself falls.",
    ranges: {
      general: { optimalMin: 4.2, optimalMax: 5.9, high: 6 },
      endurance: { optimalMin: 4.5, optimalMax: 5.9, high: 6 },
      female: { optimalMin: 4.0, optimalMax: 5.2, high: 5.5 },
      masters: { optimalMin: 4.0, optimalMax: 5.5, high: 5.8 },
    },
  },
  MCV: {
    description: "Mean corpuscular volume—average red blood cell size (CBC).",
    whyItMatters:
      "Classifies anemia pattern (microcytic vs macrocytic); pair with ferritin, B12, and folate rather than interpreting alone.",
    foods: "Context-dependent; B12/folate or iron.",
    lifestyle: "—",
    supplementNotes: "Medical follow-up; do not self-treat.",
    retest: "As advised.",
    recommendedTests: ["Hemoglobin", "B12", "Ferritin"],
    researchSummary: "Mean corpuscular volume sorts anemia into microcytic (iron deficiency, thalassemia), macrocytic (B12 or folate deficiency), or normocytic patterns — but early deficiencies often present with a normal MCV and a rising RDW.",
    ranges: { general: { optimalMin: 80, optimalMax: 100, high: 102 } },
  },
  "Serum iron": {
    description: "Circulating iron in blood; interpret with TIBC and ferritin.",
    whyItMatters: "Low serum iron with low ferritin supports iron deficiency.",
    foods: "Red meat, shellfish, legumes + vitamin C; avoid tea/coffee at meals.",
    lifestyle: "Avoid calcium/tea around iron-rich meals.",
    supplementNotes: "Only when ferritin/iron studies support it; retest in 8–12 weeks.",
    retest: "Retest in 8–12 weeks if supplementing.",
    recommendedTests: ["Ferritin", "TIBC", "Transferrin saturation"],
    researchSummary: "Serum iron fluctuates through the day and across meals, so a single value is less reliable than ferritin and transferrin saturation together for assessing iron status.",
    ranges: {
      general: {
        deficient: 40,
        suboptimalMin: 60,
        optimalMin: 60,
        optimalMax: 170,
        high: 200,
        labReference: { min: 50, max: 180, source: "LabCorp serum iron" },
      },
      endurance: { deficient: 50, suboptimalMin: 70, optimalMin: 70, optimalMax: 170, high: 200 },
      female: { deficient: 35, suboptimalMin: 55, optimalMin: 55, optimalMax: 170, high: 200 },
    },
  },
  TIBC: {
    description: "Total iron-binding capacity; rises in iron deficiency.",
    whyItMatters: "Used with serum iron to calculate transferrin saturation.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Interpret with ferritin and serum iron; medical guidance for treatment.",
    retest: "With iron panel in 8–12 weeks.",
    recommendedTests: ["Serum iron", "Ferritin", "Transferrin saturation"],
    researchSummary: "Total iron-binding capacity reflects circulating transferrin. It rises in iron deficiency and falls in inflammation or chronic disease; on its own it is nonspecific and is mainly used to calculate transferrin saturation.",
    ranges: { general: { optimalMin: 250, optimalMax: 400, high: 450 } },
  },
  "Transferrin saturation": {
    description: "Serum iron ÷ TIBC; reflects how well iron is being transported.",
    whyItMatters: "Low % sat suggests deficiency; very high can warrant caution with iron dosing.",
    foods: "Iron-rich foods + vitamin C.",
    lifestyle: "Avoid excess iron supplements if high.",
    supplementNotes: "Do not add iron if saturation is already high; discuss with provider.",
    retest: "With iron panel.",
    recommendedTests: ["Ferritin", "Serum iron", "TIBC"],
    researchSummary: "Transferrin saturation — serum iron divided by TIBC — is the screening test for hereditary hemochromatosis; values consistently above about 45 percent in men or 40 percent in women warrant further workup.",
    ranges: {
      general: {
        deficient: 15,
        suboptimalMin: 20,
        optimalMin: 20,
        optimalMax: 50,
        high: 55,
        labReference: { min: 15, max: 55, source: "LabCorp transferrin sat" },
      },
    },
  },
  HbA1c: {
    description: "Average blood glucose over ~3 months; key for metabolic health. ADA Standards of Care emphasize lifestyle interventions for prevention and delay of type 2 diabetes.",
    whyItMatters:
      "We use ADA thresholds: normal under 5.7%, prediabetes 5.7–6.4%, diabetes 6.5% or higher. Prediabetes is not diabetes—use it as a prompt for lifestyle and confirmatory testing, not panic.",
    foods: "The glycemic load of a meal is set mostly by carbohydrate quality. Intact grains, beans, and vegetables release glucose slowly; juice, soda, and refined starches spike it. Protein at each meal steadies the curve across the day.",
    lifestyle: "A ten- to fifteen-minute walk after the largest meal lowers the post-meal glucose peak in controlled studies. Resistance training adds muscle that stores glucose between meals; irregular sleep and frequent late-night eating work in the opposite direction.",
    supplementNotes: "Berberine at 500 mg taken with each of two or three meals produces glucose reductions in small trials that, in a handful of head-to-head studies, approach those of low-dose metformin. It interacts with diabetes and blood-thinning medications and is not used in pregnancy. Lifestyle-first; discuss with provider. Strong in-app warnings required.",
    retest: "Every 8–12 weeks if tracking.",
    recommendedTests: ["Fasting insulin", "Glucose"],
    researchSummary: "HbA1c reflects average glucose over the prior 8 to 12 weeks. The ADA thresholds (5.7% prediabetes, 6.5% diabetes) were set on outcome data; the value is distorted by conditions that shorten red-cell lifespan, including hemolysis, recent blood loss, and some hemoglobinopathies.",
    ranges: {
      general: {
        deficient: 4.0,
        suboptimalMin: 4.0,
        optimalMin: 4.5,
        optimalMax: 5.6,
        elevatedMin: 5.7,
        highMin: 6.5,
        high: 8,
        labReference: { min: 4.0, max: 5.6, source: "ADA normal" },
      },
    },
  },
  "Fasting insulin": {
    description: "Fasting insulin reflects insulin sensitivity.",
    whyItMatters: "High fasting insulin can precede elevated glucose.",
    foods: "Fiber, protein, lower refined carbs.",
    lifestyle: "Activity, sleep, stress.",
    supplementNotes: "Lifestyle-first; medical guidance for interventions.",
    retest: "6–12 weeks with metabolic panel.",
    recommendedTests: ["Glucose", "HbA1c"],
    researchSummary: "Fasting insulin rises before fasting glucose does in the typical trajectory of insulin resistance. Reference intervals vary widely by assay, so interpretation leans on paired glucose and clinical context more than an absolute cutoff.",
    ranges: {
      general: {
        optimalMin: 2,
        optimalMax: 18,
        high: 25,
        labReference: { min: 2.6, max: 24.9, source: "LabCorp fasting insulin" },
      },
    },
  },
  Triglycerides: {
    description: "Blood fats; part of lipid panel. Highly responsive to lifestyle.",
    whyItMatters: "High triglycerides increase cardiovascular risk. AHA guidance emphasizes diet and lifestyle; users can often see meaningful improvement with alcohol reduction, carb quality, weight loss, and omega-3.",
    foods: "Triglycerides respond within weeks to three levers: less alcohol, fewer refined carbohydrates and sugar-sweetened drinks, and more omega-3-rich fish. Protein and fiber at meals blunt the post-meal rise that a high-carb pattern produces.",
    lifestyle: "Reduce alcohol if elevated. Improve weight, activity, and carbohydrate quality. More exercise; fewer liquid calories.",
    supplementNotes: "General support: 1–2 g/day EPA+DHA. For high TG, AHA discusses 4 g/day omega-3 in prescription-level context—educate in-app, do not present as casual OTC dose.",
    retest: "With lipid panel in 8–12 weeks.",
    recommendedTests: ["HDL-C", "LDL-C", "Total cholesterol"],
    researchSummary: "Fasting triglycerides above 500 mg/dL raise the risk of pancreatitis; between 150 and 500, they contribute to cardiovascular risk alongside LDL and HDL. Values respond within weeks to alcohol reduction, weight loss, and refined-carbohydrate restriction.",
    ranges: { general: { optimalMin: 0, optimalMax: 150, high: 200 } },
  },
  "HDL-C": {
    description: "HDL-C (high-density lipoprotein cholesterol); one component of the lipid panel.",
    whyItMatters:
      "HDL is interpreted with LDL, triglycerides, and often ApoB or non-HDL—not alone. Many references use about 40 mg/dL as a common lower limit for men and 50 mg/dL for women; trials of drugs that raised HDL did not reduce cardiovascular events—focus on overall risk reduction with your clinician.",
    foods: "Healthy fats, fiber, exercise.",
    lifestyle: "Activity, smoking cessation.",
    supplementNotes: "Lifestyle-first; niacin/other only with provider.",
    retest: "With lipid panel.",
    recommendedTests: ["LDL-C", "Triglycerides", "ApoB"],
    researchSummary: "Higher HDL is associated with lower cardiovascular event rates in observational cohorts, but trials of drugs that raise HDL (niacin, CETP inhibitors) did not reduce events, so HDL is read as a risk marker rather than a treatment target.",
    ranges: {
      general: { deficient: 35, suboptimalMin: 40, optimalMin: 40, optimalMax: 80, high: 100 },
      female: { optimalMin: 50, optimalMax: 80 },
    },
  },
  "LDL-C": {
    description: "Low-density lipoprotein cholesterol. One of the most recognized cardiometabolic biomarkers.",
    whyItMatters: "LDL particles deliver cholesterol to artery walls; over years, higher exposure raises the chance of plaque formation. Lifestyle is foundational; nudge users to clinician if LDL-C is very high or ApoB/non-HDL concerning.",
    foods: "Soluble fiber from oats, barley, and beans binds cholesterol in the gut. A daily handful of nuts and a shift from butter or processed meat toward olive oil produces measurable LDL reductions over eight to twelve weeks in controlled trials.",
    lifestyle: "Weight management, aerobic and resistance training. Reduce saturated fat from processed meat and high-fat dairy if intake is high.",
    supplementNotes: "Ten grams per day of psyllium fiber lowers LDL by roughly 7 percent in a pooled analysis of controlled trials. Plant sterols at 1.5 to 2 g/day add a smaller reduction on top. Neither substitutes for a statin when one is clinically indicated.",
    retest: "With lipid panel in 8–12 weeks.",
    recommendedTests: ["HDL-C", "Triglycerides", "ApoB"],
    researchSummary: "Lifetime LDL exposure drives atherosclerosis more than any single reading. Large statin, ezetimibe, and PCSK9-inhibitor trials show that lowering LDL reduces cardiovascular events roughly in proportion to the absolute reduction achieved.",
    ranges: { general: { optimalMin: 0, optimalMax: 100, high: 130 } },
  },
  "Total cholesterol": {
    description: "Total blood cholesterol (HDL + LDL + VLDL).",
    whyItMatters: "Context with HDL and LDL; ratio and ApoB add refinement.",
    foods: "Balance saturated fat, increase fiber.",
    lifestyle: "Activity, weight.",
    supplementNotes: "Medical follow-up for treatment decisions.",
    retest: "With lipid panel.",
    recommendedTests: ["HDL-C", "LDL-C", "Triglycerides"],
    researchSummary: "Total cholesterol was the first lipid measured at scale, but it combines atherogenic (LDL, VLDL) and protective (HDL) fractions. Modern risk assessment uses non-HDL cholesterol or ApoB in its place when those are available.",
    ranges: { general: { optimalMin: 0, optimalMax: 200, high: 240 } },
  },
  ApoB: {
    description: "Apolipoprotein B—approximates number of atherogenic lipoprotein particles.",
    whyItMatters:
      "Often complements LDL-C in risk assessment; interpret with the rest of the lipid panel and overall risk (ACC/AHA frameworks reference ApoB in selected patients).",
    foods: "Same as lipid panel.",
    lifestyle: "Activity, weight.",
    supplementNotes: "Discuss with provider.",
    retest: "With lipid panel.",
    recommendedTests: ["LDL-C", "HDL-C", "Lipoprotein(a)"],
    researchSummary: "ApoB counts the atherogenic particles that LDL-C only estimates by mass. When LDL and ApoB disagree — often in people with high triglycerides or small, dense LDL — ApoB tracks cardiovascular risk more closely.",
    ranges: { general: { optimalMin: 0, optimalMax: 100, high: 120 } },
  },
  "Lipoprotein(a)": {
    description: "Lipoprotein(a)—genetically influenced particle linked to atherosclerotic risk; labs report mg/dL or nmol/L (units are not interchangeable).",
    whyItMatters:
      "Elevated Lp(a) is considered risk-enhancing in major guidelines (thresholds differ by unit—use your lab report and clinician). Lifestyle has limited effect; management is individualized and clinician-directed.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up; do not self-treat.",
    retest: "As advised; often once is enough.",
    recommendedTests: ["ApoB", "LDL-C"],
    researchSummary: "Lipoprotein(a) concentration is largely genetic and stable through life. An elevated value (above roughly 50 mg/dL or 125 nmol/L) is treated as a risk-enhancing factor in current ACC/AHA guidelines; specific Lp(a)-lowering therapies remain in trials.",
    ranges: { general: { optimalMin: 0, optimalMax: 30, high: 50 } },
  },
  "hs-CRP": {
    description: "High-sensitivity C-reactive protein; systemic inflammation marker used in cardiovascular risk discussion (hs-CRP assay preferred over standard CRP for that purpose).",
    whyItMatters:
      "Persistently elevated hs-CRP can reflect inflammation from lifestyle, recovery, or illness; epidemiologic risk thresholds (e.g. ≥2 mg/L) are used in some frameworks—interpret with lipids, blood pressure, and symptoms, not as a single diagnostic.",
    foods: "Dietary patterns built on olive oil, fish, legumes, and whole plant foods consistently lower hs-CRP in trials by a small but real amount — typically a fraction of a mg/L. The pattern matters more than any single food.",
    lifestyle: "The inputs that move hs-CRP are the unglamorous ones: regular aerobic training, enough sleep, not smoking, and for people carrying excess weight, a gradual loss of five to ten percent of body weight, which tends to lower the marker more than any single food change.",
    supplementNotes: "Curcumin phytosome 500–1,000 mg/day. Omega-3 1–2 g/day EPA+DHA. Bleeding-risk warnings for omega-3 and curcumin if on anticoagulants.",
    retest: "2–6 weeks if acute; 8–12 weeks if tracking.",
    recommendedTests: ["CBC"],
    researchSummary: "hs-CRP is a nonspecific inflammation marker with an epidemiologic cardiovascular signal: values under 1 mg/L are considered low-risk, 1–3 intermediate, and above 3 high. Acute illness, infection, and recent strenuous exercise can elevate it transiently.",
    ranges: {
      general: {
        optimalMin: 0,
        optimalMax: 1,
        high: 3,
        labReference: { min: 0, max: 3, source: "AHA hs-CRP risk thresholds" },
      },
      endurance: { optimalMin: 0, optimalMax: 1, high: 3 },
      strength: { optimalMin: 0, optimalMax: 1.5, high: 3 },
      mixed: { optimalMin: 0, optimalMax: 1.2, high: 3 },
    },
  },
  ESR: {
    description: "Erythrocyte sedimentation rate—nonspecific marker that tends to rise with inflammation.",
    whyItMatters:
      "Many conditions elevate ESR (infection, autoimmune disease, pregnancy, anemia of chronic disease). It is not specific for any one diagnosis—interpret with symptoms and other labs.",
    foods: "—",
    lifestyle: "Context: illness, recovery.",
    supplementNotes: "Medical follow-up; do not self-treat.",
    retest: "As advised.",
    recommendedTests: ["hs-CRP", "CBC"],
    researchSummary: "The erythrocyte sedimentation rate is slow to rise and slow to fall, which is why it was historically used to monitor chronic inflammatory conditions such as temporal arteritis and polymyalgia rheumatica. It is nonspecific and has been complemented, not replaced, by hs-CRP.",
    ranges: { general: { optimalMin: 0, optimalMax: 20, high: 30 } },
  },
  TSH: {
    description: "Thyroid-stimulating hormone (pituitary signal to the thyroid); first-line screen with free T4.",
    whyItMatters:
      "Abnormal TSH should be interpreted with free T4 (and sometimes free T3), symptoms, medications, and pregnancy status—TSH alone is not sufficient for full diagnosis.",
    foods: "Adequate iodine intake for most people; avoid radical iodine changes without guidance.",
    lifestyle: "Stress, sleep.",
    supplementNotes: "Do not self-treat thyroid with supplements; medical follow-up.",
    retest: "As advised by provider.",
    recommendedTests: ["Free T4"],
    researchSummary: "TSH is the most sensitive single test of thyroid status because it responds logarithmically to small changes in free T4. In primary hypothyroidism, TSH rises before free T4 falls out of the reference range.",
    ranges: { general: { deficient: 0.4, suboptimalMin: 0.5, optimalMin: 0.5, optimalMax: 4.5, high: 5 } },
  },
  "Free T4": {
    description: "Free thyroxine (T4)—unbound thyroid hormone available to tissues.",
    whyItMatters: "Interpret with TSH; borderline results often need repeat testing and clinical correlation.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up only; do not self-treat.",
    retest: "As advised.",
    recommendedTests: ["TSH"],
    researchSummary: "Free T4 is ordered with TSH when the pituitary axis is suspect, when TSH is at the edges of the reference range, or for patients on thyroid replacement. Total T4 is largely obsolete because it tracks binding protein as much as thyroid status.",
    ranges: { general: { optimalMin: 0.8, optimalMax: 1.8, high: 2 } },
  },
  BUN: {
    description: "Blood urea nitrogen—waste product related to protein metabolism and renal excretion.",
    whyItMatters:
      "Rises with reduced kidney perfusion, high protein intake, GI bleeding, and other causes; interpret with creatinine and eGFR rather than BUN alone.",
    foods: "Hydration, protein intake.",
    lifestyle: "Hydration.",
    supplementNotes: "Medical follow-up for abnormal values.",
    retest: "With CMP.",
    recommendedTests: ["Creatinine", "eGFR"],
    researchSummary: "Blood urea nitrogen is filtered by the kidney but also shaped by protein intake, hydration, GI bleeding, and catabolic state. A BUN-to-creatinine ratio above about 20 often points to reduced kidney perfusion rather than intrinsic kidney disease.",
    ranges: {
      general: {
        optimalMin: 7,
        optimalMax: 20,
        high: 25,
        labReference: { min: 6, max: 24, source: "LabCorp BUN" },
      },
    },
  },
  Creatinine: {
    description: "Serum creatinine—muscle metabolism waste filtered by the kidneys.",
    whyItMatters:
      "Used with age and sex in eGFR equations to estimate kidney filtration; acute changes need urgent context (hydration, medications, obstruction).",
    foods: "—",
    lifestyle: "Hydration.",
    supplementNotes: "Do not self-treat; medical follow-up.",
    retest: "With CMP / eGFR.",
    recommendedTests: ["BUN", "eGFR"],
    researchSummary: "Serum creatinine is a byproduct of muscle metabolism; the 2021 CKD-EPI equations convert it into an estimated GFR using age and sex. Very muscular or very low-muscle individuals are the classic mismatches between creatinine and true kidney function.",
    ranges: { general: { optimalMin: 0.7, optimalMax: 1.3, high: 1.5 } },
  },
  Albumin: {
    description: "Serum albumin—major plasma protein made by the liver.",
    whyItMatters:
      "Low values can reflect chronic illness, liver disease, malnutrition, or protein loss; interpret with total protein, liver enzymes, and clinical context—not as a single wellness score.",
    foods: "Adequate protein.",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "With CMP.",
    recommendedTests: ["AST", "ALT"],
    researchSummary: "Albumin has a half-life of about three weeks, so acute illness lowers it gradually rather than overnight. Low values reflect inflammation, reduced hepatic synthesis, or protein loss — not acute malnutrition in the way older textbooks implied.",
    ranges: { general: { deficient: 3.2, suboptimalMin: 3.5, optimalMin: 3.5, optimalMax: 5.5, high: 6 } },
  },
  SHBG: {
    description: "Sex hormone-binding globulin—binds sex steroids and modulates free hormone availability.",
    whyItMatters:
      "Rises with aging, thyroid status, and insulin sensitivity; affects calculated free testosterone—interpret with total testosterone and clinical context. Premenopausal women often have higher SHBG than the typical male reference—use sex-appropriate expectations.",
    foods: "—",
    lifestyle: "Body composition, insulin sensitivity.",
    supplementNotes: "Do not self-treat hormones; discuss with provider.",
    retest: "As advised.",
    recommendedTests: ["Testosterone", "Free testosterone"],
    researchSummary: "Sex hormone-binding globulin binds testosterone and estradiol and determines how much circulates free. It rises with age, hyperthyroidism, and low insulin levels, and falls with obesity, insulin resistance, and androgen use — which is why it is ordered alongside total testosterone rather than alone.",
    ranges: {
      general: {
        optimalMin: 20,
        optimalMax: 80,
        high: 100,
        labReference: { min: 10, max: 57, source: "LabCorp adult male" },
      },
      female: { optimalMin: 18, optimalMax: 144 },
    },
  },
  "Free testosterone": {
    description: "Free (unbound) testosterone—often measured or calculated from total T and SHBG.",
    whyItMatters:
      "More informative than total T when SHBG is very high or low; interpretation varies by sex, age, and assay.",
    foods: "—",
    lifestyle: "Sleep, stress, energy availability.",
    supplementNotes: "Medical follow-up; do not self-treat with hormones.",
    retest: "As advised.",
    recommendedTests: ["Testosterone", "SHBG"],
    researchSummary: "Free testosterone is the fraction not bound to SHBG or albumin. Values calculated from total T and SHBG are considered more reliable than most direct immunoassays, which are notoriously inconsistent at the low end of the range.",
    ranges: { general: { optimalMin: 50, optimalMax: 200, high: 250 } },
  },
  Estradiol: {
    description: "Estradiol—major estrogen; reference ranges differ by sex, age, and menstrual status.",
    whyItMatters:
      "Interpretation is highly context-dependent (menstrual cycle, menopause, hormone therapy, fertility). Not a standalone “optimization” target.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Do not self-treat; medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["Testosterone", "FSH", "LH"],
    researchSummary: "Estradiol varies by a factor of ten across a normal menstrual cycle, so reference ranges only make sense with cycle day or menopausal status. In postmenopausal women and in men, sensitive (LC-MS/MS) assays are required because standard immunoassays are unreliable at low concentrations.",
    ranges: { general: { optimalMin: 15, optimalMax: 50, high: 60 } },
  },
  "Cortisol (AM)": {
    description: "Morning serum cortisol; diurnal rhythm and stress affect results.",
    whyItMatters:
      "A single AM value is easy to misinterpret—medications, sleep, timing, and illness matter. Abnormal morning cortisol warrants clinician follow-up; lifestyle, sleep, and retesting are more useful first steps than supplements.",
    foods: "—",
    lifestyle: "Sleep, stress management, recovery.",
    supplementNotes: "Do not self-treat; focus on lifestyle and retest.",
    retest: "As advised; repeat AM draw.",
    recommendedTests: [],
    researchSummary: "Morning serum cortisol peaks within an hour of waking and falls through the day. A single 8 a.m. value screens for adrenal insufficiency (low) or Cushing syndrome (high); abnormal results are followed up with dynamic testing rather than repeat random draws.",
    ranges: { general: { optimalMin: 6, optimalMax: 23, high: 28 } },
  },
  // CBC remainder
  MCH: {
    description: "Mean corpuscular hemoglobin—average hemoglobin per red cell (CBC).",
    whyItMatters: "Used with MCV and RDW to characterize anemia pattern.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["Hemoglobin", "MCV", "Ferritin"],
    researchSummary: "Mean corpuscular hemoglobin usually moves with MCV, so it rarely adds information beyond what MCV already shows. Its main role is as a cross-check: an isolated MCH change more often reflects laboratory error than real disease.",
    ranges: { general: { optimalMin: 27, optimalMax: 33, high: 34 } },
  },
  RDW: {
    description: "Red cell distribution width—variation in red blood cell size (CBC).",
    whyItMatters:
      "Often rises in early iron deficiency and mixed deficiencies; nonspecific—interpret with MCV, ferritin, and B12/folate.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["Hemoglobin", "MCV", "Ferritin"],
    researchSummary: "Red cell distribution width rises when the red cell population becomes heterogeneous, which often occurs in early iron or B12/folate deficiency before MCV changes. Elevated RDW on an otherwise normal CBC has also been linked to mortality in epidemiologic studies, though its clinical use there remains debated.",
    ranges: { general: { optimalMin: 11.5, optimalMax: 14.5, high: 15 } },
  },
  WBC: {
    description: "White blood cell count (CBC)—immune cell total.",
    whyItMatters:
      "High or low counts have many causes (infection, stress, medications, bone marrow disorders). Differential count adds detail—clinician interpretation if abnormal.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up for abnormal values.",
    retest: "As advised.",
    recommendedTests: ["CBC"],
    researchSummary: "The white blood cell count is most useful in the context of its differential. Neutrophils, lymphocytes, and eosinophils move for different reasons, and a normal total can mask a meaningful shift among subsets.",
    ranges: {
      general: {
        optimalMin: 4.5,
        optimalMax: 11,
        high: 12,
        labReference: { min: 3.4, max: 10.8, source: "LabCorp WBC" },
      },
    },
  },
  Platelets: {
    description: "Platelet count (CBC)—involved in clot formation.",
    whyItMatters:
      "Thrombocytopenia and thrombocytosis have diverse causes (infection, meds, marrow disorders). Persistent abnormalities need medical evaluation.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["CBC"],
    researchSummary: "Platelet counts below about 50,000 carry bleeding risk; counts above about 1,000,000 carry clotting risk. Moderate deviations in either direction are more often reactive — to iron deficiency, infection, inflammation, or medications — than primary marrow disease.",
    ranges: { general: { optimalMin: 150, optimalMax: 400, high: 450 } },
  },
  // CMP remainder
  Calcium: {
    description: "Total serum calcium (often corrected or interpreted with albumin).",
    whyItMatters:
      "Abnormal calcium needs clinical context (PTH, vitamin D, magnesium, medications, malignancy). Do not self-supplement high doses without monitoring.",
    foods: "Dairy, fortified foods, greens.",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["Albumin", "Vitamin D"],
    researchSummary: "Serum calcium is tightly regulated by parathyroid hormone and vitamin D; even a change of a few tenths of a mg/dL is clinically meaningful. Total calcium should be interpreted alongside albumin, or ionized calcium measured directly, when protein status is abnormal.",
    ranges: { general: { optimalMin: 8.6, optimalMax: 10.2, high: 10.5 } },
  },
  Sodium: {
    description: "Serum sodium—primary extracellular cation; tightly regulated.",
    whyItMatters:
      "Abnormal sodium reflects water balance, kidney function, hormones, and medications—can be dangerous at extremes; clinician-guided correction.",
    foods: "—",
    lifestyle: "Hydration.",
    supplementNotes: "Medical follow-up.",
    retest: "With CMP.",
    recommendedTests: ["Potassium", "Chloride"],
    researchSummary: "Serum sodium reflects water balance more than sodium intake; hyponatremia usually signals relative water excess rather than dietary deficiency. Rapid correction of chronic hyponatremia can cause osmotic demyelination, which is why changes are managed gradually.",
    ranges: { general: { optimalMin: 136, optimalMax: 145, high: 146 } },
  },
  Potassium: {
    description: "Serum potassium—critical for nerve and muscle (including cardiac) function.",
    whyItMatters:
      "High or low potassium can be clinically significant; causes include medications, kidney disease, and GI losses. Discuss abnormal values with your clinician before supplementing.",
    foods: "Potatoes, beans, and leafy greens deliver more potassium per serving than the fruit the mineral is usually associated with; most adults fall short of the 3,400–4,700 mg daily target.",
    lifestyle: "Hydration.",
    supplementNotes: "Do not self-supplement; medical follow-up.",
    retest: "With CMP.",
    recommendedTests: ["Sodium", "Chloride"],
    researchSummary: "Serum potassium is kept within a narrow range because both high and low values can trigger arrhythmias. Pseudohyperkalemia from red-cell hemolysis during the blood draw is a common false positive; isolated mild elevations on an otherwise normal CMP are typically redrawn before acting.",
    ranges: { general: { optimalMin: 3.5, optimalMax: 5.0, high: 5.2 } },
  },
  Chloride: {
    description: "Serum chloride—usually interpreted with sodium and acid-base status.",
    whyItMatters: "Part of electrolyte and acid-base assessment with sodium, potassium, and bicarbonate/CO2.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "With CMP.",
    recommendedTests: ["Sodium", "Potassium"],
    researchSummary: "Chloride tracks with sodium most of the time; independent changes point to acid-base disorders, which are usually evaluated through the anion gap (sodium minus chloride and bicarbonate).",
    ranges: { general: { optimalMin: 98, optimalMax: 106, high: 108 } },
  },
  CO2: {
    description: "CO2 (bicarbonate surrogate on many panels)—acid-base status.",
    whyItMatters:
      "Low or high bicarbonate suggests metabolic acidosis/alkalosis patterns; interpret with anion gap, kidney function, and clinical context.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "With CMP.",
    recommendedTests: ["BUN", "Creatinine"],
    researchSummary: "The CO2 (total bicarbonate) value on a CMP screens for metabolic acidosis (low) or alkalosis (high). Interpretation depends on the anion gap and, in acute settings, on arterial blood gas results.",
    ranges: { general: { optimalMin: 23, optimalMax: 29, high: 31 } },
  },
  "Total protein": {
    description: "Total serum protein—albumin plus globulins (CMP).",
    whyItMatters:
      "Changes may reflect hydration, inflammation (globulins), liver synthetic function, or protein loss—interpret with albumin and A/G ratio when provided.",
    foods: "Adequate protein intake.",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "With CMP.",
    recommendedTests: ["Albumin"],
    researchSummary: "Total protein is the sum of albumin and globulins. Elevations with normal albumin suggest increased globulins — a pattern that warrants serum protein electrophoresis to look for monoclonal gammopathy.",
    ranges: { general: { optimalMin: 6.0, optimalMax: 8.3, high: 8.5 } },
  },
  AST: {
    description: "AST—aspartate aminotransferase; found in liver and muscle.",
    whyItMatters:
      "Rises with hepatocellular injury and also with muscle injury, strenuous exercise, or hemolysis—interpret with ALT and clinical context.",
    foods: "—",
    lifestyle: "Avoid alcohol excess; recovery.",
    supplementNotes: "Do not self-treat; medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["ALT", "Albumin"],
    researchSummary: "AST is present in liver, skeletal muscle, heart, and red cells, so it rises in several non-hepatic conditions — strenuous exercise, rhabdomyolysis, and hemolysis — not just liver disease. The AST/ALT ratio is used to narrow the cause when both are elevated.",
    ranges: { general: { optimalMin: 10, optimalMax: 40, high: 50 } },
  },
  ALT: {
    description: "ALT—alanine aminotransferase; relatively liver-specific.",
    whyItMatters:
      "Elevated ALT suggests hepatocellular injury; chronic mild elevations warrant medical evaluation (metabolic liver disease, medications, viral hepatitis, etc.).",
    foods: "—",
    lifestyle: "Avoid alcohol excess.",
    supplementNotes: "Medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["AST", "Albumin"],
    researchSummary: "ALT is the more liver-specific of the two transaminases. Metabolic dysfunction-associated steatotic liver disease (MASLD, formerly NAFLD) has become the leading cause of mildly elevated ALT in developed populations, overtaking viral hepatitis in most clinics.",
    ranges: { general: { optimalMin: 7, optimalMax: 56, high: 65 } },
  },
  "Alkaline phosphatase": {
    description: "ALP; bone/liver enzyme (CMP).",
    whyItMatters: "Bone turnover or liver; context-dependent.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["AST", "ALT"],
    researchSummary: "Alkaline phosphatase comes from liver, bone, and intestine; elevations are sorted using GGT (liver origin if GGT is also high) or a bone-specific fraction. It is physiologically elevated in adolescents during growth spurts and in pregnancy.",
    ranges: { general: { optimalMin: 44, optimalMax: 147, high: 150 } },
  },
  Bilirubin: {
    description: "Bilirubin—heme breakdown product; total vs direct fractionation matters when abnormal.",
    whyItMatters:
      "Elevated bilirubin can reflect liver excretion problems, hemolysis, or inherited conditions—needs clinical pattern, not self-diagnosis.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["AST", "ALT"],
    researchSummary: "Bilirubin elevations are sorted by the direct (conjugated) fraction: indirect-predominant patterns suggest hemolysis or Gilbert's syndrome (common and benign), while direct-predominant patterns point to hepatocellular or biliary disease.",
    ranges: { general: { optimalMin: 0.1, optimalMax: 1.2, high: 1.5 } },
  },

  // ——— Tier 1: finish cross-references already present in other entries ———
  Homocysteine: {
    description:
      "Homocysteine is a sulfur-containing amino acid produced during methionine metabolism; it is normally cleared by B12-, folate-, and B6-dependent pathways.",
    whyItMatters:
      "Elevated homocysteine is associated with cardiovascular risk, cognitive decline in older adults, and neural tube defects in pregnancy. It is most often raised by inadequate B12, folate, or B6 status, by kidney dysfunction, or by specific genetic variants in methylation enzymes.",
    whatItDoes: [
      "Intermediate in methionine/methylation cycle",
      "Consumed in SAMe synthesis",
      "Remethylated using B12 and folate",
      "Transsulfurated using B6",
    ],
    symptomsLow: [],
    symptomsHigh: ["Often asymptomatic", "Cardiovascular risk marker", "Cognitive symptoms in older adults"],
    foods:
      "Folate-rich leafy greens, legumes, and fortified grains; B12-rich fish, meat, dairy, or fortified plant milks; B6 from poultry, potatoes, and bananas. An overall plant-forward pattern with adequate B12 typically normalizes elevations.",
    lifestyle:
      "Confirm B12, folate, and B6 status before supplementing. Review kidney function (eGFR) in older adults. Smoking, high coffee intake, and hypothyroidism all push it up.",
    supplementNotes:
      "First-line is correcting an underlying vitamin gap: 400–800 mcg/day folate (methylfolate in MTHFR variants), 500–1000 mcg/day B12 (methylcobalamin or cyanocobalamin), and 25–50 mg/day B6. Retest in 8–12 weeks. Large trials lowering homocysteine with B-vitamins have not consistently reduced cardiovascular events, so treat it as a repair-the-cause marker rather than an independent target.",
    retest: "Retest in 8–12 weeks after repleting B-vitamins.",
    recommendedTests: ["Vitamin B12", "Folate", "Creatinine"],
    researchSummary:
      "Homocysteine above about 15 µmol/L is epidemiologically linked to cardiovascular and cognitive risk, but randomized trials of B-vitamin lowering have been mixed for hard outcomes. It is most useful as a sensitive screen for functional B12/folate/B6 deficiency.",
    ranges: {
      general: {
        optimalMin: 5,
        optimalMax: 9,
        suboptimalMin: 9,
        high: 15,
        labReference: { min: 0, max: 15, source: "typical µmol/L reference" },
      },
      masters: { optimalMax: 10, high: 15 },
    },
  },

  PTH: {
    description:
      "Intact parathyroid hormone (PTH) regulates calcium and phosphate by acting on bone, kidney, and indirectly on the gut via vitamin D activation.",
    whyItMatters:
      "PTH must always be interpreted together with calcium and vitamin D. High PTH with low or normal calcium often indicates secondary hyperparathyroidism driven by vitamin D deficiency or chronic kidney disease; high PTH with high calcium suggests primary hyperparathyroidism and needs surgical evaluation.",
    whatItDoes: [
      "Raises serum calcium",
      "Lowers phosphate via renal excretion",
      "Activates 25-OH vitamin D to 1,25-OH (calcitriol)",
      "Stimulates bone resorption",
    ],
    symptomsLow: ["Tingling", "Muscle cramps", "Rare when cause is surgical"],
    symptomsHigh: ["Bone aches", "Kidney stones", "Fatigue", "Mood changes in chronic elevation"],
    foods: "—",
    lifestyle:
      "If PTH is high, correct any vitamin D deficiency first and re-check. Persistent elevation with high calcium is a surgical/endocrine evaluation.",
    supplementNotes:
      "Do not self-treat PTH abnormalities. Restoring 25-OH vitamin D into the optimal range often normalizes secondary elevations over 8–12 weeks; true primary hyperparathyroidism is a referral diagnosis.",
    retest: "Retest with calcium and 25-OH vitamin D in 8–12 weeks.",
    recommendedTests: ["Calcium", "Vitamin D", "Phosphate"],
    researchSummary:
      "Secondary hyperparathyroidism driven by vitamin D deficiency is common in northern latitudes and resolves with repletion. Primary hyperparathyroidism typically presents with a calcium above the upper reference and a non-suppressed PTH — a combination that warrants parathyroid imaging and endocrinology referral.",
    ranges: {
      general: {
        optimalMin: 15,
        optimalMax: 55,
        suboptimalMin: 15,
        high: 65,
        labReference: { min: 15, max: 65, source: "LabCorp intact PTH" },
      },
    },
  },

  LH: {
    description:
      "Luteinizing hormone (LH) is a pituitary gonadotropin; in men it drives testicular testosterone production, in women it triggers ovulation and supports the corpus luteum.",
    whyItMatters:
      "LH is essential context for any testosterone or fertility workup. Low testosterone with a low or normal LH points to a central (pituitary/hypothalamic) problem; low testosterone with a high LH points to primary testicular failure. Interpretation in women is cycle-day dependent.",
    whatItDoes: [
      "Stimulates Leydig-cell testosterone in men",
      "Triggers ovulation mid-cycle in women",
      "Supports corpus luteum progesterone",
    ],
    symptomsLow: ["Infertility", "Hypogonadism symptoms", "Amenorrhea"],
    symptomsHigh: ["In men: primary testicular failure", "In women post-menopause, physiologically elevated"],
    foods: "—",
    lifestyle:
      "Under-fueling, over-training, and chronic stress can suppress LH (functional hypogonadotropic hypogonadism). In women of reproductive age, interpret alongside cycle day and FSH.",
    supplementNotes: "Do not self-treat. LH abnormalities are an endocrinology referral.",
    retest: "As advised by provider, typically with FSH and sex hormones.",
    recommendedTests: ["FSH", "Testosterone", "Estradiol", "Prolactin"],
    researchSummary:
      "The LH:FSH ratio and the response to GnRH stimulation distinguish primary (gonadal) from secondary (central) hypogonadism. In female athletes with amenorrhea, a low LH with low estradiol is the classical signature of functional hypothalamic amenorrhea from low energy availability.",
    ranges: {
      general: {
        optimalMin: 1.5,
        optimalMax: 9.0,
        high: 12,
        labReference: { min: 1.7, max: 8.6, source: "LabCorp adult male LH" },
      },
      female: { optimalMin: 2, optimalMax: 12 },
      masters: { optimalMax: 12 },
    },
  },

  FSH: {
    description:
      "Follicle-stimulating hormone (FSH) is a pituitary gonadotropin; in men it supports spermatogenesis via Sertoli cells, in women it drives follicular development.",
    whyItMatters:
      "In men, a high FSH with low testosterone points to primary testicular failure. In women, a persistently elevated FSH is a hallmark of ovarian insufficiency or menopause. It is a required companion to LH in any hypogonadism or fertility workup.",
    whatItDoes: [
      "Stimulates spermatogenesis (men)",
      "Drives ovarian follicle maturation (women)",
      "Negatively fed back by inhibin B and estradiol",
    ],
    symptomsLow: ["Infertility", "Hypogonadism"],
    symptomsHigh: ["Primary gonadal failure", "Post-menopause (physiologic)"],
    foods: "—",
    lifestyle: "Interpret with LH and sex hormones. In reproductive-age women, cycle day matters.",
    supplementNotes: "Do not self-treat.",
    retest: "As advised.",
    recommendedTests: ["LH", "Testosterone", "Estradiol"],
    researchSummary:
      "FSH rises years before menstrual changes as ovarian reserve declines; an early follicular FSH above 10–15 IU/L signals diminished ovarian reserve relevant to fertility planning.",
    ranges: {
      general: {
        optimalMin: 1.5,
        optimalMax: 12,
        high: 15,
        labReference: { min: 1.5, max: 12.4, source: "LabCorp adult male FSH" },
      },
      female: { optimalMin: 3, optimalMax: 10 },
      masters: { optimalMax: 20 },
    },
  },

  eGFR: {
    description:
      "Estimated glomerular filtration rate (eGFR) calculated from serum creatinine, age, and sex using the 2021 CKD-EPI equation. Reports glomerular filtering capacity of the kidneys.",
    whyItMatters:
      "eGFR is the standard readout of kidney function. Values under 60 mL/min/1.73m² sustained for ≥3 months define chronic kidney disease. Very muscular or very low-muscle users can be misclassified — cystatin-C eGFR is a better second test when creatinine seems off.",
    whatItDoes: [
      "Reports glomerular filtration in mL/min/1.73m²",
      "Stages CKD (G1–G5)",
      "Adjusts drug dosing",
    ],
    symptomsLow: ["Often asymptomatic early", "Fatigue", "Edema in advanced CKD"],
    symptomsHigh: [],
    foods: "Adequate hydration; avoid very high protein intakes if CKD is suspected.",
    lifestyle:
      "Control blood pressure and glucose; avoid nephrotoxic OTCs (chronic NSAIDs) if eGFR is borderline. Hydration affects acute readings; persistently low values need a second confirmatory test.",
    supplementNotes:
      "Creatine supplementation can raise serum creatinine and modestly lower calculated eGFR without changing true kidney function. Note recent creatine use when interpreting. Avoid high-dose nephrotoxic herbs (aristolochia).",
    retest: "With CMP; repeat in 3 months to distinguish acute vs chronic changes.",
    recommendedTests: ["Creatinine", "BUN", "Urine albumin/creatinine ratio"],
    researchSummary:
      "The 2021 CKD-EPI equation removed race-based coefficients and is now the ACP/NKF-recommended eGFR. Cystatin-C-based eGFR is used when creatinine-based estimates are confounded by muscle mass or recent creatine intake.",
    ranges: {
      general: {
        deficient: 45,
        suboptimalMin: 60,
        optimalMin: 90,
        optimalMax: 140,
        high: 150,
        labReference: { min: 60, max: 140, source: "KDIGO normal adult" },
      },
      masters: { suboptimalMin: 60, optimalMin: 75, optimalMax: 140 },
    },
  },

  GGT: {
    description:
      "Gamma-glutamyl transferase (GGT) is a liver enzyme sensitive to biliary tract disease, alcohol, medications, and metabolic liver disease.",
    whyItMatters:
      "GGT is the most alcohol-sensitive routine liver enzyme and often rises before ALT in metabolic dysfunction-associated steatotic liver disease (MASLD). Paired with alkaline phosphatase, a high GGT localizes an ALP elevation to the liver rather than bone.",
    whatItDoes: ["Hepatobiliary glutathione metabolism"],
    symptomsLow: [],
    symptomsHigh: ["Usually asymptomatic", "Fatigue or right upper-quadrant discomfort in advanced liver disease"],
    foods:
      "Mediterranean-style pattern; reduce refined carbohydrates, sugar-sweetened beverages, and alcohol — all lower GGT within weeks in controlled trials.",
    lifestyle:
      "Alcohol reduction is the highest-leverage single change; even moderate habitual use can raise GGT by 30–50%. Weight loss reduces it further in MASLD.",
    supplementNotes:
      "No supplement reliably lowers GGT on its own. Avoid high-dose niacin, amiodarone-like agents, and concentrated green tea extract in liver-vulnerable users.",
    retest: "8–12 weeks after lifestyle change.",
    recommendedTests: ["ALT", "AST", "Alkaline phosphatase"],
    researchSummary:
      "GGT above about 50 U/L in otherwise well adults is epidemiologically linked to cardiovascular mortality and MASLD progression independent of ALT. It responds within two to four weeks to alcohol cessation.",
    ranges: {
      general: {
        optimalMin: 5,
        optimalMax: 30,
        suboptimalMin: 30,
        high: 50,
        labReference: { min: 3, max: 70, source: "LabCorp GGT adult" },
      },
      female: { optimalMax: 25, high: 40 },
    },
  },

  // ——— Tier 2: panel completeness ———
  "Free T3": {
    description:
      "Free triiodothyronine (Free T3) is the active thyroid hormone at the tissue receptor; about 80% of circulating T3 is made by peripheral T4→T3 conversion.",
    whyItMatters:
      "Free T3 is used when TSH and Free T4 don't match symptoms, in nonthyroidal illness syndrome, and to assess T4-to-T3 conversion quality. A low Free T3 with normal Free T4 and rising TSH often precedes subclinical hypothyroidism or reflects low selenium, caloric restriction, or stress.",
    whatItDoes: ["Primary active thyroid hormone", "Drives basal metabolic rate", "Regulates lipid metabolism"],
    symptomsLow: ["Fatigue", "Cold intolerance", "Constipation", "Hair thinning"],
    symptomsHigh: ["Palpitations", "Tremor", "Heat intolerance", "Weight loss"],
    foods:
      "Adequate iodine (seafood, dairy, iodized salt) and selenium (Brazil nuts, seafood) support T4→T3 conversion. Chronic severe caloric restriction lowers Free T3 as a physiologic adaptation.",
    lifestyle:
      "Under-fueling and overtraining both lower Free T3. Correct any energy-availability gap before chasing the number.",
    supplementNotes:
      "Selenium at 100–200 mcg/day can support conversion when intake is low; routine high-dose supplementation is not helpful and can lower conversion. Do not self-treat thyroid.",
    retest: "As advised, with TSH and Free T4.",
    recommendedTests: ["TSH", "Free T4", "Reverse T3", "TPO antibodies"],
    researchSummary:
      "Free T3 is preferentially measured over total T3 because binding-protein status confounds total measurements. In hospitalized or severely ill patients, a low Free T3 is usually a nonthyroidal illness pattern that does not benefit from thyroid hormone replacement.",
    ranges: {
      general: {
        optimalMin: 3.0,
        optimalMax: 4.0,
        high: 4.4,
        labReference: { min: 2.0, max: 4.4, source: "LabCorp Free T3 pg/mL" },
      },
    },
  },

  "TPO antibodies": {
    description:
      "Thyroid peroxidase antibodies (anti-TPO) target the enzyme that iodinates thyroglobulin during thyroid hormone synthesis.",
    whyItMatters:
      "Positive TPO antibodies are the first-line serologic marker of Hashimoto thyroiditis. Present in a majority of cases of autoimmune hypothyroidism and in a meaningful fraction of Graves disease. High TPO with an upper-normal TSH foreshadows progression to overt hypothyroidism.",
    whatItDoes: ["Autoantibody against thyroid peroxidase", "Marker of autoimmune thyroid disease"],
    symptomsLow: [],
    symptomsHigh: ["Often asymptomatic until thyroid function shifts"],
    foods:
      "A Mediterranean pattern with adequate selenium is prudent. Gluten restriction only if coexisting celiac serology; routine elimination is not evidence-supported for isolated TPO positivity.",
    lifestyle:
      "Repeat the test — titers fluctuate. Close-follow TSH every 6–12 months if TSH is creeping into the upper-normal range.",
    supplementNotes:
      "Selenium 200 mcg/day has been studied as an anti-TPO lowering adjunct in Hashimoto with mixed but promising results; do not exceed this chronically.",
    retest: "Antibody positivity is usually persistent; repeat TSH every 6–12 months instead.",
    recommendedTests: ["TSH", "Free T4", "Free T3", "Thyroglobulin antibodies"],
    researchSummary:
      "A positive anti-TPO with a high-normal TSH more than doubles the annual rate of progression to overt hypothyroidism. Selenium supplementation has shown modest reductions in antibody titers in some trials, without consistent clinical benefit.",
    ranges: {
      general: {
        optimalMin: 0,
        optimalMax: 34,
        high: 35,
        labReference: { min: 0, max: 34, source: "LabCorp IU/mL anti-TPO" },
      },
    },
  },

  "Uric acid": {
    description:
      "Uric acid is the end product of purine metabolism; excreted by the kidneys.",
    whyItMatters:
      "Elevated uric acid is a cause of gout and a contributor to cardiometabolic risk and fatty liver disease. Very low uric acid (from specific medications or Fanconi syndrome) is rare but clinically significant.",
    whatItDoes: ["End-stage purine metabolism", "Antioxidant in plasma", "Crystal-forming when saturated"],
    symptomsLow: [],
    symptomsHigh: ["Acute gout flares", "Kidney stones", "Often silent before first flare"],
    foods:
      "High-fructose corn syrup and beer raise uric acid more than red meat does. Vitamin C (500 mg/day) and coffee are modestly uric-acid-lowering. Cherries/tart cherry juice have reduced flare frequency in small trials.",
    lifestyle:
      "Weight loss, fewer sugar-sweetened beverages, and hydration are first-line. Avoid aspirin at low doses during an active flare (can raise uric acid).",
    supplementNotes:
      "Vitamin C 500 mg/day is evidence-supported for modest lowering. Tart cherry may reduce flare frequency. Do not substitute supplements for allopurinol when urate-lowering therapy is medically indicated.",
    retest: "8–12 weeks after lifestyle change.",
    recommendedTests: ["Creatinine", "eGFR"],
    researchSummary:
      "Serum uric acid above 6.8 mg/dL is near the saturation threshold for monosodium urate crystals at physiologic pH. Epidemiologic links to hypertension and fatty liver are consistent; randomized lowering of asymptomatic hyperuricemia has not reliably reduced cardiovascular events.",
    ranges: {
      general: {
        optimalMin: 3.5,
        optimalMax: 6.0,
        high: 6.8,
        labReference: { min: 3.4, max: 7.0, source: "LabCorp uric acid adult male" },
      },
      female: { optimalMin: 2.5, optimalMax: 5.5, high: 6.0 },
    },
  },

  "Non-HDL cholesterol": {
    description:
      "Non-HDL cholesterol = total cholesterol minus HDL-C; captures LDL plus all other atherogenic (ApoB-containing) particles in a single number.",
    whyItMatters:
      "Non-HDL is a better risk marker than LDL-C in patients with high triglycerides or metabolic syndrome because LDL-C underestimates particle burden in those settings. It is a recognized secondary target in ACC/AHA and ESC lipid guidelines.",
    whatItDoes: ["Aggregate atherogenic particle proxy", "Easy to calculate from any lipid panel"],
    symptomsLow: [],
    symptomsHigh: ["Atherosclerotic cardiovascular disease risk"],
    foods:
      "The same levers as LDL-C plus triglyceride-lowering moves: less alcohol, fewer refined carbs, more soluble fiber, more omega-3 fatty fish, replace butter with olive oil.",
    lifestyle: "Weight management, aerobic + resistance training, smoking cessation.",
    supplementNotes:
      "Soluble fiber (psyllium 10 g/day), plant sterols (1.5–2 g/day), and omega-3 for the TG contribution. Clinician-prescribed statins remain first-line when risk is elevated.",
    retest: "With lipid panel in 8–12 weeks.",
    recommendedTests: ["ApoB", "LDL-C", "HDL-C", "Triglycerides"],
    researchSummary:
      "Non-HDL cholesterol predicts cardiovascular events as well as or better than LDL-C, especially in diabetes and hypertriglyceridemia, and is recommended as a co-primary or secondary target in major guidelines.",
    ranges: {
      general: {
        optimalMin: 0,
        optimalMax: 130,
        high: 160,
        labReference: { min: 0, max: 130, source: "ACC/AHA non-HDL secondary target" },
      },
    },
  },

  "DHEA-S": {
    description:
      "Dehydroepiandrosterone sulfate (DHEA-S) is the sulfated, long-half-life adrenal androgen, precursor to testosterone and estradiol in peripheral tissues.",
    whyItMatters:
      "DHEA-S declines with age and falls further with chronic stress, overtraining, and adrenal insufficiency. Very high values suggest adrenal pathology or PCOS context in women. It is the best single screen for adrenal androgen output.",
    whatItDoes: ["Precursor to sex steroids in peripheral tissues", "Stress axis marker", "Declines with age"],
    symptomsLow: ["Fatigue", "Low libido", "Loss of well-being in older adults"],
    symptomsHigh: ["Acne", "Hirsutism", "Irregular cycles in women"],
    foods: "—",
    lifestyle:
      "Sleep, recovery, and avoiding chronic under-fueling support DHEA-S. Very low values in an unwell person warrant adrenal workup.",
    supplementNotes:
      "DHEA supplementation 25–50 mg/day in older women (or men with low DHEA-S and symptoms) is used off-label; evidence for quality-of-life improvement is modest and it can raise downstream estradiol or testosterone unpredictably. Not recommended routinely in young adults or athletes subject to banned-substance testing.",
    retest: "8–12 weeks.",
    recommendedTests: ["Cortisol (AM)", "Testosterone", "Estradiol"],
    researchSummary:
      "DHEA-S peaks in the 20s and halves every two decades thereafter. Replacement in primary adrenal insufficiency is evidence-supported; replacement in age-related decline alone is not.",
    ranges: {
      general: {
        optimalMin: 200,
        optimalMax: 500,
        high: 650,
        labReference: { min: 89, max: 457, source: "LabCorp DHEA-S adult male 30s" },
      },
      female: { optimalMin: 100, optimalMax: 350, high: 450 },
      masters: { optimalMin: 80, optimalMax: 300 },
    },
  },

  Prolactin: {
    description:
      "Prolactin is a pituitary hormone that stimulates lactation and, when pathologically elevated, suppresses the HPG axis.",
    whyItMatters:
      "Hyperprolactinemia is a classical cause of secondary hypogonadism in men (low LH, low testosterone) and oligomenorrhea or galactorrhea in women. It is mandatory workup for unexplained low testosterone or amenorrhea. Common causes include medications (dopamine antagonists), hypothyroidism, and prolactinomas.",
    whatItDoes: ["Drives lactation", "Negatively feedbacks GnRH/LH when elevated"],
    symptomsLow: [],
    symptomsHigh: ["Galactorrhea", "Amenorrhea", "Decreased libido", "Erectile dysfunction"],
    foods: "—",
    lifestyle:
      "Stress, recent breast exam, and sleep disruption can transiently raise prolactin; a markedly elevated fasting AM value warrants repeat + endocrinology referral.",
    supplementNotes: "Do not self-treat. Pharmacologic dopamine agonists are the evidence-based treatment.",
    retest: "As advised.",
    recommendedTests: ["TSH", "LH", "Testosterone"],
    researchSummary:
      "Prolactin above about 200 ng/mL almost always indicates a prolactinoma; intermediate elevations are more often medication-induced (antipsychotics, metoclopramide) or stress-related.",
    ranges: {
      general: {
        optimalMin: 2,
        optimalMax: 18,
        high: 25,
        labReference: { min: 4, max: 15.2, source: "LabCorp adult male prolactin" },
      },
      female: { optimalMin: 3, optimalMax: 25, high: 30 },
    },
  },

  Progesterone: {
    description:
      "Progesterone is the principal corpus luteum hormone in women and is produced in small amounts by the adrenal cortex in both sexes.",
    whyItMatters:
      "In women, a day-21 (luteal) progesterone confirms ovulation. Low luteal progesterone signals anovulation or luteal phase dysfunction, often driven by low energy availability, thyroid disease, or hyperprolactinemia. In men, levels are physiologically low and rarely clinically useful.",
    whatItDoes: ["Supports endometrium after ovulation", "Raises basal body temperature in luteal phase"],
    symptomsLow: ["Short luteal phase", "Irregular cycles", "Early pregnancy loss context"],
    symptomsHigh: ["Normal mid-luteal peak or pregnancy"],
    foods: "—",
    lifestyle:
      "Correct under-fueling and overtraining before pursuing supplementation; restore energy availability first.",
    supplementNotes:
      "Vitex (chasteberry) has modest evidence for cycle regularity in luteal phase defect; clinician-guided bioidentical progesterone is used in assisted reproduction.",
    retest: "As advised (mid-luteal, roughly cycle day 21 in a 28-day cycle).",
    recommendedTests: ["Estradiol", "LH", "FSH", "TSH"],
    researchSummary:
      "A mid-luteal progesterone above 10 ng/mL confirms ovulation in most women; values below 3 ng/mL indicate anovulation. Interpretation requires accurate cycle timing.",
    ranges: {
      general: {
        optimalMin: 0.2,
        optimalMax: 1.4,
        high: 2.0,
      },
      female: { optimalMin: 5, optimalMax: 20, high: 25 },
    },
  },

  PSA: {
    description:
      "Prostate-specific antigen (PSA) is a serine protease produced by prostate tissue; serum levels rise with benign hyperplasia, prostatitis, recent ejaculation, and prostate cancer.",
    whyItMatters:
      "PSA is the primary screening test for prostate cancer in men over 50 (over 40 with family history or Black race). Sustained elevations or rapid rises warrant urology evaluation. Acute elevations from prostatitis or recent ejaculation are common and confound single readings.",
    whatItDoes: ["Prostate tissue serine protease"],
    symptomsLow: [],
    symptomsHigh: ["Often asymptomatic", "Urinary symptoms in BPH", "Bone pain in advanced disease"],
    foods: "—",
    lifestyle:
      "Avoid ejaculation 48 hours before the draw. Vigorous cycling can transiently raise PSA. Repeat borderline values before referral.",
    supplementNotes:
      "Saw palmetto evidence for BPH symptoms is mixed; do not use finasteride-like agents without urology guidance (they halve PSA and complicate screening).",
    retest: "As advised by USPSTF / clinician, typically every 1–2 years if in screening program.",
    recommendedTests: ["Free PSA (if total is borderline)"],
    researchSummary:
      "USPSTF recommends individualized shared decision-making for PSA screening ages 55–69, and against routine screening after 70. Very low PSA velocity and low free-to-total ratios refine the cancer vs BPH distinction.",
    ranges: {
      general: {
        optimalMin: 0,
        optimalMax: 2.5,
        suboptimalMin: 2.5,
        high: 4.0,
        labReference: { min: 0, max: 4, source: "LabCorp PSA total" },
      },
      masters: { optimalMax: 3.5, high: 4.5 },
    },
  },

  // ——— Tier 3: nutrient depth ———
  Zinc: {
    description:
      "Serum zinc reflects body zinc status; marginal intake is common in restrictive diets, heavy training, and chronic GI disease.",
    whyItMatters:
      "Zinc is a cofactor in 300+ enzymes, central to immune function, wound healing, taste, and testosterone biosynthesis. Deficiency presents as recurrent URIs, poor wound healing, dysgeusia, and in men, lowered testosterone.",
    whatItDoes: ["Immune signaling", "Wound healing", "Taste and smell", "Testosterone biosynthesis"],
    symptomsLow: ["Frequent colds", "Slow wound healing", "Loss of taste", "Hair loss"],
    symptomsHigh: ["Nausea", "Copper deficiency with chronic high intake"],
    foods:
      "Oysters (highest), red meat, pumpkin seeds, cashews, chickpeas. Phytate in whole grains and legumes reduces absorption; soaking, fermenting, and sprouting help.",
    lifestyle:
      "Vegetarians and vegans, endurance athletes, and users with GI disorders should check status if symptoms match.",
    supplementNotes:
      "15–25 mg/day for repletion, typically as zinc picolinate or citrate; not with calcium or iron at the same time. Do not exceed 40 mg/day chronically without monitoring copper status.",
    retest: "8–12 weeks.",
    recommendedTests: ["Copper", "Alkaline phosphatase"],
    researchSummary:
      "A 2017 Cochrane review supports zinc lozenges for reducing cold duration when started within 24 hours. Serum zinc has meaningful assay variability; trends matter more than a single value.",
    ranges: {
      general: {
        deficient: 60,
        suboptimalMin: 70,
        optimalMin: 80,
        optimalMax: 120,
        high: 150,
        labReference: { min: 60, max: 120, source: "LabCorp serum zinc µg/dL" },
      },
    },
  },

  Selenium: {
    description:
      "Serum selenium reflects dietary selenium status; required for glutathione peroxidases and thyroid deiodinases.",
    whyItMatters:
      "Selenium supports antioxidant defenses and T4→T3 conversion. Regional dietary intake varies enormously: US intake is usually adequate (Brazil nuts, seafood), while much of Europe and parts of Asia are chronically low. Both deficiency and excess have consequences.",
    whatItDoes: ["Glutathione peroxidase cofactor", "Thyroid hormone deiodination", "Sperm motility"],
    symptomsLow: ["Cardiomyopathy in severe deficiency (Keshan disease)", "Impaired T4→T3 conversion"],
    symptomsHigh: ["Selenosis: hair/nail brittleness, garlic breath, GI upset"],
    foods:
      "Two Brazil nuts per day provide approximately the RDA; seafood, organ meats, and whole grains contribute.",
    lifestyle: "Don't stack high-dose multivitamins with chronic Brazil nut intake.",
    supplementNotes:
      "100–200 mcg/day is the evidence-supported range; above 400 mcg/day chronically is associated with selenosis and higher type-2 diabetes risk in a large RCT (SELECT).",
    retest: "8–12 weeks.",
    recommendedTests: ["TSH", "Free T3"],
    researchSummary:
      "The SELECT trial found selenium supplementation did not reduce prostate cancer incidence and hinted at increased diabetes risk at the 200 mcg dose, informing current caution against routine high-dose use.",
    ranges: {
      general: {
        deficient: 70,
        suboptimalMin: 95,
        optimalMin: 110,
        optimalMax: 170,
        high: 200,
        labReference: { min: 63, max: 160, source: "LabCorp selenium µg/L" },
      },
    },
  },

  Iodine: {
    description:
      "Urinary iodine (spot or 24-hour) is the standard measure of recent iodine intake; required for thyroid hormone synthesis.",
    whyItMatters:
      "Low iodine is a classical cause of goiter and hypothyroidism; it is rising in women avoiding iodized salt or on restrictive diets. Excessive iodine (kelp supplements, amiodarone) can paradoxically trigger hypothyroidism or hyperthyroidism.",
    whatItDoes: ["Substrate for T4 and T3 synthesis"],
    symptomsLow: ["Goiter", "Hypothyroidism", "Cognitive effects in pregnancy"],
    symptomsHigh: ["Thyroiditis from iodine excess"],
    foods: "Iodized salt, dairy, seaweed, seafood, eggs. A single kelp dose can overshoot the upper intake limit.",
    lifestyle: "Pregnant and lactating women need higher intake (220–290 mcg/day); discuss with clinician.",
    supplementNotes:
      "150 mcg/day (RDA) covers most adults. Avoid kelp supplements without monitoring; they are highly variable and can deliver 10–100x the RDA per dose.",
    retest: "As advised.",
    recommendedTests: ["TSH", "Free T4"],
    researchSummary:
      "Median urinary iodine concentration below 100 mcg/L defines population-level deficiency per WHO; pregnancy targets are higher (150–249 mcg/L).",
    ranges: {
      general: {
        deficient: 100,
        suboptimalMin: 100,
        optimalMin: 100,
        optimalMax: 199,
        high: 300,
        labReference: { min: 100, max: 199, source: "WHO adequate urinary iodine mcg/L" },
      },
    },
  },

  "Omega-3 Index": {
    description:
      "Percentage of EPA + DHA in red blood cell membranes; a direct, long-window measure of omega-3 status (reflects prior ~4 months).",
    whyItMatters:
      "A low Omega-3 Index is an independent cardiovascular risk marker and is typically the dietary biomarker most easily improved. Targets above 8% are associated with lowest cardiovascular mortality in large cohorts.",
    whatItDoes: ["Membrane phospholipid EPA+DHA reserve", "Anti-inflammatory eicosanoid substrate"],
    symptomsLow: ["Often silent", "Dry skin", "Mood shifts in low-intake populations"],
    symptomsHigh: ["Bruising at very high intake"],
    foods: "Salmon, sardines, mackerel, herring, anchovies twice weekly is sufficient for most adults.",
    lifestyle: "Plant ALA from flax and chia contributes minimally to EPA/DHA status due to poor conversion.",
    supplementNotes:
      "1–2 g/day EPA+DHA raises the Omega-3 Index to >8% in most adults over 3–4 months. Prescription icosapent ethyl (4 g/day) is used after MI in specific populations. Avoid above 3 g/day with anticoagulants without clinician awareness.",
    retest: "Retest in 4 months; membrane turnover is slow.",
    recommendedTests: ["Triglycerides", "hs-CRP"],
    researchSummary:
      "The Framingham Offspring and other cohorts show 8–12% Omega-3 Index is associated with lowest all-cause mortality. Landmark RCTs (VITAL, REDUCE-IT) clarify that benefit is dose- and population-dependent.",
    ranges: {
      general: {
        deficient: 4,
        suboptimalMin: 6,
        optimalMin: 8,
        optimalMax: 12,
        high: 15,
        labReference: { min: 8, max: 12, source: "Harris/von Schacky target range" },
      },
    },
  },

  "RBC folate": {
    description:
      "Red blood cell folate reflects tissue folate status over the prior 2–4 months, insensitive to recent meals.",
    whyItMatters:
      "RBC folate is more reliable than serum folate for diagnosing true tissue deficiency and is preferred in pregnancy and when serum folate is equivocal. Always pair with B12 — high folate can mask the anemia of B12 deficiency while neurologic damage progresses.",
    whatItDoes: ["DNA synthesis", "Methylation via 5-MTHF", "Homocysteine remethylation"],
    symptomsLow: ["Fatigue", "Macrocytic anemia", "Elevated homocysteine"],
    symptomsHigh: ["High serum folate with low RBC folate suggests active repletion rather than storage"],
    foods: "Leafy greens, legumes, asparagus, fortified grains.",
    lifestyle: "Check B12 first before any folic acid repletion.",
    supplementNotes:
      "400–800 mcg/day; prefer 5-MTHF (methylfolate) in confirmed MTHFR variants. Avoid chronic doses above 1 mg/day without clinician guidance — unmetabolized folic acid accumulates in the circulation at high intakes.",
    retest: "12–16 weeks (RBC turnover).",
    recommendedTests: ["Vitamin B12", "Homocysteine"],
    researchSummary:
      "RBC folate is the preferred marker for preconception folate status; ≥400 ng/mL reduces neural tube defect risk at the population level.",
    ranges: {
      general: {
        deficient: 280,
        suboptimalMin: 340,
        optimalMin: 400,
        optimalMax: 1100,
        high: 1500,
        labReference: { min: 280, max: 1100, source: "LabCorp RBC folate ng/mL" },
      },
    },
  },

  MMA: {
    description:
      "Methylmalonic acid (MMA) accumulates when B12-dependent methylmalonyl-CoA mutase activity falls; a functional marker of B12 adequacy.",
    whyItMatters:
      "MMA is the most sensitive early marker of functional B12 deficiency and is often elevated before serum B12 drops below the reference range. It is preferred over serum B12 in older adults, strict vegans, and anyone on long-term PPI or metformin.",
    whatItDoes: ["Byproduct of branched-chain amino acid and odd-chain fatty acid metabolism"],
    symptomsLow: [],
    symptomsHigh: ["Tingling", "Fatigue", "Cognitive symptoms", "May precede serum B12 changes"],
    foods: "Same as B12.",
    lifestyle: "Review PPI, H2 blocker, and metformin use; all reduce B12 absorption.",
    supplementNotes: "Treat the underlying B12 gap: 1000 mcg/day oral or per-clinician IM.",
    retest: "8–12 weeks after starting B12 repletion.",
    recommendedTests: ["Vitamin B12", "Holotranscobalamin", "Homocysteine"],
    researchSummary:
      "MMA elevates at serum B12 values still within the traditional reference range (200–400 pg/mL), identifying the functional-deficiency band that serum B12 alone misses.",
    ranges: {
      general: {
        optimalMin: 0.05,
        optimalMax: 0.27,
        high: 0.4,
        labReference: { min: 0, max: 0.4, source: "LabCorp MMA serum µmol/L" },
      },
    },
  },

  "Active B12": {
    description:
      "Holotranscobalamin (Active B12) is the fraction of serum B12 bound to transcobalamin and therefore available for cellular uptake.",
    whyItMatters:
      "Active B12 is more sensitive than total serum B12 for early deficiency because it drops before the total does. Used in equivocal serum B12 results.",
    whatItDoes: ["Delivers B12 to peripheral tissues via transcobalamin receptors"],
    symptomsLow: ["As for B12 deficiency, often before anemia"],
    symptomsHigh: [],
    foods: "Same as B12.",
    lifestyle: "Same as B12.",
    supplementNotes: "Treat the underlying gap: 1000 mcg/day oral.",
    retest: "8–12 weeks.",
    recommendedTests: ["Vitamin B12", "MMA", "Homocysteine"],
    researchSummary:
      "Holotranscobalamin below ~35 pmol/L has a higher positive predictive value for B12 deficiency than total B12 below the reference range.",
    ranges: {
      general: {
        deficient: 25,
        suboptimalMin: 35,
        optimalMin: 50,
        optimalMax: 150,
        high: 200,
        labReference: { min: 35, max: 150, source: "typical holoTC pmol/L" },
      },
    },
  },

  // ——— Tier 4: niche markers ———
  Fibrinogen: {
    description:
      "Fibrinogen is a liver-synthesized acute phase protein and the terminal clot-forming fibrin precursor.",
    whyItMatters:
      "Elevated fibrinogen reflects chronic low-grade inflammation and is epidemiologically linked to cardiovascular risk. Very low values are rare and reflect liver failure or inherited disorders.",
    whatItDoes: ["Converted by thrombin to fibrin to form clots", "Acute phase reactant"],
    symptomsLow: ["Bleeding in severe deficiency"],
    symptomsHigh: ["Often asymptomatic"],
    foods: "Same as hs-CRP lifestyle.",
    lifestyle: "Smoking cessation, regular aerobic exercise, and weight loss all lower fibrinogen by 10–20%.",
    supplementNotes: "Omega-3 1–2 g/day; Mediterranean pattern. Do not self-treat with anticoagulants.",
    retest: "8–12 weeks.",
    recommendedTests: ["hs-CRP"],
    researchSummary:
      "Meta-analyses link fibrinogen >400 mg/dL with increased cardiovascular mortality independent of other risk factors.",
    ranges: {
      general: {
        optimalMin: 200,
        optimalMax: 400,
        high: 450,
        labReference: { min: 175, max: 425, source: "LabCorp fibrinogen mg/dL" },
      },
    },
  },

  "C-peptide": {
    description:
      "C-peptide is cleaved from proinsulin in equimolar amounts; a marker of endogenous insulin secretion with a longer half-life than insulin itself.",
    whyItMatters:
      "C-peptide distinguishes endogenous from exogenous insulin and characterizes beta-cell reserve. Useful in unclear diabetes typing, suspected insulinoma, or on insulin therapy.",
    whatItDoes: ["Byproduct of insulin synthesis", "Indirect marker of beta-cell activity"],
    symptomsLow: ["Type 1 diabetes", "Late type 2 diabetes"],
    symptomsHigh: ["Insulin resistance", "Insulinoma (rare)"],
    foods: "Same metabolic levers as insulin.",
    lifestyle: "Fasting draw required.",
    supplementNotes: "Not a direct supplement target.",
    retest: "As advised.",
    recommendedTests: ["Fasting insulin", "Glucose", "HbA1c"],
    researchSummary:
      "A low fasting C-peptide in a newly diagnosed adult diabetes case supports type 1 or LADA; very high values with hypoglycemia suggest insulinoma.",
    ranges: {
      general: {
        optimalMin: 0.8,
        optimalMax: 3.1,
        high: 4.0,
        labReference: { min: 1.1, max: 4.4, source: "LabCorp fasting C-peptide ng/mL" },
      },
    },
  },

  CoQ10: {
    description:
      "Coenzyme Q10 (ubiquinone) is a lipid-soluble electron carrier in the mitochondrial electron transport chain; measured in plasma as total Q10.",
    whyItMatters:
      "Statins reduce endogenous CoQ10 synthesis; symptomatic statin users with muscle complaints sometimes improve on supplementation. Age-related decline is modest but measurable.",
    whatItDoes: ["Mitochondrial electron transport", "Lipid-phase antioxidant"],
    symptomsLow: ["Fatigue", "Exercise intolerance", "Statin-associated muscle symptoms"],
    symptomsHigh: [],
    foods: "Organ meats, fatty fish, whole grains — generally low dietary contribution.",
    lifestyle: "Statin users: if myalgias, discuss a 2–3 month CoQ10 trial with your clinician.",
    supplementNotes:
      "100–200 mg/day ubiquinol or ubiquinone with a fat-containing meal; effect sizes on statin myopathy are small but consistent across small trials.",
    retest: "As advised.",
    recommendedTests: [],
    researchSummary:
      "CoQ10 for statin-associated muscle symptoms: modest benefit in pooled analyses. Not a substitute for statin dose adjustment or switching.",
    ranges: {
      general: {
        deficient: 0.5,
        suboptimalMin: 0.7,
        optimalMin: 0.8,
        optimalMax: 2.5,
        high: 4.0,
        labReference: { min: 0.4, max: 1.9, source: "typical CoQ10 µg/mL" },
      },
    },
  },

  sTfR: {
    description:
      "Soluble transferrin receptor (sTfR) is shed from cells in proportion to cellular iron demand; rises in true iron deficiency and is not suppressed by inflammation.",
    whyItMatters:
      "sTfR disambiguates iron deficiency from anemia of chronic disease when ferritin is confounded by inflammation (high CRP). The sTfR/log-ferritin index is the most sensitive combined marker.",
    whatItDoes: ["Reflects cellular iron demand"],
    symptomsLow: [],
    symptomsHigh: ["True iron deficiency"],
    foods: "Same as iron.",
    lifestyle: "Use when ferritin and CRP both appear elevated.",
    supplementNotes: "Iron repletion per ferritin/iron studies.",
    retest: "With iron panel in 8–12 weeks.",
    recommendedTests: ["Ferritin", "Serum iron", "Transferrin saturation", "hs-CRP"],
    researchSummary:
      "Meta-analyses show sTfR/log-ferritin index is the most sensitive iron-status marker in inflammatory states, outperforming ferritin alone.",
    ranges: {
      general: {
        optimalMin: 2.2,
        optimalMax: 5.0,
        high: 5.5,
        labReference: { min: 2.2, max: 5.0, source: "LabCorp sTfR mg/L" },
      },
    },
  },
}