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
}