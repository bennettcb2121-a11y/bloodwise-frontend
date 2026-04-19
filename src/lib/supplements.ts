import type { VitaminDBand } from "@/src/lib/dosingTargets"
import {
  filterVitaminDCatalog,
  pickVitaminDProductByTarget,
  resolveVitaminDBand,
  targetVitaminDIuPerDay,
  vitaminDRecommendationDisplayName,
} from "@/src/lib/dosingTargets"
import type { SupplementAdaptiveMeta } from "@/src/lib/adaptiveSupplementEngine"
import {
  buildAdaptiveContextFromProfile,
  getAdaptiveRationale,
  pickAdaptiveBestProduct,
  type AdaptiveSupplementContext,
  type ProfileAdaptiveInput,
} from "@/src/lib/adaptiveSupplementEngine"

type ActiveUnit = "mg" | "mcg" | "IU"

export type SupplementProduct = {
  id: string
  brand: string
  productName: string
  form: string
  price: number
  unitsPerBottle: number
  amountPerUnit: number
  activeUnit: ActiveUnit
  costPerUnitActive: number
  costPer1000IU?: number
  /** Servings per week (default 7 = once daily). Use 1 for weekly-dose products. */
  servingsPerWeek?: number
  notes?: string
  assumptions?: string[]
  /** Safety cautions surfaced with the product (overdose, bleeding, etc.). */
  caution?: string[]
  /**
   * Short pregnancy/lactation note rendered with the recommendation.
   * Conservative default: "Discuss with your clinician if pregnant, trying to conceive, or breastfeeding."
   */
  pregnancyCaveat?: string
  /** Nutrient/drug interactions the user should know about (plain English). */
  interactions?: string[]
  /**
   * True when the SKU's label dose meets or exceeds an adult Tolerable Upper Intake Level
   * (NIH Office of Dietary Supplements / IOM Food & Nutrition Board). Used to gate defaults
   * and surface "clinician-directed only" messaging in the UI.
   */
  exceedsAdultUL?: boolean
  url?: string
  /** Ranking hints for adaptive engine (budget vs quality vs diet). */
  adaptive?: SupplementAdaptiveMeta
}

type AnalysisItem = {
  name?: string
  marker?: string
  status?: string
  /** Numeric lab value when analysis comes from analyzeBiomarkers (e.g. ng/mL for Vitamin D). */
  value?: number
}

type SupplementLeaderboardEntry = SupplementProduct & {
  rankByValue: number
  rankByPotency: number
}

export type RecommendationType = "Core" | "Conditional" | "Context-dependent"

export type MonthlyCostBreakdown = {
  bottlePrice: number
  unitsPerBottle: number
  unitsPerDay: number
  pricePerServing: number
  daysPerMonth: number
  monthlyCost: number
}

export type SupplementRecommendation = {
  name: string
  brand: string
  marker: string
  supplementKey: string
  dose: string
  status?: string
  recommendationType: RecommendationType
  whyRecommended: string
  whyThisIsRecommended: string
  expectedBenefit: string
  dosingGuidance: string
  bestValue: SupplementLeaderboardEntry
  highestPotency: SupplementLeaderboardEntry
  bestOverall: SupplementLeaderboardEntry
  leaderboard: SupplementLeaderboardEntry[]
  estimatedMonthlyCost: number
  monthlyCostBreakdown: MonthlyCostBreakdown
  /** Shown when user prefers no pills but only pill form was available. */
  formNote?: string
  /** Why this SKU was chosen for this user (budget/diet/shopping intent). */
  adaptiveRationale?: string
  /** Optional stack UI: maintenance when labs are “fine” but training context suggests monitoring. */
  stackHint?: "maintenance"
}

/** True for gummy, powder, liquid, drink (case-insensitive). */
function isNonPillForm(form: string): boolean {
  const f = (form || "").toLowerCase()
  return f.includes("gummy") || f.includes("powder") || f.includes("liquid") || f.includes("drink")
}

/**
 * Shared caveats reused across SKUs for consistency. Wording is conservative and aligns
 * with NIH ODS Health Professional fact sheets, IOM DRI upper-intake summaries, and
 * standard OTC label warnings. This is education/decision-support, not medical advice.
 */
const PREGNANCY_GENERIC =
  "If pregnant, trying to conceive, or breastfeeding, do not start this supplement without talking to your clinician."
const PREGNANCY_HIGHER_SUPERVISION =
  "Doses above standard prenatal amounts should only be taken under clinician supervision during pregnancy or lactation."

