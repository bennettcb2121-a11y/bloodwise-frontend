export type UserClass = "endurance" | "strength" | "mixed" | "general"
export type Sex = "male" | "female" | "unknown"
export type AgeGroup = "adolescent" | "adult" | "masters"

export type BiomarkerRange = {
  deficient?: number
  suboptimalMin?: number
  optimalMin: number
  optimalMax: number
  high?: number
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
  ranges: BiomarkerProfileRanges
}

export const biomarkerDatabase: Record<string, BiomarkerDatabaseEntry> = {
  Ferritin: {
    description:
      "Ferritin reflects stored iron and helps indicate whether iron reserves are sufficient for oxygen transport and training demands.",
    whyItMatters:
      "Low ferritin can reduce endurance, increase fatigue, and impair adaptation even before full anemia develops. Endurance athletes often need stronger iron stores than the general population.",
    foods:
      "Red meat, beef liver, shellfish, lentils, beans, spinach, fortified cereals. Pair iron-rich foods with vitamin C.",
    lifestyle:
      "Avoid tea, coffee, and high-calcium foods right around iron-rich meals. Monitor heavy training blocks and menstrual losses.",
    supplementNotes:
      "Iron should be used carefully and ideally with follow-up bloodwork. Dose choice depends on severity and tolerance.",
    retest: "Retest in 8–12 weeks after intervention.",
    recommendedTests: ["CBC", "Iron Panel", "Transferrin Saturation"],
    researchSummary:
      "Endurance athletes often perform better with ferritin clearly above minimum clinical norms.",
    ranges: {
      general: {
        deficient: 20,
        suboptimalMin: 40,
        optimalMin: 40,
        optimalMax: 100,
        high: 180,
      },
      endurance: {
        deficient: 30,
        suboptimalMin: 60,
        optimalMin: 60,
        optimalMax: 130,
        high: 180,
      },
      strength: {
        deficient: 25,
        suboptimalMin: 50,
        optimalMin: 50,
        optimalMax: 120,
        high: 180,
      },
      mixed: {
        deficient: 25,
        suboptimalMin: 50,
        optimalMin: 50,
        optimalMax: 120,
        high: 180,
      },
      female: {
        optimalMax: 150,
      },
      adolescent: {
        suboptimalMin: 50,
      },
    },
  },

  "Vitamin D": {
    description:
      "Vitamin D supports musculoskeletal health, immunity, recovery, and bone function.",
    whyItMatters:
      "Low vitamin D may increase risk of low energy, poor recovery, illness, and bone stress problems.",
    foods:
      "Fatty fish, egg yolks, fortified dairy or dairy alternatives.",
    lifestyle:
      "Sun exposure, season, latitude, and indoor training all strongly affect vitamin D status.",
    supplementNotes:
      "D3 is commonly used. Dose depends on baseline level, body size, and sun exposure.",
    retest: "Retest in 8–12 weeks.",
    recommendedTests: ["Calcium", "PTH"],
    researchSummary:
      "Athletes generally benefit from being above deficiency thresholds and often perform best in the mid-normal range.",
    ranges: {
      general: {
        deficient: 20,
        suboptimalMin: 30,
        optimalMin: 30,
        optimalMax: 50,
        high: 80,
      },
      endurance: {
        deficient: 20,
        suboptimalMin: 40,
        optimalMin: 40,
        optimalMax: 60,
        high: 80,
      },
      strength: {
        deficient: 20,
        suboptimalMin: 35,
        optimalMin: 35,
        optimalMax: 60,
        high: 80,
      },
      mixed: {
        deficient: 20,
        suboptimalMin: 35,
        optimalMin: 35,
        optimalMax: 60,
        high: 80,
      },
    },
  },

  Magnesium: {
    description:
      "Magnesium supports ATP production, muscle contraction, relaxation, and nervous system function.",
    whyItMatters:
      "Low magnesium can contribute to poor recovery, cramps, sleep issues, and reduced energy metabolism.",
    foods:
      "Pumpkin seeds, almonds, cashews, dark chocolate, beans, spinach.",
    lifestyle:
      "Heavy sweating, poor intake, stress, and high training load can increase need.",
    supplementNotes:
      "Magnesium glycinate is often better tolerated than some cheaper forms.",
    retest: "Retest in 8–12 weeks.",
    recommendedTests: [],
    researchSummary:
      "Athletes may need tighter magnesium sufficiency because of sweat loss and metabolic demand.",
    ranges: {
      general: {
        deficient: 1.7,
        suboptimalMin: 2.0,
        optimalMin: 2.0,
        optimalMax: 2.2,
        high: 2.5,
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
      "Vitamin B12 supports red blood cell production, nervous system function, and energy processes.",
    whyItMatters:
      "Low or low-normal B12 can contribute to fatigue, poor recovery, and impaired oxygen delivery support.",
    foods:
      "Red meat, fish, eggs, dairy, fortified foods.",
    lifestyle:
      "Vegetarian and vegan athletes need closer monitoring.",
    supplementNotes:
      "Methylcobalamin and cyanocobalamin are both common options.",
    retest: "Retest in 8–12 weeks.",
    recommendedTests: ["Folate", "CBC"],
    researchSummary:
      "Performance-minded users often do better above the low end of standard lab ranges.",
    ranges: {
      general: {
        deficient: 300,
        suboptimalMin: 400,
        optimalMin: 400,
        optimalMax: 800,
        high: 1200,
      },
      endurance: {
        deficient: 350,
        suboptimalMin: 500,
        optimalMin: 500,
        optimalMax: 900,
        high: 1200,
      },
      strength: {
        deficient: 350,
        suboptimalMin: 450,
        optimalMin: 450,
        optimalMax: 900,
        high: 1200,
      },
      mixed: {
        deficient: 350,
        suboptimalMin: 450,
        optimalMin: 450,
        optimalMax: 900,
        high: 1200,
      },
      adolescent: {
        optimalMin: 450,
      },
      masters: {
        optimalMin: 450,
      },
    },
  },

  CRP: {
    description:
      "CRP is a broad marker of systemic inflammation and recovery strain.",
    whyItMatters:
      "Elevated CRP may reflect poor recovery, recent illness, injury, excess inflammation, or metabolic stress.",
    foods:
      "Higher-quality whole-food diet with omega-3-rich foods, berries, olive oil, and vegetables.",
    lifestyle:
      "Check recovery load, sleep, illness, injury, and overall stress before overreacting to a single value.",
    supplementNotes:
      "Omega-3s can be useful when inflammation patterns and diet support that choice.",
    retest: "Retest in 2–6 weeks depending on context.",
    recommendedTests: ["CBC"],
    researchSummary:
      "Athletes can see transient CRP elevations, so context matters, but chronically low CRP is generally favorable.",
    ranges: {
      general: {
        optimalMin: 0,
        optimalMax: 1,
        high: 3,
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
      "Fasting glucose reflects metabolic health and day-to-day fuel regulation.",
    whyItMatters:
      "Poor fasting glucose control can signal impaired metabolic flexibility and reduced long-term health quality.",
    foods:
      "Stable mixed meals, adequate fiber, lower ultra-processed food intake.",
    lifestyle:
      "Interpret fasting glucose with sleep, stress, recent training, and prior meal timing in mind.",
    supplementNotes:
      "Interventions are usually lifestyle-first unless guided by broader clinical context.",
    retest: "Retest in 6–12 weeks.",
    recommendedTests: ["HbA1c", "Insulin"],
    researchSummary:
      "Athletes usually benefit from strong insulin sensitivity and stable fasting glucose.",
    ranges: {
      general: {
        optimalMin: 75,
        optimalMax: 95,
        high: 100,
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
      "Athletes, especially endurance athletes, often do well with relatively low fasting insulin.",
    ranges: {
      general: {
        optimalMin: 2,
        optimalMax: 8,
        high: 10,
      },
      endurance: {
        optimalMin: 2,
        optimalMax: 6,
        high: 8,
      },
      strength: {
        optimalMin: 2,
        optimalMax: 8,
        high: 10,
      },
      mixed: {
        optimalMin: 2,
        optimalMax: 8,
        high: 10,
      },
    },
  },

  Testosterone: {
    description:
      "Testosterone supports recovery, muscle protein synthesis, red blood cell production, and training adaptation.",
    whyItMatters:
      "Low testosterone in male athletes can reflect low energy availability, poor recovery, or endocrine strain.",
    foods:
      "Adequate energy intake, sufficient fats, zinc-rich foods, and balanced intake overall.",
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
    description: "Hemoglobin carries oxygen in red blood cells. Part of a CBC.",
    whyItMatters: "Low hemoglobin can indicate anemia; high can reflect dehydration or adaptation.",
    foods: "Iron-rich foods, vitamin C for absorption.",
    lifestyle: "Hydration, altitude, training load.",
    supplementNotes: "Discuss with your doctor before supplementing; focus on diet and retest.",
    retest: "As advised by your provider.",
    recommendedTests: ["Hematocrit", "RBC", "Ferritin"],
    researchSummary: "CBC is foundational for anemia and general health.",
    ranges: {
      general: { deficient: 12, suboptimalMin: 13, optimalMin: 13, optimalMax: 17, high: 18 },
      endurance: { deficient: 13, suboptimalMin: 14, optimalMin: 14, optimalMax: 17, high: 18 },
      strength: { deficient: 12, suboptimalMin: 13, optimalMin: 13, optimalMax: 17, high: 18 },
      female: { deficient: 11, suboptimalMin: 12, optimalMin: 12, optimalMax: 15, high: 16 },
      masters: { deficient: 12, suboptimalMin: 13, optimalMin: 13, optimalMax: 16, high: 17 },
    },
  },
  Hematocrit: {
    description: "Percentage of blood volume that is red blood cells (CBC).",
    whyItMatters: "Used with hemoglobin to assess anemia or hydration.",
    foods: "Iron-rich diet if low.",
    lifestyle: "Hydration, training load.",
    supplementNotes: "Medical follow-up for abnormal values; do not self-treat.",
    retest: "As advised.",
    recommendedTests: ["Hemoglobin", "RBC", "Ferritin"],
    researchSummary: "",
    ranges: {
      general: { deficient: 36, suboptimalMin: 38, optimalMin: 38, optimalMax: 50, high: 52 },
      endurance: { deficient: 39, suboptimalMin: 41, optimalMin: 41, optimalMax: 50, high: 52 },
      female: { deficient: 33, suboptimalMin: 36, optimalMin: 36, optimalMax: 44, high: 48 },
      masters: { deficient: 36, suboptimalMin: 38, optimalMin: 38, optimalMax: 48, high: 50 },
    },
  },
  RBC: {
    description: "Red blood cell count (CBC).",
    whyItMatters: "Low RBC can indicate anemia; context with hemoglobin and ferritin.",
    foods: "Iron, B12, folate if deficient.",
    lifestyle: "Training, recovery.",
    supplementNotes: "Discuss with your doctor; focus on cause.",
    retest: "As advised.",
    recommendedTests: ["Hemoglobin", "MCV", "Ferritin"],
    researchSummary: "",
    ranges: {
      general: { optimalMin: 4.2, optimalMax: 5.9, high: 6 },
      endurance: { optimalMin: 4.5, optimalMax: 5.9, high: 6 },
      female: { optimalMin: 4.0, optimalMax: 5.2, high: 5.5 },
      masters: { optimalMin: 4.0, optimalMax: 5.5, high: 5.8 },
    },
  },
  MCV: {
    description: "Mean corpuscular volume — average red blood cell size (CBC).",
    whyItMatters: "Helps distinguish types of anemia (microcytic vs macrocytic).",
    foods: "Context-dependent; B12/folate or iron.",
    lifestyle: "—",
    supplementNotes: "Medical follow-up; do not self-treat.",
    retest: "As advised.",
    recommendedTests: ["Hemoglobin", "B12", "Ferritin"],
    researchSummary: "",
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
    researchSummary: "",
    ranges: {
      general: { deficient: 40, suboptimalMin: 60, optimalMin: 60, optimalMax: 170, high: 200 },
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
    researchSummary: "",
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
    researchSummary: "",
    ranges: { general: { deficient: 15, suboptimalMin: 20, optimalMin: 20, optimalMax: 50, high: 55 } },
  },
  HbA1c: {
    description: "Average blood glucose over ~3 months; key for metabolic health.",
    whyItMatters: "Elevated HbA1c indicates prediabetes or diabetes risk.",
    foods: "Fiber, whole foods, stable meal timing.",
    lifestyle: "Sleep, stress, activity, body composition.",
    supplementNotes: "Lifestyle-first; discuss with provider before supplement protocols.",
    retest: "Every 3–6 months if tracking.",
    recommendedTests: ["Fasting insulin", "Glucose"],
    researchSummary: "",
    ranges: { general: { optimalMin: 4.5, optimalMax: 5.6, high: 6 } },
  },
  "Fasting insulin": {
    description: "Fasting insulin reflects insulin sensitivity.",
    whyItMatters: "High fasting insulin can precede elevated glucose.",
    foods: "Fiber, protein, lower refined carbs.",
    lifestyle: "Activity, sleep, stress.",
    supplementNotes: "Lifestyle-first; medical guidance for interventions.",
    retest: "6–12 weeks with metabolic panel.",
    recommendedTests: ["Glucose", "HbA1c"],
    researchSummary: "",
    ranges: { general: { optimalMin: 2, optimalMax: 8, high: 10 } },
  },
  Triglycerides: {
    description: "Blood fats; part of lipid panel.",
    whyItMatters: "High triglycerides increase cardiovascular risk.",
    foods: "Limit refined carbs and excess alcohol; omega-3s, fiber.",
    lifestyle: "Activity, weight, alcohol.",
    supplementNotes: "Omega-3 and fiber may help; discuss with provider.",
    retest: "With lipid panel in 3–6 months.",
    recommendedTests: ["HDL-C", "LDL-C", "Total cholesterol"],
    researchSummary: "",
    ranges: { general: { optimalMin: 0, optimalMax: 150, high: 200 } },
  },
  "HDL-C": {
    description: "High-density lipoprotein; 'good' cholesterol.",
    whyItMatters: "Higher HDL is generally protective; interpret with full lipid panel.",
    foods: "Healthy fats, fiber, exercise.",
    lifestyle: "Activity, smoking cessation.",
    supplementNotes: "Lifestyle-first; niacin/other only with provider.",
    retest: "With lipid panel.",
    recommendedTests: ["LDL-C", "Triglycerides", "ApoB"],
    researchSummary: "",
    ranges: { general: { deficient: 35, suboptimalMin: 40, optimalMin: 40, optimalMax: 60, high: 80 } },
  },
  "LDL-C": {
    description: "Low-density lipoprotein cholesterol.",
    whyItMatters: "Elevated LDL is a major modifiable cardiovascular risk factor.",
    foods: "Fiber, unsaturated fats, limit trans/saturated.",
    lifestyle: "Activity, weight, smoking.",
    supplementNotes: "Discuss with provider; psyllium may support; no self-directed statin.",
    retest: "With lipid panel.",
    recommendedTests: ["HDL-C", "Triglycerides", "ApoB"],
    researchSummary: "",
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
    researchSummary: "",
    ranges: { general: { optimalMin: 0, optimalMax: 200, high: 240 } },
  },
  ApoB: {
    description: "Apolipoprotein B; one particle count for atherogenic lipid burden.",
    whyItMatters: "Useful for cardiovascular risk refinement.",
    foods: "Same as lipid panel.",
    lifestyle: "Activity, weight.",
    supplementNotes: "Discuss with provider.",
    retest: "With lipid panel.",
    recommendedTests: ["LDL-C", "HDL-C", "Lipoprotein(a)"],
    researchSummary: "",
    ranges: { general: { optimalMin: 0, optimalMax: 100, high: 120 } },
  },
  "Lipoprotein(a)": {
    description: "Lp(a); genetically influenced, risk-enhancing marker.",
    whyItMatters: "≥50 mg/dL (or 75 nmol/L) is risk-enhancing; often not modifiable by lifestyle alone.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up; do not self-treat.",
    retest: "As advised; often once is enough.",
    recommendedTests: ["ApoB", "LDL-C"],
    researchSummary: "",
    ranges: { general: { optimalMin: 0, optimalMax: 30, high: 50 } },
  },
  "hs-CRP": {
    description: "High-sensitivity C-reactive protein; marker of inflammation.",
    whyItMatters: "≥2 mg/L is risk-enhancing; useful for recovery and cardiometabolic context.",
    foods: "Anti-inflammatory diet, omega-3s.",
    lifestyle: "Recovery, sleep, stress, illness.",
    supplementNotes: "Omega-3 may help; interpret in context; no aggressive self-treatment.",
    retest: "2–6 weeks if acute; 3–6 months if tracking.",
    recommendedTests: ["CBC"],
    researchSummary: "",
    ranges: {
      general: { optimalMin: 0, optimalMax: 1, high: 3 },
      endurance: { optimalMin: 0, optimalMax: 1, high: 3 },
      strength: { optimalMin: 0, optimalMax: 1.5, high: 3 },
      mixed: { optimalMin: 0, optimalMax: 1.2, high: 3 },
    },
  },
  ESR: {
    description: "Erythrocyte sedimentation rate; nonspecific inflammation marker.",
    whyItMatters: "Elevated in inflammation, infection, some chronic conditions.",
    foods: "—",
    lifestyle: "Context: illness, recovery.",
    supplementNotes: "Medical follow-up; do not self-treat.",
    retest: "As advised.",
    recommendedTests: ["hs-CRP", "CBC"],
    researchSummary: "",
    ranges: { general: { optimalMin: 0, optimalMax: 20, high: 30 } },
  },
  TSH: {
    description: "Thyroid-stimulating hormone; screens thyroid function.",
    whyItMatters: "Abnormal TSH warrants Free T4 and clinical context.",
    foods: "Iodine adequacy; avoid excess goitrogens if deficient.",
    lifestyle: "Stress, sleep.",
    supplementNotes: "Do not self-treat thyroid with supplements; medical follow-up.",
    retest: "As advised by provider.",
    recommendedTests: ["Free T4"],
    researchSummary: "",
    ranges: { general: { deficient: 0.4, suboptimalMin: 0.5, optimalMin: 0.5, optimalMax: 4.5, high: 5 } },
  },
  "Free T4": {
    description: "Free thyroxine; active thyroid hormone.",
    whyItMatters: "Interpret with TSH for thyroid function.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up only; do not self-treat.",
    retest: "As advised.",
    recommendedTests: ["TSH"],
    researchSummary: "",
    ranges: { general: { optimalMin: 0.8, optimalMax: 1.8, high: 2 } },
  },
  BUN: {
    description: "Blood urea nitrogen; kidney and protein metabolism.",
    whyItMatters: "Elevated with dehydration or kidney concern; interpret with creatinine.",
    foods: "Hydration, protein intake.",
    lifestyle: "Hydration.",
    supplementNotes: "Medical follow-up for abnormal values.",
    retest: "With CMP.",
    recommendedTests: ["Creatinine", "eGFR"],
    researchSummary: "",
    ranges: { general: { optimalMin: 7, optimalMax: 20, high: 25 } },
  },
  Creatinine: {
    description: "Kidney function marker; waste product.",
    whyItMatters: "Elevated creatinine can indicate reduced kidney function.",
    foods: "—",
    lifestyle: "Hydration.",
    supplementNotes: "Do not self-treat; medical follow-up.",
    retest: "With CMP / eGFR.",
    recommendedTests: ["BUN", "eGFR"],
    researchSummary: "",
    ranges: { general: { optimalMin: 0.7, optimalMax: 1.3, high: 1.5 } },
  },
  Albumin: {
    description: "Main blood protein; liver and nutrition marker.",
    whyItMatters: "Low albumin can reflect nutrition or liver status.",
    foods: "Adequate protein.",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "With CMP.",
    recommendedTests: ["AST", "ALT"],
    researchSummary: "",
    ranges: { general: { deficient: 3.2, suboptimalMin: 3.5, optimalMin: 3.5, optimalMax: 5.5, high: 6 } },
  },
  SHBG: {
    description: "Sex hormone-binding globulin; binds testosterone.",
    whyItMatters: "Affects free testosterone; interpret with total testosterone.",
    foods: "—",
    lifestyle: "Body composition, insulin sensitivity.",
    supplementNotes: "Do not self-treat hormones; discuss with provider.",
    retest: "As advised.",
    recommendedTests: ["Testosterone", "Free testosterone"],
    researchSummary: "",
    ranges: { general: { optimalMin: 20, optimalMax: 80, high: 100 } },
  },
  "Free testosterone": {
    description: "Unbound, biologically active testosterone.",
    whyItMatters: "Often more relevant than total T when SHBG is abnormal.",
    foods: "—",
    lifestyle: "Sleep, stress, energy availability.",
    supplementNotes: "Medical follow-up; do not self-treat with hormones.",
    retest: "As advised.",
    recommendedTests: ["Testosterone", "SHBG"],
    researchSummary: "",
    ranges: { general: { optimalMin: 50, optimalMax: 200, high: 250 } },
  },
  Estradiol: {
    description: "Primary estrogen; important in both sexes.",
    whyItMatters: "Relevant for bone, cardiovascular, and reproductive health.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Do not self-treat; medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["Testosterone", "FSH", "LH"],
    researchSummary: "",
    ranges: { general: { optimalMin: 15, optimalMax: 50, high: 60 } },
  },
  "Cortisol (AM)": {
    description: "Morning cortisol; stress and adrenal axis.",
    whyItMatters: "High or low can reflect stress, sleep, or adrenal function.",
    foods: "—",
    lifestyle: "Sleep, stress management, recovery.",
    supplementNotes: "Do not self-treat; focus on lifestyle and retest.",
    retest: "As advised; repeat AM draw.",
    recommendedTests: [],
    researchSummary: "",
    ranges: { general: { optimalMin: 6, optimalMax: 20, high: 25 } },
  },
  // CBC remainder
  MCH: {
    description: "Mean corpuscular hemoglobin; average hemoglobin per red cell (CBC).",
    whyItMatters: "Helps classify anemia with MCV and MCHC.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["Hemoglobin", "MCV", "Ferritin"],
    researchSummary: "",
    ranges: { general: { optimalMin: 27, optimalMax: 33, high: 34 } },
  },
  RDW: {
    description: "Red cell distribution width; variation in red cell size (CBC).",
    whyItMatters: "Elevated in some anemias (e.g. iron deficiency).",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["Hemoglobin", "MCV", "Ferritin"],
    researchSummary: "",
    ranges: { general: { optimalMin: 11.5, optimalMax: 14.5, high: 15 } },
  },
  WBC: {
    description: "White blood cell count (CBC).",
    whyItMatters: "Infection, inflammation, or immune context.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up for abnormal values.",
    retest: "As advised.",
    recommendedTests: ["CBC"],
    researchSummary: "",
    ranges: { general: { optimalMin: 4.5, optimalMax: 11, high: 12 } },
  },
  Platelets: {
    description: "Platelet count (CBC); clotting support.",
    whyItMatters: "Very high or low can warrant follow-up.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["CBC"],
    researchSummary: "",
    ranges: { general: { optimalMin: 150, optimalMax: 400, high: 450 } },
  },
  // CMP remainder
  Calcium: {
    description: "Serum calcium; bone and metabolism (CMP).",
    whyItMatters: "Interpret with albumin; abnormal may need PTH/vitamin D workup.",
    foods: "Dairy, fortified foods, greens.",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["Albumin", "Vitamin D"],
    researchSummary: "",
    ranges: { general: { optimalMin: 8.6, optimalMax: 10.2, high: 10.5 } },
  },
  Sodium: {
    description: "Serum sodium; electrolyte (CMP).",
    whyItMatters: "Hydration and kidney context.",
    foods: "—",
    lifestyle: "Hydration.",
    supplementNotes: "Medical follow-up.",
    retest: "With CMP.",
    recommendedTests: ["Potassium", "Chloride"],
    researchSummary: "",
    ranges: { general: { optimalMin: 136, optimalMax: 145, high: 146 } },
  },
  Potassium: {
    description: "Serum potassium; electrolyte (CMP).",
    whyItMatters: "Heart and muscle function.",
    foods: "Bananas, potatoes, leafy greens.",
    lifestyle: "Hydration.",
    supplementNotes: "Do not self-supplement; medical follow-up.",
    retest: "With CMP.",
    recommendedTests: ["Sodium", "Chloride"],
    researchSummary: "",
    ranges: { general: { optimalMin: 3.5, optimalMax: 5.0, high: 5.2 } },
  },
  Chloride: {
    description: "Serum chloride; electrolyte (CMP).",
    whyItMatters: "Often interpreted with sodium and CO2.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "With CMP.",
    recommendedTests: ["Sodium", "Potassium"],
    researchSummary: "",
    ranges: { general: { optimalMin: 98, optimalMax: 106, high: 108 } },
  },
  CO2: {
    description: "CO2 / bicarbonate; electrolyte (CMP).",
    whyItMatters: "Acid-base and kidney context.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "With CMP.",
    recommendedTests: ["BUN", "Creatinine"],
    researchSummary: "",
    ranges: { general: { optimalMin: 23, optimalMax: 29, high: 31 } },
  },
  "Total protein": {
    description: "Total serum protein (CMP).",
    whyItMatters: "Nutrition and liver context with albumin.",
    foods: "Adequate protein intake.",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "With CMP.",
    recommendedTests: ["Albumin"],
    researchSummary: "",
    ranges: { general: { optimalMin: 6.0, optimalMax: 8.3, high: 8.5 } },
  },
  AST: {
    description: "Aspartate aminotransferase; liver/muscle enzyme (CMP).",
    whyItMatters: "Elevated with liver or muscle stress; interpret with ALT.",
    foods: "—",
    lifestyle: "Avoid alcohol excess; recovery.",
    supplementNotes: "Do not self-treat; medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["ALT", "Albumin"],
    researchSummary: "",
    ranges: { general: { optimalMin: 10, optimalMax: 40, high: 50 } },
  },
  ALT: {
    description: "Alanine aminotransferase; liver enzyme (CMP).",
    whyItMatters: "Liver health; interpret with AST.",
    foods: "—",
    lifestyle: "Avoid alcohol excess.",
    supplementNotes: "Medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["AST", "Albumin"],
    researchSummary: "",
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
    researchSummary: "",
    ranges: { general: { optimalMin: 44, optimalMax: 147, high: 150 } },
  },
  Bilirubin: {
    description: "Bilirubin; liver breakdown product (CMP).",
    whyItMatters: "Liver function and hemolysis context.",
    foods: "—",
    lifestyle: "—",
    supplementNotes: "Medical follow-up.",
    retest: "As advised.",
    recommendedTests: ["AST", "ALT"],
    researchSummary: "",
    ranges: { general: { optimalMin: 0.1, optimalMax: 1.2, high: 1.5 } },
  },
}