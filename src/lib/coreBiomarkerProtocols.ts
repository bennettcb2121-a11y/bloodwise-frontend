/**
 * Clarion Core Biomarker Set — 10 biomarkers with science-backed protocols, foods, lifestyle, and product tiers.
 * Use for education and decision support only; not medical diagnosis. Clinician oversight required for
 * iron when ferritin is high/normal or cause unclear, berberine with diabetes meds/pregnancy,
 * high-dose vitamin D, magnesium in kidney disease, omega-3/curcumin with anticoagulants.
 */

export const CLARION_CORE_BIOMARKERS = [
  "Ferritin",
  "25-OH Vitamin D",
  "Vitamin B12",
  "Folate",
  "Magnesium",
  "HbA1c",
  "Fasting Glucose",
  "LDL-C",
  "Triglycerides",
  "hs-CRP",
] as const

/** Same 10 biomarkers as panel keys (use "Vitamin D" and "Glucose" to match biomarkerDatabase). */
export const CLARION_RECOMMENDED_PANEL_KEYS: string[] = [
  "Ferritin",
  "Vitamin D",
  "Vitamin B12",
  "Folate",
  "Magnesium",
  "HbA1c",
  "Glucose",
  "LDL-C",
  "Triglycerides",
  "hs-CRP",
]

export type CoreBiomarkerId = (typeof CLARION_CORE_BIOMARKERS)[number]

export type ProductTier = {
  label: "Cheapest" | "Premium" | "Overall winner"
  productName: string
  asin: string
  why: string
}

export type CoreBiomarkerProtocol = {
  biomarker: string
  /** Display name for "25-OH Vitamin D" etc. */
  displayName: string
  whyItMatters: string
  foods: string[]
  lifestyle: string[]
  suggestedProtocol: string
  warnings?: string
  /** Cheapest, Premium, Overall winner supplements */
  products: {
    cheapest: ProductTier
    premium: ProductTier
    overallWinner: ProductTier
  }
  /** Optional lifestyle/diet tools (cast iron, cod liver oil, etc.) */
  lifestyleTools?: { name: string; asin: string; why: string }[]
}