const supplementDatabase: Record<string, SupplementProduct[]> = {
  Ferritin: [
    {
      id: "iron_sv_65_200",
      brand: "Spring Valley",
      productName: "Iron Tablets 65 mg, 200 count",
      form: "Tablet",
      price: 4.74,
      unitsPerBottle: 200,
      amountPerUnit: 65,
      activeUnit: "mg",
      costPerUnitActive: 0.000365,
      notes:
        "Widely available OTC ferrous sulfate equivalent; 65 mg of elemental iron per tablet. Lowest cost per mg in the curated set.",
      caution: [
        "65 mg elemental iron per tablet is above the 45 mg/day adult Tolerable Upper Intake Level (NIH ODS / IOM). Only appropriate when a clinician has confirmed iron deficiency.",
        "Iron overdose can be fatal, especially in children — keep out of reach and store in the original child-resistant packaging.",
        "Emerging evidence (Stoffel 2017; Moretti 2015) suggests alternate-day dosing may absorb as well or better than daily dosing and is usually better tolerated.",
      ],
      interactions: [
        "Take apart from calcium, dairy, coffee/tea, antacids, and high-dose zinc — all reduce iron absorption.",
        "Separate by ≥4 hours from levothyroxine, fluoroquinolone and tetracycline antibiotics, bisphosphonates, and carbidopa/levodopa.",
        "Proton-pump inhibitors (e.g. omeprazole) and H2 blockers can reduce iron absorption.",
      ],
      pregnancyCaveat:
        "Iron needs rise in pregnancy (RDA 27 mg/day). Do not exceed what your prenatal + clinician advises; 65 mg tablets are a repletion dose, not a prenatal dose.",
      exceedsAdultUL: true,
      adaptive: { qualityTier: 1, priceTier: "budget", veganFriendly: true },
    },
    {
      id: "iron_nm_65_150",
      brand: "Nature Made",
      productName: "Iron 65 mg, 150 count",
      form: "Tablet",
      price: 5.88,
      unitsPerBottle: 150,
      amountPerUnit: 65,
      activeUnit: "mg",
      costPerUnitActive: 0.000603,
      notes:
        "Standard OTC ferrous sulfate 325 mg tablet (65 mg elemental iron). USP-verified brand.",
      caution: [
        "65 mg elemental iron per tablet is above the 45 mg/day adult Tolerable Upper Intake Level (NIH ODS / IOM). Only appropriate when a clinician has confirmed iron deficiency.",
        "Iron overdose can be fatal, especially in children — keep out of reach.",
      ],
      interactions: [
        "Take apart from calcium, dairy, coffee/tea, antacids, and high-dose zinc.",
        "Separate by ≥4 hours from levothyroxine, fluoroquinolone and tetracycline antibiotics, bisphosphonates, and carbidopa/levodopa.",
        "Proton-pump inhibitors and H2 blockers can reduce absorption.",
      ],
      pregnancyCaveat:
        "Iron needs rise in pregnancy (RDA 27 mg/day). Do not exceed what your prenatal + clinician advises; 65 mg tablets are a repletion dose, not a prenatal dose.",
      exceedsAdultUL: true,
      adaptive: { qualityTier: 2, priceTier: "mid", veganFriendly: true },
    },
  ],

  /** Standalone vitamin C for absorption pairing when iron is recommended (not in biomarker analysis loop). */
  VitaminC: [
    {
      id: "vitc_nm_500_100",
      brand: "Nature Made",
      productName: "Vitamin C 500 mg, 100 tablets",
      form: "Tablet",
      price: 8.99,
      unitsPerBottle: 100,
      amountPerUnit: 500,
      activeUnit: "mg",
      costPerUnitActive: 8.99 / (500 * 100),
      notes:
        "Paired with iron to support non-heme iron absorption; a glass of orange juice or citrus with the meal works similarly.",
      caution: [
        "Adult UL for vitamin C is 2,000 mg/day (NIH ODS). Doses well above this can cause GI upset and increase kidney-stone risk in susceptible people.",
        "People with hereditary hemochromatosis or iron-overload disorders should not take vitamin C with iron without clinician guidance — it increases iron absorption.",
      ],
      interactions: [
        "High-dose vitamin C can interfere with some chemotherapy, blood glucose and stool occult-blood tests.",
      ],
      pregnancyCaveat: PREGNANCY_GENERIC,
      adaptive: { qualityTier: 2, priceTier: "mid", veganFriendly: true },
    },
  ],

  "Vitamin D": [
    {
      id: "vitd_gummy_2000_60",
      brand: "Nature Made",
      productName: "Vitamin D3 2000 IU Gummies, 60 count",
      form: "Gummy",
      price: 9.99,
      unitsPerBottle: 60,
      amountPerUnit: 2000,
      activeUnit: "IU",
      costPerUnitActive: 9.99 / (2000 * 60),
      costPer1000IU: 0.08325,
      notes: "2,000 IU (50 mcg) per gummy — within the 4,000 IU/day adult UL.",
      caution: [
        "Gummies contain added sugar; not suitable as a repletion dose if your clinician has recommended higher short-term doses.",
      ],
      interactions: [
        "Vitamin D can increase calcium absorption; caution with thiazide diuretics, calcium supplements, and in people with a history of hypercalcemia or kidney stones.",
      ],
      pregnancyCaveat: PREGNANCY_GENERIC,
      adaptive: { qualityTier: 2, priceTier: "mid", veganFriendly: true },
    },
    {
      id: "vitd_celebrate_25000_90",
      brand: "Celebrate Vitamins",
      productName: "Vitamin D3 25,000 IU, 90 capsules (once-weekly)",
      form: "Capsule",
      price: 21.99,
      unitsPerBottle: 90,
      amountPerUnit: 25000,
      activeUnit: "IU",
      costPerUnitActive: 21.99 / (25000 * 90),
      costPer1000IU: 0.00977,
      servingsPerWeek: 1,
      notes:
        "Labeled 1 capsule once weekly (~3,571 IU/day averaged), intended for short-term repletion under clinician care.",
      caution: [
        "DO NOT take daily. A single 25,000 IU capsule is over 6× the 4,000 IU/day adult UL on a daily basis.",
        "Use only for clinician-directed repletion when 25-hydroxy vitamin D is deficient; retest in 8–12 weeks.",
      ],
      interactions: [
        "Can raise serum calcium; caution with thiazide diuretics, calcium supplements, digoxin, and in people with sarcoidosis, granulomatous disease, or kidney stones.",
      ],
      pregnancyCaveat: PREGNANCY_HIGHER_SUPERVISION,
      exceedsAdultUL: true,
      adaptive: { qualityTier: 2, priceTier: "mid", veganFriendly: true },
    },
  ],

  Magnesium: [
    {
      id: "mag_sv_400_250",
      brand: "Spring Valley",
      productName: "Magnesium Oxide 400 mg, 250 tablets",
      form: "Tablet",
      price: 10.88,
      unitsPerBottle: 250,
      amountPerUnit: 400,
      activeUnit: "mg",
      costPerUnitActive: 0.000109,
      notes:
        "400 mg label dose is just above the 350 mg/day UL for supplemental magnesium (NIH ODS). Magnesium oxide has relatively low bioavailability, so consider splitting the tablet or choosing a lower-potency glycinate/citrate product if available.",
      caution: [
        "Adult UL for supplemental magnesium is 350 mg/day (NIH ODS). This product is slightly above the UL.",
        "Taking more than the UL from supplements can cause diarrhea, cramping, and nausea; higher overdoses are a medical emergency.",
        "People with kidney disease or on dialysis should not take magnesium supplements without clinician guidance.",
      ],
      interactions: [
        "Separate by ≥2 hours from tetracycline, fluoroquinolone, and bisphosphonate medications.",
        "Can interact with some blood-pressure medications and muscle relaxants.",
      ],
      pregnancyCaveat: PREGNANCY_GENERIC,
      exceedsAdultUL: true,
      adaptive: { qualityTier: 1, priceTier: "budget", veganFriendly: true },
    },
  ],

  "Vitamin B12": [
    {
      id: "b12_sv_5000_300",
      brand: "Spring Valley",
      productName: "Vitamin B12 5,000 mcg, 300 tablets",
      form: "Fast dissolve tablet",
      price: 19.94,
      unitsPerBottle: 300,
      amountPerUnit: 5000,
      activeUnit: "mcg",
      costPerUnitActive: 0.0133 / 1000,
      notes:
        "No UL established for vitamin B12 (NIH ODS). The RDA is 2.4 mcg/day; high-dose sublinguals are widely used when oral absorption is reduced.",
      caution: [
        "If you have a history of leukocytosis, polycythemia vera, or are under investigation for blood-cell abnormalities, discuss B12 supplementation with your clinician before starting.",
      ],
      interactions: [
        "Metformin, proton-pump inhibitors, and H2 blockers reduce B12 absorption — supplementation is often appropriate but should be monitored.",
      ],
      pregnancyCaveat: PREGNANCY_GENERIC,
      adaptive: { qualityTier: 1, priceTier: "budget", veganFriendly: true },
    },
    {
      id: "b12_vitamatic_10000_60",
      brand: "Vitamatic",
      productName: "Methyl B12 10,000 mcg, 60 lozenges",
      form: "Lozenge",
      price: 9.99,
      unitsPerBottle: 60,
      amountPerUnit: 10000,
      activeUnit: "mcg",
      costPerUnitActive: 0.0167 / 1000,
      notes: "Methylcobalamin form; no UL established for B12.",
      caution: [
        "High-dose B12 can briefly turn urine bright yellow — harmless but a good sign the dose is absorbing.",
      ],
      interactions: [
        "Metformin, PPIs, and H2 blockers reduce B12 absorption.",
      ],
      pregnancyCaveat: PREGNANCY_GENERIC,
      adaptive: { qualityTier: 2, priceTier: "mid", veganFriendly: true },
    },
    {
      id: "b12_now_10000_60",
      brand: "NOW Foods",
      productName: "Methyl B-12 10,000 mcg, 60 lozenges",
      form: "Lozenge",
      price: 18.99,
      unitsPerBottle: 60,
      amountPerUnit: 10000,
      activeUnit: "mcg",
      costPerUnitActive: 0.0317 / 1000,
      notes: "Methylcobalamin lozenge; no UL established for B12.",
      interactions: [
        "Metformin, PPIs, and H2 blockers reduce B12 absorption.",
      ],
      pregnancyCaveat: PREGNANCY_GENERIC,
      adaptive: { qualityTier: 2, priceTier: "mid", veganFriendly: true },
    },
  ],

  CRP: [
    {
      id: "omega3_sr_1250_60",
      brand: "Sports Research",
      productName: "Omega-3 Fish Oil Triple Strength 1250 mg, 60 softgels",
      form: "Softgel",
      price: 22.97,
      unitsPerBottle: 60,
      amountPerUnit: 1250,
      activeUnit: "mg",
      costPerUnitActive: 0.000306,
      notes:
        "Within FDA GRAS guidance of ≤3 g/day combined EPA+DHA for adults. EPA/DHA split is not captured in the source dataset.",
      assumptions: ["Cost per mg assumes 1,250 mg per softgel."],
      caution: [
        "Fish oil can slightly prolong bleeding time — stop 7–10 days before planned surgery unless advised otherwise.",
        "Some users report fishy reflux; taking with food or freezing the softgels can help.",
      ],
      interactions: [
        "Can increase bleeding risk with anticoagulants (warfarin, DOACs), antiplatelets (aspirin, clopidogrel), and high-dose vitamin E.",
      ],
      pregnancyCaveat:
        "Generally considered safe in pregnancy when sourced from low-mercury fish oil; confirm your product is third-party tested and discuss dose with your clinician.",
      adaptive: { qualityTier: 3, priceTier: "premium", animalGelatin: true },
    },
    {
      id: "curcumin_tn_1500_270",
      brand: "TNVitamins",
      productName: "Turmeric/Curcumin with Black Pepper 1500 mg, 270 capsules",
      form: "Capsule",
      price: 17.49,
      unitsPerBottle: 270,
      amountPerUnit: 1500,
      activeUnit: "mg",
      costPerUnitActive: 0.0000432,
      notes:
        "Label 1,500 mg likely reflects turmeric root powder + curcuminoid extract per serving. EFSA ADI for curcumin is ~3 mg/kg body-weight/day.",
      assumptions: ["Assumes 1,500 mg per capsule; verify label before hard claims in UI."],
      caution: [
        "Post-marketing reports (Italy, Australia, US 2019–2024) link high-dose curcumin to rare but serious liver injury, especially with piperine-enhanced formulations. Stop and contact a clinician if you notice dark urine, jaundice, or right-upper-quadrant pain.",
        "Can cause GI upset at higher doses.",
      ],
      interactions: [
        "May increase bleeding risk with anticoagulants and antiplatelets.",
        "Piperine (black pepper extract) increases absorption of many medications — discuss with your clinician or pharmacist.",
        "Can lower blood glucose; monitor if you take diabetes medications.",
      ],
      pregnancyCaveat:
        "Culinary amounts are fine, but concentrated curcumin supplements are not recommended in pregnancy or breastfeeding due to limited safety data.",
      adaptive: { qualityTier: 1, priceTier: "budget", veganFriendly: true },
    },
    {
      id: "mag_sv_400_250_crp",
      brand: "Spring Valley",
      productName: "Magnesium Oxide 400 mg, 250 tablets",
      form: "Tablet",
      price: 10.88,
      unitsPerBottle: 250,
      amountPerUnit: 400,
      activeUnit: "mg",
      costPerUnitActive: 0.000109,
      notes:
        "Included because magnesium status is sometimes observationally linked to inflammatory markers. 400 mg label dose is just above the 350 mg/day supplemental UL (NIH ODS).",
      caution: [
        "Adult UL for supplemental magnesium is 350 mg/day (NIH ODS). This product is slightly above the UL.",
        "People with kidney disease or on dialysis should not take magnesium supplements without clinician guidance.",
      ],
      interactions: [
        "Separate by ≥2 hours from tetracycline, fluoroquinolone, and bisphosphonate medications.",
      ],
      pregnancyCaveat: PREGNANCY_GENERIC,
      exceedsAdultUL: true,
      adaptive: { qualityTier: 1, priceTier: "budget", veganFriendly: true },
    },
  ],

  Testosterone: [
    {
      id: "ash_flora_300_120",
      brand: "Flora Health",
      productName: "KSM-66 Ashwagandha Root Extract 300 mg, 120 capsules",
      form: "Capsule",
      price: 26.68,
      unitsPerBottle: 120,
      amountPerUnit: 300,
      activeUnit: "mg",
      costPerUnitActive: 0.000741,
      notes:
        "KSM-66 is a standardized root extract typically studied at 300–600 mg/day for 8–12 weeks. Not a hormone; evidence for testosterone effects is limited and mixed.",
      caution: [
        "Post-marketing signals (Iceland 2020; UK MHRA/FSA 2023–2024; multiple case reports) link ashwagandha to rare but serious liver injury and thyrotoxicosis. Stop and contact a clinician if you notice jaundice, dark urine, tremor, or unexplained weight loss.",
        "Can lower blood pressure and blood glucose; can cause sedation.",
        "Avoid with autoimmune thyroid disease or hyperthyroidism without clinician guidance.",
      ],
      interactions: [
        "Thyroid hormone: ashwagandha can raise T3/T4 — people on levothyroxine should only use it under clinician supervision.",
        "Immunosuppressants: may reduce effectiveness.",
        "Sedatives, benzodiazepines, alcohol: additive sedation.",
        "Antidiabetic and antihypertensive medications: may potentiate effects.",
      ],
      pregnancyCaveat:
        "Do not use during pregnancy, while trying to conceive, or while breastfeeding. Multiple regulatory bodies (Merck Manual, Danish/Swedish/Finnish food safety authorities) advise avoidance; evidence is mixed and we stay conservative here.",
      adaptive: { qualityTier: 3, priceTier: "premium", veganFriendly: true },
    },
    {
      id: "boron_now_3_250",
      brand: "NOW Foods",
      productName: "Boron 3 mg, 250 capsules",
      form: "Capsule",
      price: 11.6,
      unitsPerBottle: 250,
      amountPerUnit: 3,
      activeUnit: "mg",
      costPerUnitActive: 0.0155,
      notes:
        "3 mg/capsule. Trials exploring hormonal effects have used ~6 mg/day (2 capsules). Well below the 20 mg/day adult UL (NIH ODS).",
      caution: [
        "Evidence for testosterone or sex-hormone effects is preliminary; do not rely on boron as a hormone therapy.",
      ],
      interactions: [
        "May interact with hormone therapies; discuss with a clinician if you take estrogen, testosterone, or thyroid medications.",
      ],
      pregnancyCaveat:
        "Supplemental boron is not recommended in pregnancy or breastfeeding; dietary boron is fine.",
      adaptive: { qualityTier: 2, priceTier: "mid", veganFriendly: true },
    },
  ],
}

