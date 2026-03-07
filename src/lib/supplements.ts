type ActiveUnit = "mg" | "mcg" | "IU"

type SupplementProduct = {
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
  notes?: string
  assumptions?: string[]
  caution?: string[]
  url?: string
}

type AnalysisItem = {
  name?: string
  marker?: string
  status?: string
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

type SupplementRecommendation = {
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
}

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
      notes: "Best cost per mg in the iron subset.",
      caution: [
        "Iron should only be recommended when appropriate to the biomarker context.",
        "Iron overdose is dangerous, especially for children.",
      ],
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
      notes: "Serving instructions not fully captured in source dataset.",
    },
    {
      id: "iron_cypress_150_100",
      brand: "Cypress Pharmaceutical",
      productName: "Poly Iron 150 mg Strength, 100 count",
      form: "Capsule",
      price: 18.84,
      unitsPerBottle: 100,
      amountPerUnit: 150,
      activeUnit: "mg",
      costPerUnitActive: 0.001256,
      notes: "Highest potency per capsule in the iron subset.",
    },
    {
      id: "iron_vitamatic_104_120",
      brand: "Vitamatic",
      productName: "Ferrous Fumarate 104 mg elemental iron, 120 tablets",
      form: "Tablet",
      price: 16.99,
      unitsPerBottle: 120,
      amountPerUnit: 104,
      activeUnit: "mg",
      costPerUnitActive: 0.00136,
      notes: "Includes vitamin C.",
      assumptions: ["Cost derived from listing dose and count."],
    },
  ],

  "Vitamin D": [
    {
      id: "vitd_now_50000_50",
      brand: "NOW Foods",
      productName: "Vitamin D-3 50,000 IU, 50 softgels",
      form: "Softgel",
      price: 13.95,
      unitsPerBottle: 50,
      amountPerUnit: 50000,
      activeUnit: "IU",
      costPerUnitActive: 13.95 / (50000 * 50),
      costPer1000IU: 0.00558,
      notes: "Ultra-high dose; verify intended dosing frequency.",
      caution: [
        "High-potency vitamin D can exceed common maintenance dosing.",
        "Use dosing frequency that matches the user’s actual dose target.",
      ],
    },
    {
      id: "vitd_now_10000_240",
      brand: "NOW Foods",
      productName: "Vitamin D-3 10,000 IU, 240 softgels",
      form: "Softgel",
      price: 15.73,
      unitsPerBottle: 240,
      amountPerUnit: 10000,
      activeUnit: "IU",
      costPerUnitActive: 15.73 / (10000 * 240),
      costPer1000IU: 0.00655,
      notes: "High-dose daily softgel; verify personal dosing.",
    },
    {
      id: "vitd_celebrate_25000_90",
      brand: "Celebrate Vitamins",
      productName: "Vitamin D3 25,000 IU, 90 capsules",
      form: "Capsule",
      price: 21.99,
      unitsPerBottle: 90,
      amountPerUnit: 25000,
      activeUnit: "IU",
      costPerUnitActive: 21.99 / (25000 * 90),
      costPer1000IU: 0.00977,
      notes: "Product page notes 1 capsule once per week.",
    },
  ],

  Magnesium: [
    {
      id: "mag_sv_400_250",
      brand: "Spring Valley",
      productName: "Magnesium 400 mg, 250 tablets",
      form: "Tablet",
      price: 10.88,
      unitsPerBottle: 250,
      amountPerUnit: 400,
      activeUnit: "mg",
      costPerUnitActive: 0.000109,
      notes: "Cheapest magnesium per mg in the priced set.",
    },
    {
      id: "mag_nb_500_200",
      brand: "Nature's Bounty",
      productName: "Magnesium Oxide 500 mg, 200 tablets",
      form: "Tablet",
      price: 11.89,
      unitsPerBottle: 200,
      amountPerUnit: 500,
      activeUnit: "mg",
      costPerUnitActive: 0.000119,
      notes: "Very high potency per tablet.",
    },
    {
      id: "mag_le_500_100",
      brand: "Life Extension",
      productName: "Magnesium Caps 500 mg, 100 capsules",
      form: "Capsule",
      price: 9.0,
      unitsPerBottle: 100,
      amountPerUnit: 500,
      activeUnit: "mg",
      costPerUnitActive: 0.00018,
      notes: "Serving size 1 capsule, 500 mg.",
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
      notes: "Best value B12 in this subset.",
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
      notes: "Highest potency per lozenge in the subset.",
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
      notes: "Serving size 1 lozenge.",
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
      notes: "Omega-3 breakdown (EPA/DHA) not fully captured.",
      assumptions: ["Cost per mg assumes 1,250 mg per softgel."],
      caution: ["Omega-3 can interact with medications and may affect bleeding risk."],
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
      notes: "Very cheap per mg, but listing may reflect per serving not per capsule.",
      assumptions: ["Assumes 1,500 mg per capsule; verify label before hard claims in UI."],
    },
    {
      id: "mag_sv_400_250_crp",
      brand: "Spring Valley",
      productName: "Magnesium 400 mg, 250 tablets",
      form: "Tablet",
      price: 10.88,
      unitsPerBottle: 250,
      amountPerUnit: 400,
      activeUnit: "mg",
      costPerUnitActive: 0.000109,
      notes: "Included because magnesium is commonly studied for inflammatory markers.",
    },
  ],

  Testosterone: [
    {
      id: "zinc_bronson_50_360",
      brand: "Bronson",
      productName: "Zinc 50 mg, 360 tablets",
      form: "Tablet",
      price: 14.99,
      unitsPerBottle: 360,
      amountPerUnit: 50,
      activeUnit: "mg",
      costPerUnitActive: 0.000833,
    },
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
      notes: "KSM-66 extract.",
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
      notes: "Trials often use ~6 mg/day, which may imply 2 capsules/day.",
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
  creactiveprotein: "CRP",
  testosterone: "Testosterone",
  freetestosterone: "Testosterone",
  totaltestosterone: "Testosterone",
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

function estimateMonthlyCost(product: SupplementProduct, unitsPerDay = 1) {
  return Number((((product.price / product.unitsPerBottle) * 30) * unitsPerDay).toFixed(2))
}

const UNITS_PER_DAY_DEFAULT = 1
const DAYS_PER_MONTH = 30

function getMonthlyCostBreakdown(
  product: SupplementProduct,
  unitsPerDay = UNITS_PER_DAY_DEFAULT
): MonthlyCostBreakdown {
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
  if (s === "suboptimal" || s === "borderline" || s === "low") {
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
    if (recType === "Core") return "Low iron stores; supplementation is evidence-based to support repletion."
    if (recType === "Conditional") return "Borderline ferritin; consider supplementation with retest to confirm need."
    return "Ferritin in context; use only if deficient or suboptimal."
  }
  if (m.includes("vitamind") || m.includes("vitd")) {
    if (recType === "Core") return "Deficient vitamin D; supplementation supports bone health, immunity, and recovery."
    if (recType === "Conditional") return "Suboptimal vitamin D; supplementation can help reach optimal range."
    return "Vitamin D in context; dose depends on current level and goals."
  }
  if (m.includes("magnesium")) {
    if (recType === "Core") return "Low magnesium; supplementation can support muscle function and recovery."
    if (recType === "Conditional") return "Borderline magnesium; consider supplementation with diet and lifestyle."
    return "Magnesium in context; useful for muscle and nervous system support."
  }
  if (m.includes("b12") || m.includes("cobalamin")) {
    if (recType === "Core") return "B12 deficiency; supplementation supports red blood cells and energy metabolism."
    if (recType === "Conditional") return "Suboptimal B12; supplementation may help; consider absorption context."
    return "B12 in context; useful when intake or absorption is limited."
  }
  if (m.includes("crp")) {
    return "CRP reflects inflammation; support is context-dependent (stress, recovery, diet)."
  }
  if (m.includes("testosterone")) {
    return "Testosterone support is context-dependent; discuss with a clinician before supplementing."
  }
  return "Recommended based on your results and profile."
}

function getExpectedBenefit(
  marker: string,
  status?: string,
  recType: RecommendationType = "Context-dependent"
): string {
  const m = normalize(marker)
  if (m.includes("ferritin")) {
    if (recType === "Core") return "Can support repletion of iron stores and improve energy, endurance capacity, and recovery from fatigue."
    if (recType === "Conditional") return "May help raise ferritin toward optimal range and support energy and recovery; retest to confirm response."
    return "Only appropriate when ferritin is low; can support iron stores and oxygen delivery when deficient or suboptimal."
  }
  if (m.includes("vitamind") || m.includes("vitd")) {
    if (recType === "Core") return "Can raise vitamin D levels and support bone health, immunity, recovery, and training adaptation."
    if (recType === "Conditional") return "May help reach optimal vitamin D range and support recovery and immune function."
    return "Supports vitamin D status when low; benefits include bone health, immunity, and recovery."
  }
  if (m.includes("magnesium")) {
    if (recType === "Core") return "Can help restore magnesium status and support muscle function, sleep quality, and recovery."
    if (recType === "Conditional") return "May support muscle and nervous system function and recovery when intake is insufficient."
    return "Supports muscle function, relaxation, and recovery when dietary magnesium is low."
  }
  if (m.includes("b12") || m.includes("cobalamin")) {
    if (recType === "Core") return "Can correct B12 deficiency and support red blood cell production, energy metabolism, and neurological function."
    if (recType === "Conditional") return "May help raise B12 and support energy and red blood cell health; consider absorption if levels stay low."
    return "Supports B12 status when intake or absorption is limited; benefits include energy and red blood cell support."
  }
  if (m.includes("crp")) {
    return "Anti-inflammatory and recovery support are context-dependent; benefits may include supporting a healthy inflammatory response and recovery."
  }
  if (m.includes("testosterone")) {
    return "Testosterone support is context-dependent; discuss with a clinician; benefits are not established for all users."
  }
  return "May support the related biomarker and overall health when used appropriately to your context."
}

function getDosingGuidance(
  marker: string,
  status?: string,
  recType: RecommendationType = "Context-dependent"
): string {
  const m = normalize(marker)
  if (m.includes("ferritin")) {
    if (recType === "Core") return "Dose and form (e.g. ferrous sulfate vs bisglycinate) should match severity and tolerance. Typical repletion: elemental iron per day as advised by a clinician or protocol; take apart from calcium and caffeine. Retest in 8–10 weeks."
    if (recType === "Conditional") return "Consider a moderate dose of elemental iron (e.g. as per product or clinician guidance), with food if needed for tolerance. Retest in 8–10 weeks to avoid over-correction."
    return "Only dose when ferritin is deficient or suboptimal; follow a structured protocol and retest."
  }
  if (m.includes("vitamind") || m.includes("vitd")) {
    if (recType === "Core") return "Higher-dose repletion may be used short-term (e.g. as per clinician or protocol); then switch to maintenance (often 1,000–2,000 IU daily). Retest in 8–12 weeks."
    if (recType === "Conditional") return "Common maintenance range 1,000–2,000 IU daily; dose depends on current level and goals. Retest in 8–12 weeks."
    return "Dose depends on current blood level; often 1,000–2,000 IU daily for maintenance. Retest to guide adjustment."
  }
  if (m.includes("magnesium")) {
    return "Often 200–400 mg elemental magnesium daily (e.g. glycinate or citrate), with food. Split doses if needed. Retest in 6–8 weeks if tracking status."
  }
  if (m.includes("b12") || m.includes("cobalamin")) {
    if (recType === "Core") return "Repletion may use higher doses or sublingual/other forms; maintenance often 1,000 mcg daily or several times per week. Retest in 8–12 weeks."
    return "Typical maintenance 500–1,000 mcg daily or several times per week; form (cyanocobalamin vs methylcobalamin) can depend on preference and absorption. Retest to confirm."
  }
  if (m.includes("crp")) {
    return "No single supplement replaces addressing root causes (recovery, stress, diet). Omega-3s, etc., are context-dependent; discuss with a clinician."
  }
  if (m.includes("testosterone")) {
    return "Do not self-dose testosterone or SARMs. Any support (e.g. adaptogens) should be discussed with a clinician."
  }
  return "Follow product label or clinician guidance; retest on the schedule suggested for this marker."
}

function pickBestOverall(leaderboard: SupplementLeaderboardEntry[]): SupplementLeaderboardEntry {
  if (leaderboard.length === 0) throw new Error("Empty leaderboard")
  return [...leaderboard].sort(
    (a, b) => a.rankByValue + a.rankByPotency - (b.rankByValue + b.rankByPotency)
  )[0]
}

function inferDoseText(marker: string) {
  switch (marker) {
    case "Ferritin":
      return "Context-dependent iron protocol"
    case "Vitamin D":
      return "Dose depends on current blood level and frequency plan"
    case "Magnesium":
      return "Typically daily"
    case "Vitamin B12":
      return "Typically daily or several times weekly depending on context"
    case "CRP":
      return "Context-dependent anti-inflammatory support"
    case "Testosterone":
      return "Context-dependent support only"
    default:
      return "1 serving daily"
  }
}

export function supplementRecommendations(analysis: AnalysisItem[] = []): SupplementRecommendation[] {
  if (!Array.isArray(analysis)) return []

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

    const options = supplementDatabase[matchedKey]
    if (!Array.isArray(options) || options.length === 0) continue

    const leaderboard = buildLeaderboard(options)
    const bestValue = leaderboard[0]
    const highestPotency = [...leaderboard].sort(
      (a, b) => a.rankByPotency - b.rankByPotency
    )[0]
    const bestOverall = pickBestOverall(leaderboard)

    const recommendationType = getRecommendationType(matchedKey, status)
    const whyRecommended = getWhyRecommendedShort(matchedKey, status, recommendationType)
    const expectedBenefit = getExpectedBenefit(matchedKey, status, recommendationType)
    const dosingGuidance = getDosingGuidance(matchedKey, status, recommendationType)
    const estimatedMonthlyCost = estimateMonthlyCost(bestOverall)
    const monthlyCostBreakdown = getMonthlyCostBreakdown(bestOverall)

    recommendations.push({
      name: bestOverall.productName,
      brand: bestOverall.brand,
      marker: matchedKey,
      supplementKey: normalize(matchedKey),
      dose: inferDoseText(matchedKey),
      status,
      recommendationType,
      whyRecommended,
      whyThisIsRecommended: whyRecommended,
      expectedBenefit,
      dosingGuidance,
      bestValue,
      highestPotency,
      bestOverall,
      leaderboard,
      estimatedMonthlyCost,
      monthlyCostBreakdown,
    })

    usedMarkers.add(matchedKey)
  }

  return recommendations
}

export {
  supplementDatabase,
  buildLeaderboard,
  estimateMonthlyCost,
  resolveMarkerKey,
}