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
      "Ferritin reflects stored iron and helps indicate whether iron reserves are sufficient for oxygen transport and training demands.",
    whyItMatters:
      "Low ferritin can limit energy, oxygen transport, and endurance. Iron deficiency is common; reckless supplementing is dangerous—do not supplement if ferritin is high/normal in adult men or postmenopausal women, or if anemia cause is unclear.",
    foods:
      "Heme iron first: clams, beef liver, red meat, sardines. Non-heme: lentils, beans, spinach, fortified cereals. Pair iron-rich meals with vitamin C (citrus, kiwi, peppers, berries). Avoid coffee/tea/calcium-heavy meals at iron-rich meals when repletion is the goal.",
    lifestyle:
      "Reduce stealth inhibitors of iron absorption around iron-heavy meals: coffee, tea, calcium supplements. If ferritin keeps falling, look for the reason: blood loss, GI issues, training load, diet quality. Retest rather than guessing.",
    supplementNotes:
      "If low or suboptimal: 25–65 mg elemental iron every other day or daily depending on tolerance and clinician context. Alternate-day dosing often improves tolerance. Retest in 8–12 weeks. Do not megadose; iron overdose is dangerous especially for children.",
    retest: "Retest in 8–12 weeks after intervention.",
    recommendedTests: ["CBC", "Iron Panel", "Transferrin Saturation"],
    researchSummary:
      "Endurance athletes often perform better with ferritin clearly above minimum clinical norms.",
    whatItDoes: [
      "Stores iron for the body",
      "Supports oxygen transport",
      "Supports energy production",
      "Supports cognitive function",
      "Supports hair growth",
    ],
    symptomsLow: ["Fatigue", "Poor endurance", "Brain fog", "Hair shedding", "Restless legs"],
    symptomsHigh: ["Nausea", "Organ stress if very high"],
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
      "25-OH Vitamin D reflects vitamin D status. It supports musculoskeletal health, immunity, recovery, and bone function.",
    whyItMatters:
      "Vitamin D status is one of the most common low or low-normal findings. It connects to immunity, bone health, and general wellness. High-dose use should be personalized and clinician-supervised.",
    whatItDoes: ["Bone health", "Immune function", "Mood", "Muscle function", "Calcium absorption"],
    symptomsLow: ["Fatigue", "Weaker immunity", "Low mood", "Bone or muscle aches"],
    symptomsHigh: ["Nausea", "Weakness", "Confusion (rare)"],
    foods:
      "Salmon, sardines, egg yolks, fortified dairy or plant milks. Sun exposure contributes but food and supplements are easier to standardize.",
    lifestyle:
      "Consistent sunlight when feasible. Pair supplementation with regular meals for adherence. Retest after a stable routine (8–12 weeks), not after a few random doses.",
    supplementNotes:
      "Low-risk maintenance: 1,000–2,000 IU/day. For clearly low values, many protocols use 2,000–5,000 IU/day for a repletion window; recheck in 8–12 weeks. D3 is the preferred form.",
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
      "Magnesium supports ATP production, muscle contraction, relaxation, nervous system function, sleep, and recovery.",
    whatItDoes: ["ATP production", "Muscle function", "Nervous system", "Sleep", "Recovery"],
    symptomsLow: ["Muscle cramps", "Fatigue", "Poor sleep", "Restlessness"],
    symptomsHigh: ["Diarrhea", "Weakness (rare)"],
    whyItMatters:
      "Low magnesium can contribute to poor recovery, cramps, sleep issues, and reduced energy metabolism. One of the most marketable and broadly applicable biomarkers in consumer health. Use caution in kidney disease.",
    foods:
      "Pumpkin seeds, almonds, cashews, black beans, dark chocolate, spinach and leafy greens.",
    lifestyle:
      "Improve sleep timing and recovery. Review alcohol intake if magnesium stays stubbornly low. Spread supplemental intake if GI tolerance is an issue.",
    supplementNotes:
      "Start 100–200 mg elemental magnesium per day, often in the evening; titrate toward 200–350 mg/day. NIH ODS supplemental UL 350 mg/day unless clinician directs otherwise. Glycinate is often better tolerated. Retest in 8–12 weeks.",
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
      "Vitamin B12 supports red blood cell production, nervous system function, and energy metabolism.",
    whyItMatters:
      "Low or low-normal B12 often links to fatigue, RBC support, and neurological health. Risk is higher with low animal-food intake, GI issues, PPIs, and metformin use.",
    whatItDoes: ["Red blood cell production", "Nervous system", "Energy metabolism", "DNA synthesis"],
    symptomsLow: ["Fatigue", "Brain fog", "Numbness or tingling", "Anemia"],
    foods:
      "Shellfish, beef, salmon, dairy, eggs. If avoiding animal foods, B12 is much harder to optimize through food alone.",
    lifestyle:
      "Review medications (PPIs, metformin) that can affect absorption. Consider GI absorption issues if levels stay low despite intake. Retest rather than stacking more B12; severe deficiency or neurologic symptoms need clinician-guided treatment.",
    supplementNotes:
      "Low-normal or low: often 1,000 mcg/day oral or sublingual. Methylcobalamin and cyanocobalamin are both used. Retest in 8–12 weeks.",
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

  Folate: {
    description:
      "Folate (B9) is essential for DNA synthesis, cell division, and red blood cell formation. Serum or RBC folate reflects status.",
    whyItMatters:
      "Folate is broadly relevant to blood health and pairs with B12; deficiency can contribute to anemia and elevated homocysteine. Do not megadose folic acid—excess can mask B12 deficiency.",
    whatItDoes: ["DNA synthesis", "Cell division", "Red blood cell formation", "Homocysteine metabolism"],
    symptomsLow: ["Fatigue", "Anemia", "Elevated homocysteine", "Poor concentration"],
    foods:
      "Leafy greens (spinach, kale, romaine), lentils, beans, asparagus, avocado, fortified grains and cereals.",
    lifestyle:
      "If folate is low, confirm B12 status too. Avoid high-dose folic acid without clinician context.",
    supplementNotes:
      "400–800 mcg/day is common; avoid above 1,000 mcg/day folic acid without guidance. Methylfolate (5-MTHF) is an active form.",
    retest: "Retest in 8–12 weeks if repleting.",
    recommendedTests: ["Vitamin B12", "CBC", "Homocysteine"],
    researchSummary:
      "Folic acid fortification has reduced deficiency in many populations; active forms (5-MTHF) may be preferred when methylation is a consideration.",
    ranges: {
      general: { deficient: 3, suboptimalMin: 4, optimalMin: 4, optimalMax: 20, high: 24 },
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
      "Fasting glucose reflects metabolic health and day-to-day fuel regulation. Complements HbA1c with a more immediate metabolic snapshot.",
    whyItMatters:
      "ADA standards support lifestyle-first approaches for prevention and delay of type 2 diabetes. Poor fasting glucose can signal impaired metabolic flexibility.",
    foods:
      "More legumes, oats, beans, berries, vegetables; protein-forward breakfasts. Fewer sugar-sweetened beverages and refined carb snacks.",
    lifestyle:
      "10–15 minute walk after meals, resistance training, sleep consistency, reduce sedentary time.",
    supplementNotes:
      "Psyllium 5–10 g/day in divided doses before or with meals. Berberine only with clinician awareness. Lifestyle first; retest in 8–12 weeks.",
    retest: "Retest in 8–12 weeks.",
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
    description: "Average blood glucose over ~3 months; key for metabolic health. ADA guidance strongly supports lifestyle interventions for prevention and delay of type 2 diabetes.",
    whyItMatters: "Elevated HbA1c indicates prediabetes or diabetes risk. One of the clearest premium health software biomarkers.",
    foods: "Meals built around beans, lentils, intact grains, vegetables, berries; Greek yogurt or other high-protein foods. Minimize refined carbohydrate and liquid calories.",
    lifestyle: "Post-meal walking (10–15 min), resistance training, weight loss if indicated, sleep regularity. Limit ultra-processed snacks and late-night overeating.",
    supplementNotes: "Berberine: common protocol 500 mg with meals 2–3x/day. Can interact with diabetes meds; avoid in pregnancy. Lifestyle-first; discuss with provider. Strong in-app warnings required.",
    retest: "Every 8–12 weeks if tracking.",
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
    description: "Blood fats; part of lipid panel. Highly responsive to lifestyle.",
    whyItMatters: "High triglycerides increase cardiovascular risk. AHA guidance emphasizes diet and lifestyle; users can often see meaningful improvement with alcohol reduction, carb quality, weight loss, and omega-3.",
    foods: "Fatty fish (salmon, sardines, mackerel). Lower alcohol and added sugar/refined carbs. Increase fiber and total protein.",
    lifestyle: "Reduce alcohol if elevated. Improve weight, activity, and carbohydrate quality. More exercise; fewer liquid calories.",
    supplementNotes: "General support: 1–2 g/day EPA+DHA. For high TG, AHA discusses 4 g/day omega-3 in prescription-level context—educate in-app, do not present as casual OTC dose.",
    retest: "With lipid panel in 8–12 weeks.",
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
    description: "Low-density lipoprotein cholesterol. One of the most recognized cardiometabolic biomarkers.",
    whyItMatters: "Elevated LDL is a major modifiable cardiovascular risk factor. Lifestyle is foundational; nudge users to clinician if LDL-C is very high or ApoB/non-HDL concerning.",
    foods: "Oats, barley, beans, nuts, extra-virgin olive oil. More unsaturated fats; less saturated and trans fat.",
    lifestyle: "Weight management, aerobic and resistance training. Reduce saturated fat from processed meat and high-fat dairy if intake is high.",
    supplementNotes: "Psyllium ~10 g/day (meta-analysis ~7% LDL reduction). Plant sterols 1.5–2 g/day. Discuss with provider; no self-directed statin.",
    retest: "With lipid panel in 8–12 weeks.",
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
    description: "High-sensitivity C-reactive protein; marker of inflammation. ACC/AHA-aligned guidance emphasizes lifestyle for lowering inflammatory risk.",
    whyItMatters: "≥2 mg/L is risk-enhancing; useful for recovery and cardiometabolic context. Users understand it as 'something is stressing the system.'",
    foods: "Mediterranean-style pattern: fatty fish, extra-virgin olive oil, berries, legumes, nuts. More minimally processed foods.",
    lifestyle: "150+ min/week moderate activity, weight reduction if needed, smoking cessation, better sleep regularity and stress management.",
    supplementNotes: "Curcumin phytosome 500–1,000 mg/day. Omega-3 1–2 g/day EPA+DHA. Bleeding-risk warnings for omega-3 and curcumin if on anticoagulants.",
    retest: "2–6 weeks if acute; 8–12 weeks if tracking.",
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