const biomarkerAliasMap: Record<string, string> = {
  ferritin: "Ferritin",
  vitamind: "Vitamin D",
  vitd: "Vitamin D",
  "25ohvitamind": "Vitamin D",
  magnesium: "Magnesium",
  mgblood: "Magnesium",
  vitaminb12: "Vitamin B12",
  b12: "Vitamin B12",
  cobalamin: "Vitamin B12",
  crp: "CRP",
  hscrp: "CRP",
  creactiveprotein: "CRP",
  "hs-crp": "CRP",
  testosterone: "Testosterone",
  freetestosterone: "Testosterone",
  totaltestosterone: "Testosterone",
  "total testosterone": "Testosterone",
  serumiron: "Ferritin",
  tibc: "Ferritin",
  transferrinsaturation: "Ferritin",
  "transferrin saturation": "Ferritin",
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, "").replace(/_/g, "").replace(/-/g, "")
}

function isFlaggedStatus(status?: string) {
  if (!status) return false

  const normalized = status.toLowerCase()

  return (
    normalized === "low" ||
    normalized === "high" ||
    normalized === "deficient" ||
    normalized === "suboptimal"
  )
}

/** Only recommend iron when ferritin is deficient or suboptimal. Suppress when high or optimal. */
function shouldRecommendIronForFerritin(status?: string): boolean {
  if (!status) return false
  const s = status.toLowerCase()
  return s === "deficient" || s === "suboptimal"
}