export const coreBiomarkerProtocols: Record<string, CoreBiomarkerProtocol> = {
  Ferritin: {
    biomarker: "Ferritin",
    displayName: "Ferritin",
    whyItMatters:
      "Ferritin reflects stored iron. Low levels can limit energy, oxygen transport, and endurance. Iron deficiency is common; reckless supplementing is dangerous—good software interpretation is especially valuable.",
    foods: [
      "Heme iron: clams, beef liver, red meat, sardines",
      "Non-heme: lentils, beans, spinach, fortified cereals",
      "Pair iron-rich meals with vitamin C: citrus, kiwi, peppers, berries",
      "Avoid taking iron with coffee, tea, or calcium-heavy meals when repletion is the goal",
    ],
    lifestyle: [
      "Reduce stealth inhibitors of iron absorption around iron-heavy meals: coffee, tea, calcium supplements",
      "If ferritin keeps falling, look for the reason: blood loss, GI issues, training load, diet quality",
      "Retest rather than guessing; do not megadose iron without follow-up labs",
    ],
    suggestedProtocol:
      "If ferritin is low or clearly suboptimal: 25–65 mg elemental iron every other day or daily depending on tolerance and clinician context. Alternate-day dosing often improves tolerance and may improve absorption (ODS guidance). Retest in 8–12 weeks.",
    warnings:
      "Do not supplement iron if ferritin is high or normal in adult men or postmenopausal women, or if anemia cause is unclear. Iron overdose is dangerous, especially for children.",
    products: {
      cheapest: {
        label: "Cheapest",
        productName: "Nature Made Iron 65 mg (ferrous sulfate)",
        asin: "B000QGKHQA",
        why: "Ferrous sulfate is usually the lowest cost per mg.",
      },
      premium: {
        label: "Premium",
        productName: "Thorne Iron Bisglycinate 25 mg",
        asin: "B0797GZDZL",
        why: "Strong for trust, tolerability, and sports/health branding; third-party tested.",
      },
      overallWinner: {
        label: "Overall winner",
        productName: "Solgar Gentle Iron 25 mg (iron bisglycinate)",
        asin: "B005P0TJ84",
        why: "Gentler form than sulfate, easier for users to stick with; strong middle-ground option.",
      },
    },
    lifestyleTools: [
      { name: "Cast iron skillet", asin: "B0009IBO0Q", why: "Cook acidic foods (e.g. tomato) in cast iron to boost dietary iron." },
      { name: "Vitamin C supplement or acerola powder", asin: "B0013OW2KS", why: "Pair with non-heme iron to enhance absorption." },
    ],
  },

  "25-OH Vitamin D": {
    biomarker: "25-OH Vitamin D",
    displayName: "25-OH Vitamin D",
    whyItMatters:
      "Vitamin D status is one of the most common low or low-normal findings. It connects to immunity, bone health, and general wellness. Many adults are insufficient; dose should be guided by levels.",
    foods: [
      "Salmon, sardines, egg yolks",
      "Fortified dairy and plant milks",
      "Sun exposure contributes but food + supplements are easier to standardize",
    ],
    lifestyle: [
      "Consistent sunlight when feasible (skin type and location matter)",
      "Pair supplementation with regular meals for adherence",
      "Retest after a stable routine (8–12 weeks), not after a few random doses",
    ],
    suggestedProtocol:
      "Low-risk maintenance: 1,000–2,000 IU/day. For clearly low values, many protocols use 2,000–5,000 IU/day for a repletion window before retesting; high-dose use should be personalized. Recheck in 8–12 weeks.",
    warnings: "High-dose vitamin D should be clinician-supervised; avoid unsupervised high-dose defaults.",
    products: {
      cheapest: {
        label: "Cheapest",
        productName: "Nature Made Vitamin D3 2000 IU",
        asin: "B004U3Y8NI",
        why: "Great budget and mainstream trust.",
      },
      premium: {
        label: "Premium",
        productName: "Sports Research Vitamin D3 + K2",
        asin: "B07NXW4GW7",
        why: "Strong premium wellness option; K2 may help direct calcium to bone.",
      },
      overallWinner: {
        label: "Overall winner",
        productName: "Sports Research Vitamin D3 5000 IU",
        asin: "B00JGCBGZQ",
        why: "Best all-around blend of dose, brand appeal, and convenience.",
      },
    },
    lifestyleTools: [
      { name: "Cod liver oil", asin: "B002CQU564", why: "Food-source vitamin D and omega-3." },
    ],
  },

  "Vitamin B12": {
    biomarker: "Vitamin B12",
    displayName: "Vitamin B12",
    whyItMatters:
      "B12 supports red blood cell production, energy metabolism, and neurological function. Low or low-normal B12 often links to fatigue and RBC support. Risk is higher with low animal-food intake, GI issues, PPIs, and metformin.",
    foods: [
      "Shellfish, beef, salmon",
      "Dairy, eggs",
      "If avoiding animal foods, B12 is much harder to optimize through food alone—supplementation or fortified foods are typically needed",
    ],
    lifestyle: [
      "Review medications (PPIs, metformin) that can affect absorption",
      "Consider GI absorption issues if levels stay low despite intake",
      "Retest rather than stacking more and more B12; severe deficiency or neurologic symptoms need clinician-guided treatment",
    ],
    suggestedProtocol:
      "Low-normal or low B12: often 1,000 mcg/day oral or sublingual. If severe deficiency, neurologic symptoms, or malabsorption is suspected, clinician-guided treatment is appropriate rather than OTC self-correction. Retest in 8–12 weeks.",
    products: {
      cheapest: {
        label: "Cheapest",
        productName: "Nature Made B12 1000 mcg",
        asin: "B005DXM32M",
        why: "Familiar, basic cyanocobalamin option.",
      },
      premium: {
        label: "Premium",
        productName: "Jarrow Methyl B12 5000 mcg",
        asin: "B0013OQGO6",
        why: "Methylcobalamin is very marketable and user-friendly.",
      },
      overallWinner: {
        label: "Overall winner",
        productName: "NOW Methyl B-12 1000 mcg",
        asin: "B001F0R7VE",
        why: "Balances cost, active form, and ease.",
      },
    },
  },

  Folate: {
    biomarker: "Folate",
    displayName: "Folate",
    whyItMatters:
      "Folate is broadly relevant to DNA synthesis, cell division, and blood health. It pairs naturally with B12 in a premium biomarker platform; deficiency can contribute to anemia and elevated homocysteine.",
    foods: [
      "Leafy greens (spinach, kale, romaine)",
      "Lentils, beans",
      "Asparagus, avocado",
      "Fortified grains and cereals",
    ],
    lifestyle: [
      "If folate is low, confirm B12 status too (masking of B12 deficiency can occur with high folic acid)",
      "Do not megadose folic acid casually",
    ],
    suggestedProtocol:
      "Many users do well with 400–800 mcg/day. Avoid going above 1,000 mcg/day folic acid without clinician context, as excessive folic acid can mask B12 deficiency. Retest in 8–12 weeks if repleting.",
    warnings: "High folic acid can mask B12 deficiency; interpret with B12 and clinical context.",
    products: {
      cheapest: {
        label: "Cheapest",
        productName: "Nature Made Folic Acid 400 mcg",
        asin: "B0000DJAPS",
        why: "Straightforward, low-cost folic acid.",
      },
      premium: {
        label: "Premium",
        productName: "Thorne 5-MTHF (5-methyltetrahydrofolate)",
        asin: "B005BSMVFS",
        why: "Active form from a premium brand; useful when methylation or MTHFR is a consideration.",
      },
      overallWinner: {
        label: "Overall winner",
        productName: "Solgar Folate 1000 mcg (Metafolin / methylfolate)",
        asin: "B00I5MTK5G",
        why: "Active folate, simpler dosage, good mass-market credibility.",
      },
    },
  },

  Magnesium: {
    biomarker: "Magnesium",
    displayName: "Magnesium",
    whyItMatters:
      "Magnesium supports muscle function, nervous system balance, sleep, and recovery. It is one of the most marketable and broadly applicable biomarkers in consumer health; commonly low in athletes and high-stress lifestyles.",
    foods: [
      "Pumpkin seeds, almonds, cashews",
      "Black beans, dark chocolate",
      "Spinach and leafy greens",
    ],
    lifestyle: [
      "Improve sleep timing and recovery routine",
      "Review alcohol intake if magnesium stays stubbornly low",
      "Spread supplemental intake if GI tolerance is an issue (e.g. split dose)",
    ],
    suggestedProtocol:
      "Start with 100–200 mg elemental magnesium per day, often in the evening. Titrate toward 200–350 mg/day supplemental magnesium. NIH ODS supplemental UL is 350 mg/day for adults unless a clinician directs otherwise. Retest in 8–12 weeks if tracking.",
    warnings: "Use caution with magnesium in kidney disease; discuss with provider.",
    products: {
      cheapest: {
        label: "Cheapest",
        productName: "Doctor's Best High Absorption Magnesium Glycinate/Lysinate",
        asin: "B000BD0RT0",
        why: "One of the easiest best-value options in the category.",
      },
      premium: {
        label: "Premium",
        productName: "Thorne Magnesium Bisglycinate Powder",
        asin: "B0797HBLL3",
        why: "Premium, flexible for dose titration.",
      },
      overallWinner: {
        label: "Overall winner",
        productName: "Doctor's Best High Absorption Magnesium Glycinate/Lysinate",
        asin: "B000BD0RT0",
        why: "Same as cheapest here—best value and tolerability in one.",
      },
    },
    lifestyleTools: [
      { name: "Epsom salt (magnesium sulfate)", asin: "B001G7R2WC", why: "Topical/bath option for those who prefer not to take another pill." },
    ],
  },

  HbA1c: {
    biomarker: "HbA1c",
    displayName: "HbA1c",
    whyItMatters:
      "HbA1c reflects average blood glucose over ~3 months and is one of the clearest premium health software biomarkers. ADA guidance strongly supports lifestyle interventions for prevention and delay of type 2 diabetes.",
    foods: [
      "Meals built around beans, lentils, intact grains, vegetables, berries",
      "Greek yogurt or other high-protein foods",
      "Minimize refined carbohydrate and liquid calories",
    ],
    lifestyle: [
      "Post-meal walking (10–15 min)",
      "Resistance training",
      "Weight loss if indicated",
      "Sleep regularity",
      "Limit ultra-processed snacks and late-night overeating",
    ],
    suggestedProtocol:
      "Berberine: common retail protocol is 500 mg with meals, 2–3x/day. Not a casual supplement for everyone—can interact with diabetes medications and should be avoided in pregnancy. Use strong in-app warnings. Retest in 8–12 weeks.",
    warnings:
      "Berberine can interact with diabetes medications and should be avoided in pregnancy. Do not use instead of prescribed therapy without clinician oversight.",
    products: {
      cheapest: {
        label: "Cheapest",
        productName: "NOW Berberine Glucose Support",
        asin: "B07PSMZ3J1",
        why: "Easiest high-value entry point for berberine.",
      },
      premium: {
        label: "Premium",
        productName: "Thorne Berberine",
        asin: "B009LI7VRC",
        why: "Trusted premium version; quality and consistency.",
      },
      overallWinner: {
        label: "Overall winner",
        productName: "NOW Berberine Glucose Support",
        asin: "B07PSMZ3J1",
        why: "Strong evidence base for glycemic and lipid support; cost-effective.",
      },
    },
  },

  "Fasting Glucose": {
    biomarker: "Fasting Glucose",
    displayName: "Fasting Glucose",
    whyItMatters:
      "Fasting glucose complements HbA1c by giving a more immediate metabolic snapshot. ADA standards support lifestyle-first approaches for prevention and delay of type 2 diabetes.",
    foods: [
      "More legumes, oats, beans, berries, vegetables",
      "Protein-forward breakfasts",
      "Fewer sugar-sweetened beverages and refined carb snacks",
    ],
    lifestyle: [
      "10–15 minute walk after meals",
      "Build muscle via resistance training",
      "Sleep consistency",
      "Reduce total sedentary time",
    ],
    suggestedProtocol:
      "Psyllium: 5–10 g/day in divided doses, often before or with meals. Berberine: clinician-aware use if chosen. Lifestyle is first line; retest in 8–12 weeks.",
    products: {
      cheapest: {
        label: "Cheapest",
        productName: "NOW Psyllium Husk 500 mg, 500 capsules",
        asin: "B0013OW2KS",
        why: "Safe, practical, meal-linked fiber; easier than jumping to stronger botanicals.",
      },
      premium: {
        label: "Premium",
        productName: "Thorne Berberine",
        asin: "B009LI7VRC",
        why: "Stronger action option with more caveats; for users who want a premium glucose-support supplement.",
      },
      overallWinner: {
        label: "Overall winner",
        productName: "Kirkland Signature Sugar-Free Psyllium Fiber Powder",
        asin: "B0CHTNWWLJ",
        why: "Psyllium has clean, repeatable evidence; good balance of cost and effectiveness.",
      },
    },
  },

  "LDL-C": {
    biomarker: "LDL-C",
    displayName: "LDL-C",
    whyItMatters:
      "LDL-C is one of the most recognized cardiometabolic biomarkers. Elevated LDL is a major modifiable cardiovascular risk factor. Lifestyle is foundational; supplements can support but do not replace diet and activity.",
    foods: [
      "Oats, barley, beans, nuts",
      "Extra-virgin olive oil",
      "More unsaturated fats; less saturated and trans fat",
    ],
    lifestyle: [
      "Weight management",
      "Aerobic exercise and resistance training",
      "Reduce saturated fat, especially from processed meat and high-fat dairy if intake is high",
    ],
    suggestedProtocol:
      "Psyllium: target ~10 g/day (meta-analysis shows ~7% LDL-C reduction at ~10.2 g/day). Plant sterols: often 1.5–2 g/day. Clarion should nudge users to talk with a clinician if LDL-C is very high or if ApoB/non-HDL are also concerning.",
    products: {
      cheapest: {
        label: "Cheapest",
        productName: "Kirkland Signature Sugar-Free Psyllium Fiber Powder",
        asin: "B0CHTNWWLJ",
        why: "Clean, repeatable evidence; low cost.",
      },
      premium: {
        label: "Premium",
        productName: "Nature Made CholestOff Plus (plant sterols)",
        asin: "B008I2JVB6",
        why: "Strong premium add-on for LDL support.",
      },
      overallWinner: {
        label: "Overall winner",
        productName: "Metamucil Sugar-Free Psyllium Husk Powder",
        asin: "B003CT2YQY",
        why: "Well-studied; ~10 g/day shown to lower LDL-C in meta-analysis.",
      },
    },
  },

  "HDL-C": {
    biomarker: "HDL-C",
    displayName: "HDL-C",
    whyItMatters:
      "HDL-C is one piece of your lipid panel. Risk is not predicted from HDL alone—clinicians interpret LDL, HDL, triglycerides, and often ApoB or non-HDL together. Lifestyle (activity, smoking cessation, diet pattern) matters; this is not a marker to “optimize” with the same supplement playbook as LDL.",
    foods: [
      "Mediterranean-style pattern: olive oil, nuts, legumes, vegetables",
      "Fatty fish in context of overall fat quality",
      "Minimize trans fats; limit ultra-processed foods",
    ],
    lifestyle: [
      "Regular aerobic and resistance training",
      "Smoking cessation if applicable",
      "Weight and metabolic health (often linked with triglycerides and LDL context)",
    ],
    suggestedProtocol:
      "There is no strong evidence-based ‘HDL-raising’ supplement stack. Focus on lifestyle and interpret HDL with your full lipid panel and clinician. Omega-3 is sometimes discussed for triglycerides and general cardiovascular context—use only with clinician awareness, especially on blood thinners.",
    warnings:
      "Do not mirror LDL-focused fiber/sterols here for ‘raising HDL’—interpretation is panel-based and individualized.",
    products: {
      cheapest: {
        label: "Cheapest",
        productName: "Kirkland Signature Fish Oil",
        asin: "B01L0S0T8I",
        why: "Often discussed for triglycerides and general omega-3 intake—not a standalone HDL strategy.",
      },
      premium: {
        label: "Premium",
        productName: "Thorne Super EPA Pro",
        asin: "B005CD3J9E",
        why: "Concentrated EPA+DHA when a clinician supports omega-3 in your plan.",
      },
      overallWinner: {
        label: "Overall winner",
        productName: "Sports Research Triple Strength Omega-3",
        asin: "B07DX89ZHN",
        why: "Practical omega-3 option; pair with lipid panel discussion—not a substitute for medical risk assessment.",
      },
    },
  },

  Triglycerides: {
    biomarker: "Triglycerides",
    displayName: "Triglycerides",
    whyItMatters:
      "Triglycerides are highly responsive to lifestyle and a great win biomarker—users can often see meaningful improvement with alcohol reduction, carb quality improvement, weight loss, and omega-3. AHA guidance emphasizes diet and lifestyle.",
    foods: [
      "Fatty fish (salmon, sardines, mackerel)",
      "Lower alcohol and added sugar / refined carbs",
      "Increase fiber and total protein",
    ],
    lifestyle: [
      "Reduce alcohol if elevated",
      "Improve weight, activity, and carbohydrate quality",
      "More exercise; fewer liquid calories",
    ],
    suggestedProtocol:
      "For general support, many consumer products target 1–2 g/day EPA+DHA. For high triglycerides, AHA science advisory discusses 4 g/day omega-3 therapy (typically prescription-level context)—educate in-app but do not present as casual OTC self-dose.",
    products: {
      cheapest: {
        label: "Cheapest",
        productName: "Kirkland Signature Fish Oil",
        asin: "B01L0S0T8I",
        why: "Low cost, mainstream option.",
      },
      premium: {
        label: "Premium",
        productName: "Thorne Super EPA Pro",
        asin: "B005CD3J9E",
        why: "Strong concentration and brand trust.",
      },
      overallWinner: {
        label: "Overall winner",
        productName: "Sports Research Triple Strength Omega-3",
        asin: "B07DX89ZHN",
        why: "Strong EPA+DHA per capsule; very marketable and effective.",
      },
    },
  },

  "hs-CRP": {
    biomarker: "hs-CRP",
    displayName: "hs-CRP",
    whyItMatters:
      "hs-CRP gives an inflammation/risk signal that users understand as 'something is stressing the system.' ACC/AHA-aligned guidance emphasizes lifestyle for lowering inflammatory risk: activity, plant-predominant eating, weight, sleep, stress, smoking cessation.",
    foods: [
      "Mediterranean-style pattern",
      "Fatty fish, extra-virgin olive oil, berries, legumes, nuts",
      "More minimally processed foods",
    ],
    lifestyle: [
      "150+ min/week moderate activity",
      "Weight reduction if needed",
      "Smoking cessation",
      "Better sleep regularity and stress management",
    ],
    suggestedProtocol:
      "Curcumin phytosome: commonly 500–1,000 mg/day. Omega-3: commonly 1–2 g/day EPA+DHA. Make bleeding-risk warnings visible for omega-3 and curcumin if user is on anticoagulants or has bleeding risk.",
    warnings: "Omega-3 and curcumin can affect bleeding risk; caution with anticoagulants.",
    products: {
      cheapest: {
        label: "Cheapest",
        productName: "NOW Curcumin 665 mg",
        asin: "B0013L852A",
        why: "Standardized curcumin at a lower barrier to entry.",
      },
      premium: {
        label: "Premium",
        productName: "Thorne Curcumin Phytosome (Meriva) 500 mg",
        asin: "B01D8V0962",
        why: "Better absorption/clinical-story product.",
      },
      overallWinner: {
        label: "Overall winner",
        productName: "Nordic Naturals Ultimate Omega",
        asin: "B002CQU564",
        why: "Easier for many users to tolerate long-term; also supports triglycerides; strong evidence base.",
      },
    },
  },
}

/** Normalize biomarker key for lookup (e.g. "Vitamin D" -> "25-OH Vitamin D" for core set). */
export function getCoreProtocol(biomarkerName: string): CoreBiomarkerProtocol | null {
  const normalized = biomarkerName.trim()
  if (coreBiomarkerProtocols[normalized]) return coreBiomarkerProtocols[normalized]
  if (normalized === "Vitamin D" || normalized === "25-OH Vitamin D") return coreBiomarkerProtocols["25-OH Vitamin D"] ?? null
  if (normalized === "Glucose") return coreBiomarkerProtocols["Fasting Glucose"] ?? null
  return coreBiomarkerProtocols[normalized] ?? null
}