/** Do not recommend *more* of a vitamin/mineral when the lab is already above target (safety). */
export function shouldSkipSupplementForHighMarker(matchedKey: string, status?: string): boolean {
  const s = (status || "").toLowerCase()
  if (s !== "high") return false
  // Oral repletion not appropriate when level is high — clinician should advise (same rule as vitamin D).
  return (
    matchedKey === "Vitamin B12" ||
    matchedKey === "Magnesium" ||
    matchedKey === "Folate" ||
    matchedKey === "Vitamin D" ||
    matchedKey === "Ferritin"
  )
}

function isEnduranceAthleteProfile(profile?: ProfileAdaptiveInput | null): boolean {
  if (!profile) return false
  const s = (profile.sport ?? "").toLowerCase()
  const pt = (profile.profile_type ?? "").toLowerCase()
  const hg = (profile.health_goals ?? "").toLowerCase()
  const al = (profile.activity_level ?? "").toLowerCase()
  if (
    s.includes("endurance") ||
    s.includes("run") ||
    s.includes("cycl") ||
    s.includes("triathlon") ||
    s.includes("tri ") ||
    s.includes("swim") ||
    s.includes("row")
  ) {
    return true
  }
  if (
    pt.includes("endurance") ||
    pt.includes("mixed_sport") ||
    pt.includes("female_athlete") ||
    pt.includes("high_volume")
  ) {
    return true
  }
  if (
    al.includes("very_active") &&
    (hg.includes("improve_fitness") || hg.includes("more_energy") || hg.includes("improve_recovery"))
  ) {
    return true
  }
  return false
}

/** True if Magnesium is its own flagged marker (avoid duplicating magnesium in CRP picks). */
function magnesiumMarkerFlaggedInAnalysis(analysis: AnalysisItem[]): boolean {
  for (const item of analysis) {
    const biomarkerName = item?.name || item?.marker
    const status = item?.status
    if (!biomarkerName || !isFlaggedStatus(status)) continue
    if (resolveMarkerKey(biomarkerName) === "Magnesium") return true
  }
  return false
}

function resolveMarkerKey(text?: string) {
  if (!text) return null

  const normalized = normalize(text)

  if (biomarkerAliasMap[normalized]) return biomarkerAliasMap[normalized]

  const exactKey = Object.keys(supplementDatabase).find(
    (key) => normalize(key) === normalized
  )

  return exactKey || null
}

function sortByValue(products: SupplementProduct[]) {
  return [...products].sort((a, b) => a.costPerUnitActive - b.costPerUnitActive)
}

function sortByPotency(products: SupplementProduct[]) {
  return [...products].sort((a, b) => b.amountPerUnit - a.amountPerUnit)
}

function buildLeaderboard(products: SupplementProduct[]): SupplementLeaderboardEntry[] {
  const byValue = sortByValue(products)
  const byPotency = sortByPotency(products)

  return byValue.map((product, index) => ({
    ...product,
    rankByValue: index + 1,
    rankByPotency: byPotency.findIndex((p) => p.id === product.id) + 1,
  }))
}

/** Effective daily servings from optional servingsPerWeek (default 7 = once daily). */
function servingsPerDayFromProduct(product: SupplementProduct): number {
  const perWeek = product.servingsPerWeek ?? 7
  return perWeek / 7
}

function estimateMonthlyCost(product: SupplementProduct) {
  const unitsPerDay = servingsPerDayFromProduct(product)
  return Number((((product.price / product.unitsPerBottle) * 30) * unitsPerDay).toFixed(2))
}

const DAYS_PER_MONTH = 30

function getMonthlyCostBreakdown(product: SupplementProduct): MonthlyCostBreakdown {
  const unitsPerDay = servingsPerDayFromProduct(product)
  const pricePerServing = product.price / product.unitsPerBottle
  const servingsPerMonth = unitsPerDay * DAYS_PER_MONTH
  const monthlyCost = Number((pricePerServing * servingsPerMonth).toFixed(2))
  return {
    bottlePrice: product.price,
    unitsPerBottle: product.unitsPerBottle,
    unitsPerDay,
    pricePerServing: Number(pricePerServing.toFixed(4)),
    daysPerMonth: DAYS_PER_MONTH,
    monthlyCost,
  }
}

function getRecommendationType(
  marker: string,
  status?: string
): RecommendationType {
  const m = normalize(marker)
  const s = (status || "").toLowerCase()

  if (m === "crp" || m === "testosterone" || s === "high") {
    return "Context-dependent"
  }
  if (s === "deficient") {
    return "Core"
  }
  if (s === "suboptimal" || s === "low") {
    return "Conditional"
  }
  return "Context-dependent"
}

function getWhyRecommendedShort(
  marker: string,
  status?: string,
  recType: RecommendationType = "Context-dependent"
): string {
  const m = normalize(marker)
  const s = (status || "").toLowerCase()

  if (m.includes("ferritin")) {
    if (recType === "Core") return "Ferritin is low; under clinician guidance, iron supplementation is commonly used to help support iron stores."
    if (recType === "Conditional") return "Ferritin is borderline; your clinician may consider a trial of iron with a follow-up test."
    return "Ferritin in context; consider iron only if your clinician confirms deficiency or sub-optimal stores."
  }
  if (m.includes("vitamind") || m.includes("vitd")) {
    if (recType === "Core") return "Vitamin D is low; supplementation is commonly used to help support normal vitamin D status, which is associated with bone, immune, and recovery health."
    if (recType === "Conditional") return "Vitamin D is below typical optimal ranges; supplementation may help support normal status."
    return "Vitamin D in context; dose depends on your current level and goals."
  }
  if (m.includes("magnesium")) {
    if (recType === "Core") return "Magnesium is low; supplementation may help support normal magnesium status, which is associated with muscle and nervous-system function."
    if (recType === "Conditional") return "Magnesium is borderline; consider diet first and discuss supplementation with your clinician."
    return "Magnesium in context; associated with muscle and nervous-system support when dietary intake is low."
  }
  if (m.includes("b12") || m.includes("cobalamin")) {
    if (recType === "Core") return "B12 is low; supplementation may help support normal B12 status, which is associated with red blood cell and energy metabolism."
    if (recType === "Conditional") return "B12 is borderline; supplementation may help, and absorption (e.g. metformin, PPIs, pernicious anemia) is worth discussing with your clinician."
    return "B12 in context; may be useful when dietary intake or absorption is limited."
  }
  if (m.includes("crp")) {
    if (s === "high") {
      return "Elevated CRP can reflect acute illness, heavy training, or chronic inflammation — interpret with symptoms and context. Supplements do not replace finding the cause."
    }
    return "CRP reflects inflammation; support is context-dependent (stress, recovery, diet)."
  }
  if (m.includes("testosterone")) {
    return "Testosterone support is context-dependent; discuss with a clinician before using any supplement in this category."
  }
  return "Flagged for discussion based on your results and profile."
}

function getExpectedBenefit(
  marker: string,
  status?: string,
  recType: RecommendationType = "Context-dependent"
): string {
  const m = normalize(marker)
  const s = (status || "").toLowerCase()
  if (m.includes("ferritin")) {
    if (recType === "Core") return "When clinician-directed for confirmed iron deficiency, iron supplementation may help support normal iron stores and is associated with normal energy, endurance, and recovery."
    if (recType === "Conditional") return "May help support ferritin toward typical optimal ranges; retest to confirm the response."
    return "Only appropriate when ferritin is low; may help support iron stores and normal oxygen-carrying capacity when deficient or sub-optimal."
  }
  if (m.includes("vitamind") || m.includes("vitd")) {
    if (recType === "Core") return "May help raise vitamin D levels and is associated with bone, immune, and recovery health."
    if (recType === "Conditional") return "May help reach typical optimal vitamin D ranges and support immune and recovery function."
    return "Associated with supporting vitamin D status; related to bone, immune, and recovery health."
  }
  if (m.includes("magnesium")) {
    if (recType === "Core") return "May help support normal magnesium status; associated with muscle function, sleep, and recovery."
    if (recType === "Conditional") return "May help support muscle and nervous-system function and recovery when dietary intake is insufficient."
    return "Associated with muscle function, relaxation, and recovery when dietary magnesium is low."
  }
  if (m.includes("b12") || m.includes("cobalamin")) {
    if (recType === "Core") return "May help support normal B12 status, which is associated with red blood cell production, energy metabolism, and neurological function."
    if (recType === "Conditional") return "May help support B12 status; if levels stay low, ask your clinician about absorption (metformin, PPIs, autoimmune causes)."
    return "Associated with supporting B12 status when dietary intake or absorption is limited."
  }
  if (m.includes("crp")) {
    if (s === "high") {
      return "Omega-3 and similar supports are sometimes used alongside lifestyle change; benefits vary and acute causes (e.g. infection) need different action — discuss with your clinician."
    }
    return "Anti-inflammatory and recovery support are context-dependent; may help support a healthy inflammatory response and recovery."
  }
  if (m.includes("testosterone")) {
    return "Evidence for hormonal effects from OTC supplements is mixed; discuss any supplement in this category with a clinician before use."
  }
  return "May help support the related biomarker and overall health when used appropriately to your context."
}

function getDosingGuidance(
  marker: string,
  status?: string,
  recType: RecommendationType = "Context-dependent"
): string {
  const m = normalize(marker)
  if (m.includes("ferritin")) {
    if (recType === "Core") return "Dose and form (e.g. ferrous sulfate vs ferrous bisglycinate) should match severity and tolerance and be clinician-directed. Recent evidence (Stoffel 2017; Moretti 2015) suggests alternate-day dosing absorbs as well or better than daily dosing and is usually better tolerated. Take apart from calcium, dairy, coffee/tea, and separate ≥4 hours from levothyroxine and tetracycline/fluoroquinolone antibiotics. Retest in 8–10 weeks."
    if (recType === "Conditional") return "If your clinician agrees, a moderate elemental-iron dose (often 30–60 mg on alternate days) with food is a typical starting point. Retest in 8–10 weeks to avoid over-correction."
    return "Only dose when ferritin is deficient or sub-optimal; follow a clinician-directed protocol and retest."
  }
  if (m.includes("vitamind") || m.includes("vitd")) {
    if (recType === "Core") return "The adult Tolerable Upper Intake Level is 4,000 IU (100 mcg)/day (IOM 2010 / NIH ODS). Short-term higher-dose repletion is a clinician decision; consumer maintenance is typically 1,000–2,000 IU/day. Retest in 8–12 weeks."
    if (recType === "Conditional") return "Typical maintenance range is 1,000–2,000 IU/day (well under the 4,000 IU/day UL). Retest in 8–12 weeks."
    return "Dose depends on your current blood level; 1,000–2,000 IU/day is typical for maintenance, and the adult UL is 4,000 IU/day."
  }
  if (m.includes("magnesium")) {
    return "Typical range is 200–350 mg/day of elemental magnesium (e.g. glycinate or citrate), with food. The adult UL for supplemental magnesium is 350 mg/day (NIH ODS); higher amounts should be clinician-directed. Split doses if needed. Retest in 6–8 weeks if tracking status."
  }
  if (m.includes("b12") || m.includes("cobalamin")) {
    if (recType === "Core") return "B12 has no established UL. Repletion may use higher-dose sublingual or injectable forms; maintenance is typically 500–1,000 mcg/day or several times per week. Retest in 8–12 weeks."
    return "Typical maintenance is 500–1,000 mcg/day or several times per week. Form (cyanocobalamin vs methylcobalamin) can depend on preference and absorption."
  }
  if (m.includes("crp")) {
    return "No supplement replaces addressing root causes (sleep, stress, training load, diet, underlying inflammation). Omega-3 and similar supports are context-dependent and should be discussed with your clinician, especially if you take anticoagulants."
  }
  if (m.includes("testosterone")) {
    return "Do not self-dose testosterone, pro-hormones, or SARMs. Any adaptogen or micronutrient support in this category should be discussed with a clinician, especially if you take thyroid, antidepressant, sedative, or blood-pressure medications."
  }
  return "Follow the product label and your clinician's guidance; retest on the schedule suggested for this marker."
}

function pickBestOverall(leaderboard: SupplementLeaderboardEntry[]): SupplementLeaderboardEntry {
  if (leaderboard.length === 0) throw new Error("Empty leaderboard")
  return [...leaderboard].sort(
    (a, b) => a.rankByValue + a.rankByPotency - (b.rankByValue + b.rankByPotency)
  )[0]
}

function inferDoseText(marker: string, vitaminDBand?: VitaminDBand) {
  switch (marker) {
    case "Ferritin":
      return "Clinician-directed iron protocol (alternate-day dosing often preferred)"
    case "Vitamin D": {
      const t = vitaminDBand ? targetVitaminDIuPerDay(vitaminDBand) : 2000
      if (vitaminDBand === "high") return "Level is already elevated — do not supplement unless your clinician advises"
      return `Typical discussion range ~${t} IU/day with food (adult UL 4,000 IU/day); confirm with your clinician`
    }
    case "Magnesium":
      return "200–350 mg/day elemental, with food (adult supplemental UL 350 mg/day)"
    case "Vitamin B12":
      return "500–1,000 mcg/day or several times weekly; no established UL"
    case "CRP":
      return "Context-dependent; address root causes first"
    case "Testosterone":
      return "Context-dependent; clinician conversation before any OTC support"
    default:
      return "1 serving daily"
  }
}

export type SupplementRecommendationsOptions = {
  supplementFormPreference?: "any" | "no_pills"
  /** When set, adaptive ranking uses these profile fields (shopping, diet, form). */
  profile?: ProfileAdaptiveInput | null
  /** Override automatic context from profile (e.g. tests). */
  adaptiveContext?: AdaptiveSupplementContext | null
}

export function supplementRecommendations(
  analysis: AnalysisItem[] = [],
  options: SupplementRecommendationsOptions = {}
): SupplementRecommendation[] {
  if (!Array.isArray(analysis)) return []
  const preferNoPills = options.supplementFormPreference === "no_pills"
  const adaptiveCtxMerged: AdaptiveSupplementContext | null = (() => {
    const raw = options.adaptiveContext ?? (options.profile ? buildAdaptiveContextFromProfile(options.profile) : null)
    if (!raw) return null
    return {
      ...raw,
      supplementFormPreference: preferNoPills ? "no_pills" : "any",
    }
  })()

  const recommendations: SupplementRecommendation[] = []
  const usedMarkers = new Set<string>()

  for (const item of analysis) {
    const biomarkerName = item?.name || item?.marker
    const status = item?.status

    if (!biomarkerName || !isFlaggedStatus(status)) continue

    const matchedKey = resolveMarkerKey(biomarkerName)
    if (!matchedKey) continue
    if (usedMarkers.has(matchedKey)) continue

    if (matchedKey === "Ferritin" && !shouldRecommendIronForFerritin(status)) continue

    /** High testosterone: do not suggest zinc/adaptogens as “fixes”—see your clinician. */
    if (matchedKey === "Testosterone" && (status || "").toLowerCase() === "high") continue

    /** High vitamin D / B12 / magnesium / folate: never recommend oral “more” here — clinician should advise. */
    if (shouldSkipSupplementForHighMarker(matchedKey, status)) continue

    let optionsList = supplementDatabase[matchedKey]
    if (!Array.isArray(optionsList) || optionsList.length === 0) continue

    if (matchedKey === "CRP" && magnesiumMarkerFlaggedInAnalysis(analysis)) {
      optionsList = optionsList.filter((o) => o.id !== "mag_sv_400_250_crp")
      if (optionsList.length === 0) continue
    }

    let vitDBand: VitaminDBand | undefined
    let vitDTargetIu = 2000
    let displayNameOverride: string | undefined

    if (matchedKey === "Vitamin D") {
      vitDBand = resolveVitaminDBand(status, item.value)
      vitDTargetIu = targetVitaminDIuPerDay(vitDBand)
      let vdList = filterVitaminDCatalog(optionsList, vitDBand)
      if (vdList.length === 0) {
        vdList = optionsList.filter((o) => o.id === "vitd_gummy_2000_60" || o.amountPerUnit <= 2000)
      }
      if (vdList.length === 0) vdList = optionsList.filter((o) => o.id !== "vitd_now_50000_50")
      optionsList = vdList as SupplementProduct[]
    }

    if (preferNoPills) {
      const nonPill = optionsList.filter((o) => isNonPillForm(o.form))
      if (nonPill.length > 0) optionsList = nonPill
    }

    if (matchedKey === "Vitamin D" && vitDBand) {
      const picked = pickVitaminDProductByTarget(optionsList, vitDTargetIu)
      if (picked) {
        displayNameOverride = vitaminDRecommendationDisplayName(picked, vitDTargetIu)
      }
    }

    const leaderboard = buildLeaderboard(optionsList)
    const bestValue = leaderboard[0]
    const highestPotency = [...leaderboard].sort(
      (a, b) => a.rankByPotency - b.rankByPotency
    )[0]
    let bestOverall = pickBestOverall(leaderboard)
    if (matchedKey === "Vitamin D" && vitDBand) {
      const picked = pickVitaminDProductByTarget(optionsList, vitDTargetIu)
      if (picked) {
        bestOverall = leaderboard.find((e) => e.id === picked.id) ?? bestOverall
      }
    } else if (adaptiveCtxMerged) {
      const adaptivePick = pickAdaptiveBestProduct(optionsList, adaptiveCtxMerged)
      if (adaptivePick) {
        const found = leaderboard.find((e) => e.id === adaptivePick.id)
        if (found) bestOverall = found
      }
    }
    const hadToUsePill = preferNoPills && !isNonPillForm(bestOverall.form)

    const recommendationType = getRecommendationType(matchedKey, status)
    let whyRecommended = getWhyRecommendedShort(matchedKey, status, recommendationType)
    let expectedBenefit = getExpectedBenefit(matchedKey, status, recommendationType)
    let dosingGuidance = getDosingGuidance(matchedKey, status, recommendationType)
    if (
      matchedKey === "Ferritin" &&
      (status || "").toLowerCase() === "suboptimal" &&
      isEnduranceAthleteProfile(options.profile)
    ) {
      whyRecommended =
        "Iron stores are slightly below your endurance performance target—a common pattern in heavy training. If you already take iron, continue your clinician’s plan and retest in 8–12 weeks."
      expectedBenefit =
        "Maintaining iron supports oxygen delivery and endurance; small gaps often respond to consistent intake and meal timing around training."
      dosingGuidance =
        "Do not add more iron on your own if your clinician hasn’t advised it. Retest ferritin in 8–12 weeks."
    }
    const estimatedMonthlyCost = estimateMonthlyCost(bestOverall)
    const monthlyCostBreakdown = getMonthlyCostBreakdown(bestOverall)
    const adaptiveRationale = adaptiveCtxMerged
      ? getAdaptiveRationale(adaptiveCtxMerged, bestOverall.productName, estimatedMonthlyCost)
      : undefined
    const whyThisIsRecommended = adaptiveRationale ? `${whyRecommended} ${adaptiveRationale}` : whyRecommended

    recommendations.push({
      name: displayNameOverride ?? bestOverall.productName,
      brand: bestOverall.brand,
      marker: matchedKey,
      supplementKey: normalize(matchedKey),
      dose: inferDoseText(matchedKey, matchedKey === "Vitamin D" ? vitDBand : undefined),
      status,
      recommendationType,
      whyRecommended,
      whyThisIsRecommended,
      expectedBenefit,
      dosingGuidance,
      bestValue,
      highestPotency,
      bestOverall,
      leaderboard,
      estimatedMonthlyCost,
      monthlyCostBreakdown,
      formNote: hadToUsePill ? "Pill form; gummy or powder options may be available in stores." : undefined,
      adaptiveRationale,
    })

    usedMarkers.add(matchedKey)
  }

  const withMaintenance = appendMaintenanceFerritinForEndurance(recommendations, analysis, options)
  return appendAbsorptionPairingRecommendations(withMaintenance)
}

/**
 * When ferritin is in-range but the profile is high-volume endurance, suggest optional iron as
 * maintenance/monitoring context (not repletion). Keeps the stack useful when all other markers are optimal.
 */
function appendMaintenanceFerritinForEndurance(
  recommendations: SupplementRecommendation[],
  analysis: AnalysisItem[],
  options: SupplementRecommendationsOptions
): SupplementRecommendation[] {
  if (recommendationHasIron(recommendations)) return recommendations
  const ferritinRow = analysis.find((a) => resolveMarkerKey(a.name || a.marker) === "Ferritin")
  if (!ferritinRow) return recommendations
  if ((ferritinRow.status || "").toLowerCase() !== "optimal") return recommendations
  const v = typeof ferritinRow.value === "number" ? ferritinRow.value : NaN
  if (!Number.isFinite(v) || v < 30 || v > 110) return recommendations
  if (!isEnduranceAthleteProfile(options.profile ?? null)) return recommendations

  const optionsList = supplementDatabase.Ferritin
  if (!Array.isArray(optionsList) || optionsList.length === 0) return recommendations

  const preferNoPills = options.supplementFormPreference === "no_pills"
  let list = optionsList
  if (preferNoPills) {
    const nonPill = list.filter((o) => isNonPillForm(o.form))
    if (nonPill.length > 0) list = nonPill
  }

  const leaderboard = buildLeaderboard(list)
  const bestOverall = pickBestOverall(leaderboard)
  const bestValue = leaderboard[0]
  const highestPotency = [...leaderboard].sort((a, b) => a.rankByPotency - b.rankByPotency)[0]
  const hadToUsePill = preferNoPills && !isNonPillForm(bestOverall.form)
  const estimatedMonthlyCost = estimateMonthlyCost(bestOverall)
  const monthlyCostBreakdown = getMonthlyCostBreakdown(bestOverall)

  const maintenance: SupplementRecommendation = {
    name: bestOverall.productName,
    brand: bestOverall.brand,
    marker: "Ferritin",
    supplementKey: "ferritin",
    dose: "Maintenance context — discuss with your clinician before starting or changing iron.",
    status: "optimal",
    recommendationType: "Context-dependent",
    whyRecommended:
      "Your ferritin is in range, but endurance training can still draw down iron stores over time. Some athletes keep a conservative maintenance plan with labs — not a repletion dose.",
    whyThisIsRecommended:
      "Clarion flags this as optional maintenance for high-volume endurance profiles when ferritin is mid-range optimal — prioritize food first, then retest on your schedule.",
    expectedBenefit:
      "Supporting iron status may help oxygen delivery and recovery when training load is high; only continue if it fits your clinician’s plan.",
    dosingGuidance:
      "Do not add iron without medical guidance if you are not deficient. If you already take iron, keep your existing plan and retest ferritin as advised.",
    bestValue,
    highestPotency,
    bestOverall,
    leaderboard,
    estimatedMonthlyCost,
    monthlyCostBreakdown,
    formNote: hadToUsePill ? "Pill form; gummy or powder options may be available in stores." : undefined,
    stackHint: "maintenance",
  }

  return [...recommendations, maintenance]
}

function recommendationHasIron(recs: SupplementRecommendation[]): boolean {
  return recs.some((r) => {
    const m = normalize(r.marker)
    return m === "ferritin" || r.supplementKey.includes("iron")
  })
}

function ironProductAlreadyIncludesVitaminC(recs: SupplementRecommendation[]): boolean {
  return recs.some((r) => {
    const pn = (r.bestOverall?.productName ?? "").toLowerCase()
    const notes = (r.bestOverall?.notes ?? "").toLowerCase()
    return r.bestOverall?.id === "iron_vitamatic_104_120" || pn.includes("vitamin c") || notes.includes("vitamin c")
  })
}

function recommendationHasVitaminC(recs: SupplementRecommendation[]): boolean {
  return recs.some((r) => {
    const m = normalize(r.marker)
    if (m.includes("vitaminc") || m === "vitaminc") return true
    const n = r.name.toLowerCase()
    return n.includes("vitamin c") || n.includes("ascorbic")
  })
}

/**
 * When iron is recommended, add vitamin C if missing (supports non-heme iron absorption).
 * Idempotent — safe to run on already-built recommendation lists.
 */
export function appendAbsorptionPairingRecommendations(recs: SupplementRecommendation[]): SupplementRecommendation[] {
  if (!recs.length) return recs
  if (!recommendationHasIron(recs) || recommendationHasVitaminC(recs) || ironProductAlreadyIncludesVitaminC(recs)) {
    return recs
  }
  const optionsList = supplementDatabase.VitaminC
  if (!Array.isArray(optionsList) || optionsList.length === 0) return recs

  const leaderboard = buildLeaderboard(optionsList)
  const bestOverall = pickBestOverall(leaderboard)
  const bestValue = leaderboard[0]
  const highestPotency = [...leaderboard].sort((a, b) => b.rankByPotency - a.rankByPotency)[0]
  const estimatedMonthlyCost = estimateMonthlyCost(bestOverall)
  const monthlyCostBreakdown = getMonthlyCostBreakdown(bestOverall)

  const pairing: SupplementRecommendation = {
    name: bestOverall.productName,
    brand: bestOverall.brand,
    marker: "Vitamin C",
    supplementKey: "vitamin_c",
    dose: "Typical pairing: 250–500 mg with iron, or vitamin C–rich food with the same meal.",
    status: undefined,
    recommendationType: "Core",
    whyRecommended: "Vitamin C can improve absorption of non-heme iron when taken together.",
    whyThisIsRecommended:
      "Clarion adds this when iron is on your plan so timing and pairing stay simple.",
    expectedBenefit: "May help you get more from your iron supplement when co-taken as directed.",
    dosingGuidance: "Take with iron or within the same meal window unless your clinician advises otherwise.",
    bestValue,
    highestPotency,
    bestOverall,
    leaderboard,
    estimatedMonthlyCost,
    monthlyCostBreakdown,
  }

  return [...recs, pairing]
}

export {
  supplementDatabase,
  buildLeaderboard,
  estimateMonthlyCost,
  resolveMarkerKey,
}
export type { SupplementAdaptiveMeta } from "@/src/lib/adaptiveSupplementEngine"