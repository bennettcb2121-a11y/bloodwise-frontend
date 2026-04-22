/**
 * Clarion Shop — curated 3-tier supplement catalog.
 *
 * For each supplement preset we surface three distinct products:
 *   - `cheapest`         – lowest cost/serving from a reputable brand.
 *   - `highest_potency`  – most active ingredient per serving (for users who know their targets).
 *   - `best_overall`     – Clarion's default: balances dose, form, brand trust, tolerability, price.
 *
 * Every product resolves to an Amazon retail URL with our `?tag=` affiliate
 * parameter applied. When a specific `asin` is known (verified from Clarion's
 * core biomarker protocol work) we point at `/dp/{ASIN}`. When it isn't, we
 * fall back to a **brand-targeted Amazon search** (e.g. `k=Thorne+Basic+Nutrients+2%2Fday`)
 * so the user still lands on a reputable product page and Clarion still earns
 * the commission — no more generic, noisy "multivitamin supplement" searches.
 *
 * Lab awareness:
 *   Each entry declares a `labAwareness` block mapping the supplement to a
 *   biomarker (where one applies). The shop UI reads the user's saved labs
 *   and renders one of four banners before the 3 product cards:
 *     - "optimal"     → "you're already dialed in, no need to add this"
 *     - "maintenance" → "your number is fine — a maintenance dose is reasonable if you want ongoing support"
 *     - "priority"    → "based on your last labs, this is a priority"
 *     - "unknown"     → "upload labs to see whether this is a priority for you"
 *
 * Coverage: Pass-1 focuses on supplements with verified ASINs from our
 * biomarker protocols plus the most-searched general wellness picks. Missing
 * supplements fall through to the legacy preset-to-Amazon-search behavior
 * in `stackAffiliate.ts`.
 */

import { getAmazonAssociatesTag } from "./affiliateProducts"

export type ShopTier = "cheapest" | "highest_potency" | "best_overall"

export type ShopProduct = {
  tier: ShopTier
  /** Short label shown on the tier chip. */
  tierLabel: "Best deal" | "Highest potency" | "Best overall"
  brand: string
  productName: string
  /** e.g. "2,000 IU per softgel" or "500 mg elemental per capsule". */
  dose: string
  /** Rough price-for-bottle label for UI, e.g. "~$10", "$25–35". Not used for sorting. */
  approxPrice: string
  /** 1 sentence on why we picked this. */
  why: string
  /** Amazon ASIN when we have a hand-verified product. Falls back to {@link amazonSearchQuery} when null. */
  asin: string | null
  /** Used only when `asin` is null. Brand-targeted query — lands on a focused Amazon results page with our affiliate tag. */
  amazonSearchQuery?: string
}

export type LabAwarenessStatus = "optimal" | "maintenance" | "priority" | "unknown"

export type LabAwareness = {
  /** Biomarker name for resolving the user's latest saved lab value; null means "no lab directly tracks this". */
  biomarker: string | null
  /** Additional aliases/keys searched against biomarkerAliases when resolving the lab value. */
  biomarkerAliases?: string[]
  /** Lines shown for each status. Each line should stand alone — no trailing punctuation needed; the UI will handle it. */
  notes: Record<LabAwarenessStatus, string>
}

export type SupplementShopEntry = {
  presetId: string
  displayName: string
  category: "vitamin" | "mineral" | "fatty-acid" | "amino" | "other" | "probiotic"
  /** 2-3 sentence summary shown above the product cards. */
  overview: string
  /** Drug interactions, UL, pregnancy — shown prominently when present. */
  caution?: string
  products: {
    cheapest: ShopProduct
    highest_potency: ShopProduct
    best_overall: ShopProduct
  }
  labAwareness: LabAwareness
}

/**
 * Build an Amazon /dp/ URL with our affiliate tag for a known ASIN.
 * Exported so UI components can share the same link shape.
 */
export function buildAmazonDpUrl(asin: string): string {
  return `https://www.amazon.com/dp/${encodeURIComponent(asin)}?tag=${encodeURIComponent(getAmazonAssociatesTag())}`
}

/** Build a brand-targeted Amazon search URL with our affiliate tag. */
export function buildAmazonSearchUrl(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(getAmazonAssociatesTag())}`
}

/**
 * Resolve an affiliate URL for a catalog product. Uses ASIN when present,
 * brand-targeted search otherwise.
 */
export function affiliateUrlForShopProduct(product: ShopProduct): string {
  if (product.asin) return buildAmazonDpUrl(product.asin)
  if (product.amazonSearchQuery) return buildAmazonSearchUrl(product.amazonSearchQuery)
  return buildAmazonSearchUrl(`${product.brand} ${product.productName}`)
}

/**
 * Thumb image (Amazon serves a standard image per ASIN). Non-ASIN products return null.
 */
/**
 * @deprecated We no longer render hotlinked Amazon product images. See
 * `src/lib/supplementVisual.ts` for the copyright / consistency rationale.
 * Left as a no-op so any stale callers fail safely (no image, fallback UI
 * handles it).
 */
export function shopProductImageUrl(_product: ShopProduct): string | null {
  return null
}

// ---------------------------------------------------------------------------
// Catalog data
// ---------------------------------------------------------------------------

// ASINs below are copied verbatim from src/lib/coreBiomarkerProtocols.ts where
// noted, which is already in production. New brand-search fallbacks are chosen
// to target longstanding reputable products so the user lands on the right
// page regardless of day-to-day Amazon listing churn.

export const SUPPLEMENT_SHOP_CATALOG: Record<string, SupplementShopEntry> = {
  vitamin_d: {
    presetId: "vitamin_d",
    displayName: "Vitamin D",
    category: "vitamin",
    overview:
      "Vitamin D supports bone, immune, and mood pathways. Status is one of the most common low or low-normal findings. Dose should be guided by a 25-OH vitamin D blood level when possible.",
    caution:
      "High-dose vitamin D (≥ 10,000 IU/day) should be clinician-supervised. If combining with vitamin K2, avoid megadosing when on anticoagulants without clinician input.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Nature Made",
        productName: "Vitamin D3 2,000 IU Softgels",
        dose: "2,000 IU per softgel",
        approxPrice: "~$10",
        why: "Mass-market trust, USP-verified, great value for a standard maintenance dose.",
        asin: "B004U3Y8NI",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Sports Research",
        productName: "Vitamin D3 5,000 IU with Organic Coconut Oil",
        dose: "5,000 IU per softgel",
        approxPrice: "$15–20",
        why: "Clean formulation, higher dose suited for documented insufficiency under clinician guidance.",
        asin: "B00JGCBGZQ",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Sports Research",
        productName: "Vitamin D3 + K2 (MK-7)",
        dose: "5,000 IU D3 + 100 mcg K2",
        approxPrice: "$20–25",
        why: "Pairs D3 with K2 to help direct calcium to bone — the most commonly recommended combination.",
        asin: "B07NXW4GW7",
      },
    },
    labAwareness: {
      biomarker: "Vitamin D",
      biomarkerAliases: ["25-OH Vitamin D", "25(OH)D", "Vitamin D, 25-Hydroxy"],
      notes: {
        optimal:
          "Your last 25-OH vitamin D is in a strong range. You don't need to add more right now — a seasonal check is enough.",
        maintenance:
          "Your vitamin D is acceptable. A maintenance dose (1,000–2,000 IU/day) is reasonable if sun exposure is inconsistent.",
        priority:
          "Your last 25-OH vitamin D was low. This is one of the higher-leverage supplements for you — retest in 8–12 weeks.",
        unknown:
          "We don't have a vitamin D lab yet. Upload labs to see whether this is a priority before you start supplementing.",
      },
    },
  },

  magnesium: {
    presetId: "magnesium",
    displayName: "Magnesium",
    category: "mineral",
    overview:
      "Magnesium supports muscle function, sleep, and nervous system balance. Glycinate is the most tolerable form for most people; citrate is useful if constipation is also an issue.",
    caution:
      "Use caution with magnesium supplementation in kidney disease. NIH supplemental UL is 350 mg elemental/day without clinician supervision.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Doctor's Best",
        productName: "High Absorption Magnesium Glycinate/Lysinate",
        dose: "100 mg elemental per tablet",
        approxPrice: "$15–20",
        why: "Consistently one of the best value/mg ratios for chelated magnesium; well tolerated.",
        asin: "B000BD0RT0",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Thorne",
        productName: "Magnesium Bisglycinate Powder",
        dose: "200 mg elemental per scoop",
        approxPrice: "$35–45",
        why: "Powder format lets you titrate precisely; third-party tested and NSF-sport certified.",
        asin: "B0797HBLL3",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Doctor's Best",
        productName: "High Absorption Magnesium Glycinate/Lysinate",
        dose: "100 mg elemental per tablet",
        approxPrice: "$15–20",
        why: "The same pick wins again here — value, form, and tolerability in one bottle.",
        asin: "B000BD0RT0",
      },
    },
    labAwareness: {
      biomarker: "Magnesium",
      biomarkerAliases: ["Magnesium, Serum", "Mg", "RBC Magnesium"],
      notes: {
        optimal:
          "Serum magnesium is within range. You don't need to add this unless you're symptomatic (cramps, poor sleep) — serum can miss intracellular status.",
        maintenance:
          "Magnesium looks fine on labs. A low maintenance dose (100–200 mg elemental/day) is reasonable for sleep or muscle support.",
        priority:
          "Your last magnesium was low. Worth adding — glycinate is the most tolerable form to start.",
        unknown:
          "Magnesium isn't on a standard panel. If you have cramps, poor sleep, or high training load, a modest dose is low-risk to try.",
      },
    },
  },

  omega3: {
    presetId: "omega3",
    displayName: "Omega-3 / Fish oil",
    category: "fatty-acid",
    overview:
      "EPA and DHA support cardiovascular, triglyceride, and inflammatory pathways. Aim for ~1–2 g EPA+DHA combined per day from a third-party tested source.",
    caution:
      "Can affect bleeding risk — use with caution if on anticoagulants or before surgery. AHA 4 g/day therapy for high triglycerides is a clinical context, not a casual OTC dose.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Kirkland Signature",
        productName: "Fish Oil 1,200 mg",
        dose: "~640 mg EPA+DHA per 2 softgels",
        approxPrice: "$15–20",
        why: "IFOS-tested Costco staple, cleanest budget option on a per-gram basis.",
        asin: "B01L0S0T8I",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Thorne",
        productName: "Super EPA Pro",
        dose: "~860 mg EPA + 290 mg DHA per capsule",
        approxPrice: "$45–55",
        why: "Highly concentrated EPA for users targeting triglycerides or inflammation at clinician-aware doses.",
        asin: "B005CD3J9E",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Sports Research",
        productName: "Triple Strength Omega-3",
        dose: "~1,040 mg EPA + 760 mg DHA per 2 softgels",
        approxPrice: "$25–35",
        why: "Strong EPA+DHA per serving at a fair price — Clarion's default for most people.",
        asin: "B07DX89ZHN",
      },
    },
    labAwareness: {
      biomarker: "Triglycerides",
      biomarkerAliases: ["TG", "Trigs"],
      notes: {
        optimal:
          "Triglycerides are in a good range. Omega-3 is still reasonable for general cardiovascular/inflammation support, but not a priority.",
        maintenance:
          "Triglycerides are borderline. 1–2 g EPA+DHA/day is a sensible maintenance range.",
        priority:
          "Your triglycerides were elevated. Omega-3 (ideally paired with carb-quality and alcohol adjustments) is high-leverage here — discuss higher doses with a clinician.",
        unknown:
          "We don't have a recent lipid panel. Omega-3 is low-risk for most adults at 1–2 g/day; upload labs to personalize the dose.",
      },
    },
  },

  iron: {
    presetId: "iron",
    displayName: "Iron",
    category: "mineral",
    overview:
      "Iron is critical for oxygen transport and energy. Supplement only when ferritin is clearly low and the cause has been considered — iron overload is dangerous.",
    caution:
      "DO NOT supplement iron if your ferritin is normal or high, or if anemia cause is unclear. Alternate-day dosing often improves both tolerance and absorption.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Nature Made",
        productName: "Iron 65 mg (Ferrous Sulfate)",
        dose: "65 mg elemental per tablet",
        approxPrice: "~$10",
        why: "Lowest cost per mg. GI tolerability varies — take with vitamin C, away from coffee/tea/calcium.",
        asin: "B000QGKHQA",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Thorne",
        productName: "Iron Bisglycinate 25 mg",
        dose: "25 mg elemental per capsule",
        approxPrice: "$15–20",
        why: "Gentler chelated form; third-party tested — takes more capsules to reach a higher dose but causes less GI upset.",
        asin: "B0797GZDZL",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Solgar",
        productName: "Gentle Iron 25 mg (Iron Bisglycinate)",
        dose: "25 mg elemental per vegcap",
        approxPrice: "$12–18",
        why: "The tolerability/compliance sweet spot — people actually take this consistently enough to raise ferritin.",
        asin: "B005P0TJ84",
      },
    },
    labAwareness: {
      biomarker: "Ferritin",
      biomarkerAliases: ["Iron, Serum", "Iron Saturation", "Transferrin Saturation"],
      notes: {
        optimal:
          "Your ferritin is solid. Don't add iron — excess iron is harmful.",
        maintenance:
          "Ferritin is within range. Iron supplementation is not warranted right now; revisit at your next lab.",
        priority:
          "Your ferritin was low. Iron is one of your highest-leverage moves — start gently, take with vitamin C, retest in 8–12 weeks.",
        unknown:
          "We don't have a ferritin result yet. Upload labs before starting iron — guessing here can cause harm.",
      },
    },
  },

  b12: {
    presetId: "b12",
    displayName: "Vitamin B12",
    category: "vitamin",
    overview:
      "B12 supports red blood cell production, energy metabolism, and nerve function. Low-normal B12 is common in vegans/vegetarians and in people on PPIs, metformin, or with GI absorption issues.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Nature Made",
        productName: "Vitamin B12 1,000 mcg",
        dose: "1,000 mcg per tablet",
        approxPrice: "~$10",
        why: "Cyanocobalamin — simpler form, fine for most people, lowest cost.",
        asin: "B005DXM32M",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Jarrow Formulas",
        productName: "Methyl B-12 5,000 mcg (Lozenge)",
        dose: "5,000 mcg methylcobalamin per lozenge",
        approxPrice: "$15–20",
        why: "Active methyl form at a strong dose for repletion; lozenge bypasses gut absorption issues.",
        asin: "B0013OQGO6",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "NOW Foods",
        productName: "Methyl B-12 1,000 mcg",
        dose: "1,000 mcg methylcobalamin per lozenge",
        approxPrice: "~$10",
        why: "Active form, sensible maintenance dose, great price — Clarion's default.",
        asin: "B001F0R7VE",
      },
    },
    labAwareness: {
      biomarker: "Vitamin B12",
      biomarkerAliases: ["B12", "Cobalamin", "B-12"],
      notes: {
        optimal:
          "Your B12 is strong. No need to add unless your diet/medications change.",
        maintenance:
          "B12 is within range. A light maintenance dose (1,000 mcg/day) is fine if you avoid animal foods or take a PPI.",
        priority:
          "Your B12 was low. Worth adding — use the methyl form and retest in 8–12 weeks. Severe or neurologic symptoms need clinician input.",
        unknown:
          "We don't have a B12 result yet. If you're plant-based, on a PPI, or on metformin, a maintenance dose is low-risk.",
      },
    },
  },

  folate: {
    presetId: "folate",
    displayName: "Folate",
    category: "vitamin",
    overview:
      "Folate supports DNA synthesis and healthy red blood cells, and works hand-in-hand with B12. Confirm B12 status before high folate doses — excess folic acid can mask B12 deficiency.",
    caution:
      "Do not take > 1,000 mcg folic acid without clinician context. Always interpret folate with B12.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Nature Made",
        productName: "Folic Acid 400 mcg",
        dose: "400 mcg per tablet",
        approxPrice: "~$8",
        why: "Standard folic acid at a maintenance dose — fine for most people.",
        asin: "B0000DJAPS",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Thorne",
        productName: "5-MTHF 5 mg (Methylfolate)",
        dose: "5 mg methylfolate per capsule",
        approxPrice: "$25–30",
        why: "Active folate at a repletion dose. Use only when clearly deficient and B12 is covered.",
        asin: "B005BSMVFS",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Solgar",
        productName: "Folate 1,000 mcg (Metafolin)",
        dose: "1,000 mcg methylfolate per tablet",
        approxPrice: "$15–20",
        why: "Active form, reasonable dose, broad availability. Clarion's default for supplemental folate.",
        asin: "B00I5MTK5G",
      },
    },
    labAwareness: {
      biomarker: "Folate",
      biomarkerAliases: ["Folate, Serum", "RBC Folate", "Folic Acid"],
      notes: {
        optimal:
          "Folate looks great. You're covered.",
        maintenance:
          "Folate is within range. A maintenance dose in a multivitamin is typically enough.",
        priority:
          "Your folate was low. Confirm B12 first, then add — active (methyl) folate is Clarion's preferred form.",
        unknown:
          "We don't have a folate result yet. For most non-pregnant adults eating leafy greens, dedicated folate is unnecessary.",
      },
    },
  },

  fiber: {
    presetId: "fiber",
    displayName: "Fiber (Psyllium)",
    category: "other",
    overview:
      "Psyllium is the best-studied soluble fiber for LDL cholesterol and glycemic control. ~10 g/day lowered LDL-C by ~7% in meta-analysis. Also great for daily regularity.",
    caution:
      "Always take psyllium with plenty of water to avoid choking/obstruction. Separate from medications by 2 hours.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Kirkland Signature",
        productName: "Sugar-Free Psyllium Fiber Powder",
        dose: "~3.4 g soluble fiber per rounded teaspoon",
        approxPrice: "$15–20",
        why: "Same active ingredient as Metamucil at about a third the cost per serving.",
        asin: "B0CHTNWWLJ",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "NOW Foods",
        productName: "Psyllium Husk 500 mg (500 capsules)",
        dose: "500 mg per capsule",
        approxPrice: "$20–25",
        why: "Capsule format for travel or meal-pairing. Takes more caps to reach the LDL-reduction dose, but zero taste.",
        asin: "B0013OW2KS",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Metamucil",
        productName: "Sugar-Free Psyllium Husk Powder",
        dose: "~2.4 g soluble fiber per teaspoon",
        approxPrice: "$15–25",
        why: "Most clinical trial evidence for this exact product; easy to hit the 10 g/day target over 2–3 doses.",
        asin: "B003CT2YQY",
      },
    },
    labAwareness: {
      biomarker: "LDL-C",
      biomarkerAliases: ["LDL Cholesterol", "LDL"],
      notes: {
        optimal:
          "Your LDL-C is in a healthy range. Psyllium is still a nice daily habit for digestion, but not a priority for cholesterol.",
        maintenance:
          "LDL-C is borderline. Psyllium at ~10 g/day is a high-leverage nudge — pair with olive oil and less saturated fat.",
        priority:
          "Your LDL-C was elevated. Psyllium is one of the best-evidence supplements here — retest in 8–12 weeks, and talk to your clinician if LDL is very high.",
        unknown:
          "We don't have a lipid panel yet. Psyllium is still great for gut regularity — upload labs to see if LDL is a priority.",
      },
    },
  },

  berberine: {
    presetId: "berberine",
    displayName: "Berberine",
    category: "other",
    overview:
      "Berberine supports glycemic control and lipid pathways. Common retail protocol is 500 mg with meals, 2–3x/day. Not for pregnancy or casual use alongside diabetes meds.",
    caution:
      "Can interact with diabetes medications (additive hypoglycemia) and should be avoided in pregnancy. Clinician-aware use only.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "NOW Foods",
        productName: "Berberine Glucose Support 400 mg",
        dose: "400 mg per capsule",
        approxPrice: "$15–25",
        why: "High-quality berberine at the lowest practical cost — widely used entry point.",
        asin: "B07PSMZ3J1",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Thorne",
        productName: "Berberine 500 mg",
        dose: "500 mg per capsule",
        approxPrice: "$35–45",
        why: "NSF-certified premium option — what many clinicians recommend when berberine is appropriate.",
        asin: "B009LI7VRC",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "NOW Foods",
        productName: "Berberine Glucose Support 400 mg",
        dose: "400 mg per capsule",
        approxPrice: "$15–25",
        why: "Evidence-backed, clean label, reasonable dose. Same pick wins on value too.",
        asin: "B07PSMZ3J1",
      },
    },
    labAwareness: {
      biomarker: "HbA1c",
      biomarkerAliases: ["Hemoglobin A1c", "A1c", "Glycated Hemoglobin", "Fasting Glucose", "Glucose"],
      notes: {
        optimal:
          "Your A1c/glucose is in a healthy range. Berberine isn't needed — it's not a 'biohack' for normal metabolism.",
        maintenance:
          "Your metabolic markers are borderline. Lifestyle first — berberine is a reasonable adjunct for some, but talk to a clinician if you're on any diabetes meds.",
        priority:
          "Your A1c or fasting glucose is elevated. Berberine can help, but this is a clinician-involved decision — especially if you're on diabetes meds or planning pregnancy.",
        unknown:
          "We don't have glycemic labs yet. Don't start berberine without first knowing your A1c and fasting glucose.",
      },
    },
  },

  turmeric: {
    presetId: "turmeric",
    displayName: "Turmeric / Curcumin",
    category: "other",
    overview:
      "Curcumin is the active pigment in turmeric, studied for inflammation and joint/mood support. Look for a high-absorption form (phytosome, BCM-95, or combined with piperine).",
    caution:
      "Can increase bleeding risk — caution with anticoagulants and around surgery. May interact with antiplatelets.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "NOW Foods",
        productName: "Curcumin 665 mg (Standardized)",
        dose: "665 mg standardized curcuminoids per capsule",
        approxPrice: "$15–20",
        why: "Standardized extract at a fair price — decent starting point if you don't need the phytosome absorption boost.",
        asin: "B0013L852A",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Thorne",
        productName: "Curcumin Phytosome 500 mg (Meriva)",
        dose: "500 mg Meriva phytosome per capsule",
        approxPrice: "$40–50",
        why: "Meriva phytosome is one of the most clinically studied high-absorption curcumin formulations.",
        asin: "B01D8V0962",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Thorne",
        productName: "Curcumin Phytosome 500 mg (Meriva)",
        dose: "500 mg Meriva phytosome per capsule",
        approxPrice: "$40–50",
        why: "If you're going to take curcumin, use a form that actually gets absorbed — Meriva is the evidence-rich pick.",
        asin: "B01D8V0962",
      },
    },
    labAwareness: {
      biomarker: "hs-CRP",
      biomarkerAliases: ["C-Reactive Protein", "CRP", "hsCRP"],
      notes: {
        optimal:
          "Your hs-CRP is low — baseline inflammation looks good. Curcumin isn't a priority.",
        maintenance:
          "hs-CRP is within range. Curcumin can still be useful for joint comfort, but it's not a must-have.",
        priority:
          "Your hs-CRP is elevated. Curcumin is reasonable alongside lifestyle changes — watch for bleeding-risk interactions.",
        unknown:
          "We don't have a CRP result yet. Curcumin is generally safe at standard doses for most adults.",
      },
    },
  },

  // --- Supplements without a direct Clarion biomarker link ---
  // These fall back to generalist advice — we still give 3 curated products.
  // For entries below, `asin` may be null where we don't have a verified
  // product; the UI will route through brand-targeted search.

  multivitamin: {
    presetId: "multivitamin",
    displayName: "Multivitamin",
    category: "vitamin",
    overview:
      "A good multivitamin is an insurance policy — it closes small nutrient gaps without fixing a specific deficiency. If you already have labs showing a specific low value, target that nutrient directly.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Nature Made",
        productName: "Multi for Him / for Her (USP verified)",
        dose: "1 tablet daily",
        approxPrice: "$10–15",
        why: "USP-verified, meets label claims, covers all the basics at a drugstore price.",
        asin: null,
        amazonSearchQuery: "Nature Made Multi for Him USP Verified",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Thorne",
        productName: "Basic Nutrients 2/Day",
        dose: "2 capsules daily",
        approxPrice: "$30–40",
        why: "Active forms of B-vitamins (methylfolate, methyl-B12), chelated minerals, no iron (safer default).",
        asin: null,
        amazonSearchQuery: "Thorne Basic Nutrients 2/Day",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Pure Encapsulations",
        productName: "O.N.E. Multivitamin",
        dose: "1 capsule daily",
        approxPrice: "$30–40",
        why: "One capsule, active forms, no iron, hypoallergenic — the multivitamin most dietitians recommend.",
        asin: null,
        amazonSearchQuery: "Pure Encapsulations O.N.E. Multivitamin",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "A multivitamin is a reasonable daily insurance policy regardless of labs.",
        maintenance: "A multivitamin is a reasonable daily insurance policy regardless of labs.",
        priority:
          "A multivitamin can help close small gaps — but if your labs flagged a specific low (like vitamin D or iron), target that nutrient directly instead of relying on a multi.",
        unknown: "A multivitamin is a low-risk daily habit for most adults. Labs help you decide whether you need a targeted supplement on top.",
      },
    },
  },

  zinc: {
    presetId: "zinc",
    displayName: "Zinc",
    category: "mineral",
    overview:
      "Zinc supports immunity, skin healing, and testosterone pathways. Most people only need supplemental zinc during acute illness or when intake is clearly low.",
    caution:
      "Long-term zinc (> 40 mg/day, beyond 12 weeks) can deplete copper. Cycle off or pair with 1–2 mg copper. Don't take on an empty stomach — it's notoriously nauseating.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "NOW Foods",
        productName: "Zinc Picolinate 50 mg",
        dose: "50 mg elemental per capsule",
        approxPrice: "$10–15",
        why: "Picolinate is well-absorbed; cap is at the higher end — consider splitting or every-other-day for long use.",
        asin: null,
        amazonSearchQuery: "NOW Foods Zinc Picolinate 50 mg",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Thorne",
        productName: "Zinc Picolinate 30 mg",
        dose: "30 mg elemental per capsule",
        approxPrice: "$12–18",
        why: "NSF-certified picolinate — the form most consistently linked to better absorption.",
        asin: null,
        amazonSearchQuery: "Thorne Zinc Picolinate 30 mg",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Thorne",
        productName: "Zinc Picolinate 15 mg",
        dose: "15 mg elemental per capsule",
        approxPrice: "$10–15",
        why: "Daily-sustainable dose of a highly absorbable form. Safer for long-term use than a 50 mg daily.",
        asin: null,
        amazonSearchQuery: "Thorne Zinc Picolinate 15 mg",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "Zinc is mostly an acute-use supplement — during illness, or when you know intake is low.",
        maintenance: "Zinc is mostly an acute-use supplement — during illness, or when you know intake is low.",
        priority: "Zinc is mostly an acute-use supplement — during illness, or when you know intake is low.",
        unknown: "Zinc is rarely on standard panels. A short course (under 4 weeks) at standard doses is low-risk for most adults; avoid long daily use without copper.",
      },
    },
  },

  vitamin_c: {
    presetId: "vitamin_c",
    displayName: "Vitamin C",
    category: "vitamin",
    overview:
      "Vitamin C is a core antioxidant, supports iron absorption from plant foods, and mildly supports immunity. Most people hit the floor through diet — a supplement shines when iron absorption matters.",
    caution:
      "Very high doses (> 2,000 mg/day) can cause GI upset and may contribute to kidney stones in susceptible people.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Nature's Bounty",
        productName: "Vitamin C 1,000 mg",
        dose: "1,000 mg per tablet",
        approxPrice: "$10–15",
        why: "Straightforward ascorbic acid at a mass-market price.",
        asin: null,
        amazonSearchQuery: "Nature's Bounty Vitamin C 1000 mg",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Thorne",
        productName: "Vitamin C with Flavonoids",
        dose: "500 mg + 250 mg citrus bioflavonoids per capsule",
        approxPrice: "$20–25",
        why: "Bioflavonoid pairing may improve absorption/retention. NSF-certified.",
        asin: null,
        amazonSearchQuery: "Thorne Vitamin C with Flavonoids",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "NOW Foods",
        productName: "Vitamin C-1000 with Rose Hips",
        dose: "1,000 mg per tablet",
        approxPrice: "$12–18",
        why: "Great price, recognizable brand, easy daily dose. Split between morning and evening if GI is sensitive.",
        asin: null,
        amazonSearchQuery: "NOW Foods Vitamin C-1000 Rose Hips",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal:
          "Vitamin C is rarely needed as a supplement if your diet includes fruits/vegetables — pair with non-heme iron foods if you're working on ferritin.",
        maintenance:
          "Vitamin C is rarely needed as a supplement if your diet includes fruits/vegetables — pair with non-heme iron foods if you're working on ferritin.",
        priority:
          "Vitamin C is rarely needed as a supplement if your diet includes fruits/vegetables — pair with non-heme iron foods if you're working on ferritin.",
        unknown:
          "Vitamin C isn't on standard panels. A modest 500–1,000 mg/day is low-risk; it's most useful alongside iron repletion.",
      },
    },
  },

  vitamin_k2: {
    presetId: "vitamin_k2",
    displayName: "Vitamin K2 (MK-7)",
    category: "vitamin",
    overview:
      "K2 helps direct calcium into bone rather than arteries — most often paired with vitamin D3. MK-7 form has the longest half-life.",
    caution:
      "Interferes with warfarin. If you're on an anticoagulant, talk to your clinician first.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "NOW Foods",
        productName: "MK-7 Vitamin K2 100 mcg",
        dose: "100 mcg MK-7 per softgel",
        approxPrice: "$10–15",
        why: "Standard MK-7 dose at a friendly price.",
        asin: null,
        amazonSearchQuery: "NOW Foods MK-7 Vitamin K2 100 mcg",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Life Extension",
        productName: "Super K with Advanced K2 Complex",
        dose: "MK-4 + MK-7 + K1 blend",
        approxPrice: "$25–35",
        why: "Broader K-vitamer coverage — for people wanting the full spectrum alongside D3.",
        asin: null,
        amazonSearchQuery: "Life Extension Super K Advanced K2",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Sports Research",
        productName: "Vitamin D3 + K2 (MK-7)",
        dose: "5,000 IU D3 + 100 mcg MK-7",
        approxPrice: "$20–25",
        why: "Most people benefit from D3+K2 together — this bundle saves a pill without cutting corners.",
        asin: "B07NXW4GW7",
      },
    },
    labAwareness: {
      biomarker: "Vitamin D",
      biomarkerAliases: ["25-OH Vitamin D"],
      notes: {
        optimal:
          "If you're supplementing vitamin D3, pairing with K2 is a sensible default. On its own, K2 is not a priority.",
        maintenance:
          "If you're supplementing vitamin D3, pairing with K2 is a sensible default. On its own, K2 is not a priority.",
        priority:
          "Since your vitamin D is low and you're adding D3, a combo D3+K2 product is the simplest path.",
        unknown:
          "K2 is usually paired with D3. Start with D3 after labs — add K2 if you land on a higher daily dose.",
      },
    },
  },

  coq10: {
    presetId: "coq10",
    displayName: "CoQ10 / Ubiquinol",
    category: "other",
    overview:
      "CoQ10 is most commonly supplemented by people on statins (which deplete it) or in their 40s+ as mitochondrial support tapers. Ubiquinol is the active, better-absorbed form.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Doctor's Best",
        productName: "High Absorption CoQ10 with BioPerine 200 mg",
        dose: "200 mg ubiquinone per softgel",
        approxPrice: "$20–30",
        why: "Strong value on the ubiquinone form; BioPerine helps absorption.",
        asin: null,
        amazonSearchQuery: "Doctor's Best High Absorption CoQ10 200 mg BioPerine",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Qunol",
        productName: "Mega CoQ10 Ubiquinol 100 mg",
        dose: "100 mg ubiquinol per softgel",
        approxPrice: "$30–40",
        why: "Active ubiquinol form, water-dispersible carrier — easier to absorb, especially over 40.",
        asin: null,
        amazonSearchQuery: "Qunol Mega CoQ10 Ubiquinol 100 mg",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Jarrow Formulas",
        productName: "QH-absorb Ubiquinol 100 mg",
        dose: "100 mg ubiquinol per softgel",
        approxPrice: "$35–45",
        why: "One of the longest-standing, best-regarded ubiquinol products — third-party tested.",
        asin: null,
        amazonSearchQuery: "Jarrow Formulas QH-absorb Ubiquinol 100 mg",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "CoQ10 isn't a lab-led supplement — consider it if you're on a statin or over ~40 and training hard.",
        maintenance: "CoQ10 isn't a lab-led supplement — consider it if you're on a statin or over ~40 and training hard.",
        priority: "CoQ10 isn't a lab-led supplement — consider it if you're on a statin or over ~40 and training hard.",
        unknown: "CoQ10 is low-risk at 100 mg/day. Most helpful on statins or after age ~40.",
      },
    },
  },

  creatine: {
    presetId: "creatine",
    displayName: "Creatine Monohydrate",
    category: "amino",
    overview:
      "Creatine is the most-studied performance supplement, with growing evidence for cognition and mood too. 3–5 g/day of plain monohydrate is the whole protocol — forget 'advanced' forms.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Nutricost",
        productName: "Creatine Monohydrate Powder",
        dose: "5 g per scoop",
        approxPrice: "$20–30 (1 kg)",
        why: "Micronized monohydrate at one of the lowest $/g rates on Amazon.",
        asin: null,
        amazonSearchQuery: "Nutricost Creatine Monohydrate Micronized",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Thorne",
        productName: "Creatine (Creapure)",
        dose: "5 g per scoop",
        approxPrice: "$35–45",
        why: "NSF-certified Creapure — the third-party-tested choice for competitive athletes.",
        asin: null,
        amazonSearchQuery: "Thorne Creatine Creapure",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Momentous",
        productName: "Creatine (Creapure)",
        dose: "5 g per scoop",
        approxPrice: "$40–50",
        why: "NSF + Informed Sport certified Creapure — the purity bar most coaches use.",
        asin: null,
        amazonSearchQuery: "Momentous Creatine Creapure",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "Creatine is a performance/cognition supplement, not a lab-driven one — 3–5 g/day is the whole story.",
        maintenance: "Creatine is a performance/cognition supplement, not a lab-driven one — 3–5 g/day is the whole story.",
        priority: "Creatine is a performance/cognition supplement, not a lab-driven one — 3–5 g/day is the whole story.",
        unknown: "Creatine is one of the safest, best-evidenced supplements available for most adults.",
      },
    },
  },

  protein_powder: {
    presetId: "protein_powder",
    displayName: "Protein Powder",
    category: "amino",
    overview:
      "Protein powder is a convenience tool, not a supplement — the goal is hitting ~0.7–1 g protein per pound of target bodyweight per day.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "NOW Sports",
        productName: "Whey Protein Isolate Unflavored",
        dose: "25 g protein per scoop",
        approxPrice: "$35–45",
        why: "Clean WPI, Informed-Sport certified, minimal ingredients — a workhorse.",
        asin: null,
        amazonSearchQuery: "NOW Sports Whey Protein Isolate Unflavored",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Momentous",
        productName: "Whey Protein Isolate (Grass-Fed)",
        dose: "20 g protein per scoop",
        approxPrice: "$55–65",
        why: "NSF Certified for Sport; grass-fed WPI — what many coaches use with high-level athletes.",
        asin: null,
        amazonSearchQuery: "Momentous Whey Protein Isolate Grass Fed",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Optimum Nutrition",
        productName: "Gold Standard 100% Whey",
        dose: "24 g protein per scoop",
        approxPrice: "$40–60",
        why: "The default people actually stick with — widely available, mixes clean, reasonable price.",
        asin: null,
        amazonSearchQuery: "Optimum Nutrition Gold Standard 100% Whey",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "Protein powder is a food tool — pick based on taste and your daily protein target.",
        maintenance: "Protein powder is a food tool — pick based on taste and your daily protein target.",
        priority: "Protein powder is a food tool — pick based on taste and your daily protein target.",
        unknown: "Aim for ~0.7–1 g protein per pound of target bodyweight. Powder is the easiest way to close a gap.",
      },
    },
  },

  probiotic: {
    presetId: "probiotic",
    displayName: "Probiotic",
    category: "probiotic",
    overview:
      "Probiotics are strain-specific — the label 'probiotic' isn't generic. Best evidence is for specific strains for specific issues (e.g. Lactobacillus rhamnosus GG for traveler's diarrhea).",
    caution:
      "If you're immunocompromised, have a central line, or are critically ill, talk to a clinician before starting probiotics.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Culturelle",
        productName: "Daily Probiotic (Lactobacillus rhamnosus GG)",
        dose: "10 billion CFU per capsule",
        approxPrice: "$20–25",
        why: "Single-strain LGG — one of the most-studied probiotics, decades of human data.",
        asin: null,
        amazonSearchQuery: "Culturelle Daily Probiotic Lactobacillus rhamnosus GG",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Seed",
        productName: "DS-01 Daily Synbiotic",
        dose: "53.6 billion AFU per 2 capsules, 24 strains",
        approxPrice: "$45–55",
        why: "Multi-strain synbiotic with a prebiotic — higher CFU and broader coverage; stocked on Amazon and direct.",
        asin: null,
        amazonSearchQuery: "Seed DS-01 Daily Synbiotic",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Garden of Life",
        productName: "Raw Probiotics Ultimate Care",
        dose: "100 billion CFU, 34 strains per capsule",
        approxPrice: "$40–50",
        why: "Higher CFU and broad-spectrum; reasonable price for a multi-strain daily.",
        asin: null,
        amazonSearchQuery: "Garden of Life Raw Probiotics Ultimate Care",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal:
          "Probiotics are most useful for a specific goal (post-antibiotic, IBS-D, traveler's diarrhea). If nothing feels off, diet (fiber + fermented foods) probably beats a capsule.",
        maintenance:
          "Probiotics are most useful for a specific goal (post-antibiotic, IBS-D, traveler's diarrhea). If nothing feels off, diet (fiber + fermented foods) probably beats a capsule.",
        priority:
          "Probiotics are most useful for a specific goal (post-antibiotic, IBS-D, traveler's diarrhea). If nothing feels off, diet (fiber + fermented foods) probably beats a capsule.",
        unknown:
          "No standard lab for probiotics. Evidence is strongest for specific strains matched to a specific goal.",
      },
    },
  },

  collagen: {
    presetId: "collagen",
    displayName: "Collagen Peptides",
    category: "other",
    overview:
      "Collagen is just amino acids; the body doesn't route it specifically to skin or joints. Evidence for cosmetic/joint benefits is modest — main wins come from hitting daily protein targets.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Sports Research",
        productName: "Collagen Peptides (Grass-Fed)",
        dose: "11 g per scoop",
        approxPrice: "$25–35",
        why: "Unflavored, dissolves clean in coffee, IGEN non-GMO tested.",
        asin: null,
        amazonSearchQuery: "Sports Research Collagen Peptides Grass Fed",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Vital Proteins",
        productName: "Collagen Peptides (Grass-Fed, 24 oz)",
        dose: "20 g per 2 scoops",
        approxPrice: "$45–55",
        why: "Widely recognized, high per-scoop protein; pair with vitamin C for potential synthesis benefit.",
        asin: null,
        amazonSearchQuery: "Vital Proteins Collagen Peptides Grass Fed 24 oz",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Ancient Nutrition",
        productName: "Multi Collagen Protein",
        dose: "9 g per scoop, types I/II/III/V/X",
        approxPrice: "$30–40",
        why: "Multi-source (marine + bovine + chicken + eggshell), broad amino profile, dissolves well.",
        asin: null,
        amazonSearchQuery: "Ancient Nutrition Multi Collagen Protein",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "Collagen is a convenience protein source — helpful for daily protein totals, mild joint/cosmetic benefit.",
        maintenance: "Collagen is a convenience protein source — helpful for daily protein totals, mild joint/cosmetic benefit.",
        priority: "Collagen is a convenience protein source — helpful for daily protein totals, mild joint/cosmetic benefit.",
        unknown: "No lab directly tracks this. Low-risk; treat it as a protein source with a possible small joint/skin upside.",
      },
    },
  },

  ashwagandha: {
    presetId: "ashwagandha",
    displayName: "Ashwagandha",
    category: "other",
    overview:
      "Ashwagandha is an adaptogen with decent short-term evidence for perceived stress and sleep. Best studied extracts are KSM-66 and Sensoril.",
    caution:
      "Avoid in pregnancy. Can interact with thyroid medications and immunosuppressants. Rare but reported liver effects — stop and check in if you notice GI or jaundice symptoms.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "NOW Foods",
        productName: "Ashwagandha 450 mg (Extract)",
        dose: "450 mg standardized extract",
        approxPrice: "$10–15",
        why: "Simple standardized extract at a friendly price — good starting point.",
        asin: null,
        amazonSearchQuery: "NOW Foods Ashwagandha Extract 450 mg",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Nutricost",
        productName: "KSM-66 Ashwagandha 600 mg",
        dose: "600 mg KSM-66 extract per capsule",
        approxPrice: "$20–25",
        why: "KSM-66 at the upper end of studied doses — consistent supply from a reputable brand.",
        asin: null,
        amazonSearchQuery: "Nutricost KSM-66 Ashwagandha 600 mg",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Sports Research",
        productName: "Ashwagandha KSM-66",
        dose: "600 mg KSM-66 (2 caps)",
        approxPrice: "$20–25",
        why: "KSM-66 is the most-studied extract. Sports Research is Informed-Sport tested — clean label.",
        asin: null,
        amazonSearchQuery: "Sports Research Ashwagandha KSM-66",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "Ashwagandha is for perceived-stress or sleep goals, not lab optimization.",
        maintenance: "Ashwagandha is for perceived-stress or sleep goals, not lab optimization.",
        priority: "Ashwagandha is for perceived-stress or sleep goals, not lab optimization.",
        unknown: "No direct lab. Low-risk short-term for most adults — avoid in pregnancy or with thyroid meds.",
      },
    },
  },

  nac: {
    presetId: "nac",
    displayName: "NAC (N-Acetylcysteine)",
    category: "other",
    overview:
      "NAC is a glutathione precursor studied for liver support, respiratory mucus thinning, and antioxidant pathways. Evidence is strongest in clinical/hospital settings.",
    caution:
      "Sulfurous taste/smell is normal. Can interact with some medications; stop 2 weeks before surgery.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "NOW Foods",
        productName: "NAC 600 mg",
        dose: "600 mg per capsule",
        approxPrice: "$15–20",
        why: "Standard dose at a fair price — good entry point.",
        asin: null,
        amazonSearchQuery: "NOW Foods NAC 600 mg",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Jarrow Formulas",
        productName: "NAC Sustain 600 mg",
        dose: "600 mg sustained-release per tablet",
        approxPrice: "$20–25",
        why: "Sustained-release helps with the sulfur burp profile — easier to stick with.",
        asin: null,
        amazonSearchQuery: "Jarrow Formulas NAC Sustain 600 mg",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Thorne",
        productName: "NAC 500 mg (Cysteplus)",
        dose: "500 mg per capsule",
        approxPrice: "$25–35",
        why: "NSF-certified, well tolerated, clean label — the default for long-term daily use.",
        asin: null,
        amazonSearchQuery: "Thorne NAC 500 mg Cysteplus",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "NAC is used for specific goals (mucus/respiratory, liver enzymes, PCOS) — not a generic wellness supplement.",
        maintenance: "NAC is used for specific goals (mucus/respiratory, liver enzymes, PCOS) — not a generic wellness supplement.",
        priority: "NAC is used for specific goals (mucus/respiratory, liver enzymes, PCOS) — not a generic wellness supplement.",
        unknown: "NAC isn't on a standard panel. Most relevant when there's a specific goal — otherwise a multivitamin + protein target is more fundamental.",
      },
    },
  },

  electrolytes: {
    presetId: "electrolytes",
    displayName: "Electrolytes",
    category: "mineral",
    overview:
      "Electrolyte mixes replace sodium, potassium, and magnesium lost in sweat. Most useful during heat, endurance exercise, or when low-carb/fasting.",
    caution:
      "If you have hypertension, kidney disease, or are on ACE-inhibitors/potassium-sparing diuretics, check doses with your clinician — especially sodium and potassium.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "LMNT",
        productName: "Recharge Electrolytes (Bulk Box)",
        dose: "1,000 mg Na + 200 mg K + 60 mg Mg per stick",
        approxPrice: "$45 / 30 sticks",
        why: "Clean label, high sodium (which is the point), no sugar — the default for training or heat.",
        asin: null,
        amazonSearchQuery: "LMNT Recharge Electrolytes",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Liquid I.V.",
        productName: "Hydration Multiplier Energy",
        dose: "500 mg Na + 380 mg K per stick",
        approxPrice: "$20–30",
        why: "Higher potassium, sugar-sweetened (helps glucose co-transport). Closer to a sports-drink profile.",
        asin: null,
        amazonSearchQuery: "Liquid IV Hydration Multiplier",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "LMNT",
        productName: "Recharge Electrolytes (Variety)",
        dose: "1,000 mg Na + 200 mg K + 60 mg Mg per stick",
        approxPrice: "$20–25 / 12 sticks",
        why: "High-sodium, sugar-free mix most athletes and low-carb folks land on. Try before committing to bulk.",
        asin: null,
        amazonSearchQuery: "LMNT Electrolytes Variety Pack",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "Electrolytes are a training/heat/fasting tool, not a daily must-have.",
        maintenance: "Electrolytes are a training/heat/fasting tool, not a daily must-have.",
        priority: "Electrolytes are a training/heat/fasting tool, not a daily must-have.",
        unknown: "Useful on heavy-sweat days or low-carb. Watch sodium if you have BP issues.",
      },
    },
  },

  l_theanine: {
    presetId: "l_theanine",
    displayName: "L-Theanine",
    category: "amino",
    overview:
      "L-theanine is an amino acid from tea. Produces calm-focus (often paired with caffeine) without sedation. 100–200 mg is the standard dose.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "NOW Foods",
        productName: "L-Theanine 200 mg",
        dose: "200 mg per capsule",
        approxPrice: "$15–20",
        why: "Clean SunTheanine (branded) at a friendly price.",
        asin: null,
        amazonSearchQuery: "NOW Foods L-Theanine 200 mg SunTheanine",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Sports Research",
        productName: "L-Theanine 200 mg (Suntheanine)",
        dose: "200 mg Suntheanine per softgel",
        approxPrice: "$20–25",
        why: "Informed-Sport certified Suntheanine — athlete-safe.",
        asin: null,
        amazonSearchQuery: "Sports Research L-Theanine Suntheanine 200 mg",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Jarrow Formulas",
        productName: "Theanine 200 mg",
        dose: "200 mg Suntheanine per capsule",
        approxPrice: "$15–20",
        why: "Longstanding Suntheanine pick; widely stocked; great for stacking with morning caffeine.",
        asin: null,
        amazonSearchQuery: "Jarrow Formulas Theanine 200 mg",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "L-theanine is a low-risk calm-focus tool, especially paired with caffeine — not a lab-driven supplement.",
        maintenance: "L-theanine is a low-risk calm-focus tool, especially paired with caffeine — not a lab-driven supplement.",
        priority: "L-theanine is a low-risk calm-focus tool, especially paired with caffeine — not a lab-driven supplement.",
        unknown: "No lab directly tracks this. Low-risk; best use is with your morning coffee.",
      },
    },
  },

  b_complex: {
    presetId: "b_complex",
    displayName: "B-Complex",
    category: "vitamin",
    overview:
      "A good B-complex covers eight water-soluble B vitamins at once. Useful for people with poor diet quality, vegans/vegetarians, or high training loads. Use active (methyl) forms when you can.",
    caution:
      "High doses of pyridoxine (B6) — consistently above 50–100 mg/day — can cause neuropathy. Pick a product with B6 ≤ 50 mg for daily use.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Nature Made",
        productName: "Super B-Complex",
        dose: "Standard B1–B12 coverage per tablet",
        approxPrice: "$10–15",
        why: "USP verified, reliably meets label claims, drugstore pricing.",
        asin: null,
        amazonSearchQuery: "Nature Made Super B Complex USP Verified",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Thorne",
        productName: "Basic B Complex",
        dose: "Active-form Bs, B6 at 10 mg (safe long-term)",
        approxPrice: "$25–35",
        why: "Methylated Bs and safer B6 dosing — what most functional-medicine protocols use.",
        asin: null,
        amazonSearchQuery: "Thorne Basic B Complex",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Jarrow Formulas",
        productName: "B-Right B Complex",
        dose: "Active-form Bs, balanced dosing",
        approxPrice: "$15–20",
        why: "Longstanding methylated B-complex at a reasonable price — very common recommendation.",
        asin: null,
        amazonSearchQuery: "Jarrow B-Right B Complex",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "A B-complex is an insurance policy — most helpful if diet is inconsistent or you train hard.",
        maintenance: "A B-complex is an insurance policy — most helpful if diet is inconsistent or you train hard.",
        priority: "A B-complex is an insurance policy — most helpful if diet is inconsistent or you train hard.",
        unknown: "No specific lab tracks this. Low-risk daily — pick one with B6 ≤ 50 mg and B12 in the active (methyl) form.",
      },
    },
  },

  biotin: {
    presetId: "biotin",
    displayName: "Biotin (B7)",
    category: "vitamin",
    overview:
      "Biotin is often marketed for hair, skin, and nails. True deficiency is rare, and most trials are underpowered. Usually unnecessary unless you have a diagnosed deficiency.",
    caution:
      "High-dose biotin (> 5,000 mcg) can interfere with thyroid, troponin, and hormone lab tests — tell your provider if you're supplementing.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Nature's Bounty",
        productName: "Biotin 1,000 mcg",
        dose: "1,000 mcg per softgel",
        approxPrice: "$8–12",
        why: "Conservative dose (enough for most adults); cheap enough not to feel wasteful.",
        asin: null,
        amazonSearchQuery: "Nature's Bounty Biotin 1000 mcg",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "NOW Foods",
        productName: "Biotin 5,000 mcg",
        dose: "5,000 mcg per capsule",
        approxPrice: "$10–15",
        why: "Upper end of what's commonly sold — stop 2 days before blood draws to avoid assay interference.",
        asin: null,
        amazonSearchQuery: "NOW Foods Biotin 5000 mcg",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Nutricost",
        productName: "Biotin 1,000 mcg",
        dose: "1,000 mcg per capsule",
        approxPrice: "$8–12",
        why: "Conservative dose, clean label. If you're buying biotin, start here — megadoses rarely add benefit.",
        asin: null,
        amazonSearchQuery: "Nutricost Biotin 1000 mcg",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "Biotin deficiency is rare. Unless hair/nail issues are severe and persistent, a multivitamin covers your need.",
        maintenance: "Biotin deficiency is rare. Unless hair/nail issues are severe and persistent, a multivitamin covers your need.",
        priority: "Biotin deficiency is rare. Unless hair/nail issues are severe and persistent, a multivitamin covers your need.",
        unknown: "Low-risk at conservative doses. If you're going to test hormones or thyroid, pause biotin 2 days before.",
      },
    },
  },

  vitamin_e: {
    presetId: "vitamin_e",
    displayName: "Vitamin E",
    category: "vitamin",
    overview:
      "Vitamin E is a fat-soluble antioxidant. Most adults get enough from diet. High-dose supplementation has been linked to mixed outcomes and bleeding risk — treat this as food-first.",
    caution:
      "Can increase bleeding risk — caution with anticoagulants and before surgery. Avoid doses > 400 IU/day long-term without clinician input.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Nature Made",
        productName: "Vitamin E 180 mg (400 IU)",
        dose: "180 mg (400 IU) dl-alpha-tocopherol",
        approxPrice: "$10–15",
        why: "USP verified; conservative mainstream option.",
        asin: null,
        amazonSearchQuery: "Nature Made Vitamin E 400 IU USP",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "NOW Foods",
        productName: "Natural E-400 Mixed Tocopherols",
        dose: "400 IU mixed tocopherols per softgel",
        approxPrice: "$15–20",
        why: "Mixed-tocopherol form (closer to food); natural d-alpha source.",
        asin: null,
        amazonSearchQuery: "NOW Foods Natural E-400 Mixed Tocopherols",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Pure Encapsulations",
        productName: "Vitamin E (Mixed Tocopherols) 400 IU",
        dose: "400 IU mixed tocopherols",
        approxPrice: "$20–30",
        why: "Hypoallergenic, mixed tocopherols, clean label. Most thoughtful pick if you're going to supplement E.",
        asin: null,
        amazonSearchQuery: "Pure Encapsulations Vitamin E Mixed Tocopherols",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "Vitamin E is best earned through food (nuts, seeds, leafy greens). Supplementation is rarely a priority.",
        maintenance: "Vitamin E is best earned through food (nuts, seeds, leafy greens). Supplementation is rarely a priority.",
        priority: "Vitamin E is best earned through food (nuts, seeds, leafy greens). Supplementation is rarely a priority.",
        unknown: "No standard lab tracks this. Food-first is the cleanest path.",
      },
    },
  },

  calcium: {
    presetId: "calcium",
    displayName: "Calcium",
    category: "mineral",
    overview:
      "Calcium is critical for bone and muscle. Food is the best delivery mechanism. Supplementation makes sense when diet is clearly low (e.g. non-dairy, minimal leafy greens/fortified foods).",
    caution:
      "Calcium supplements have been associated with cardiovascular concerns at high doses in some studies. Don't exceed 1,000 mg/day from supplements, and always take with vitamin K2 + D3 context.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Citracal",
        productName: "Calcium Citrate + D3",
        dose: "500 mg calcium + 500 IU D3 per 2 caplets",
        approxPrice: "$12–18",
        why: "Citrate form absorbs with or without food — easier on the stomach than carbonate.",
        asin: null,
        amazonSearchQuery: "Citracal Calcium Citrate Plus D3",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Bluebonnet",
        productName: "Calcium Citrate Magnesium Plus Vitamin D3",
        dose: "500 mg Ca + 200 mg Mg + 400 IU D3",
        approxPrice: "$20–30",
        why: "Higher-dose combo that also includes magnesium — the nutrient most often deficient alongside calcium.",
        asin: null,
        amazonSearchQuery: "Bluebonnet Calcium Citrate Magnesium Vitamin D3",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "NOW Foods",
        productName: "Calcium & Magnesium with Vitamin D3 and Zinc",
        dose: "500 mg Ca + 250 mg Mg + 400 IU D3 per 2 tablets",
        approxPrice: "$15–20",
        why: "Balanced Ca/Mg ratio, vitamin D included — the pattern most clinicians prefer.",
        asin: null,
        amazonSearchQuery: "NOW Foods Calcium Magnesium Vitamin D3 Zinc",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal:
          "Calcium is best from food — dairy, fortified foods, leafy greens. Don't supplement unless your diet is clearly low.",
        maintenance:
          "Calcium is best from food — dairy, fortified foods, leafy greens. Don't supplement unless your diet is clearly low.",
        priority:
          "Calcium is best from food — dairy, fortified foods, leafy greens. Don't supplement unless your diet is clearly low.",
        unknown:
          "Serum calcium rarely reflects intake. If you don't eat dairy/greens, 500 mg with D3 is reasonable.",
      },
    },
  },

  potassium: {
    presetId: "potassium",
    displayName: "Potassium",
    category: "mineral",
    overview:
      "Most adults get less than half the recommended potassium (4,700 mg/day). OTC supplements are capped at 99 mg/serving — the real move is food (bananas, potatoes, beans, leafy greens).",
    caution:
      "Do NOT supplement potassium beyond OTC doses without clinician input, especially if you have kidney issues, are on ACE-inhibitors, ARBs, or potassium-sparing diuretics.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "NOW Foods",
        productName: "Potassium Chloride 99 mg",
        dose: "99 mg per capsule",
        approxPrice: "$8–12",
        why: "OTC cap — useful as a small boost alongside a potassium-rich diet.",
        asin: null,
        amazonSearchQuery: "NOW Foods Potassium Chloride 99 mg",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "LMNT",
        productName: "Recharge Electrolytes (200 mg K+/stick)",
        dose: "200 mg potassium per stick",
        approxPrice: "$45 / 30 sticks",
        why: "Electrolyte stick packs deliver more potassium per serving than a capsule — and the sodium helps retention.",
        asin: null,
        amazonSearchQuery: "LMNT Recharge Electrolytes",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Nu-Salt or Morton Lite Salt",
        productName: "Potassium Salt Substitute",
        dose: "~500 mg potassium per 1/4 tsp",
        approxPrice: "$5–10",
        why: "The cheapest, highest-leverage way to raise potassium is a salt substitute — used as you would normal salt.",
        asin: null,
        amazonSearchQuery: "Morton Lite Salt Potassium",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "Potassium is a food-first fix — bananas, potatoes, beans, leafy greens. Capsules are capped too low to matter much.",
        maintenance: "Potassium is a food-first fix — bananas, potatoes, beans, leafy greens. Capsules are capped too low to matter much.",
        priority: "If a lab flags low potassium, don't self-supplement — that's a clinician conversation. Focus on food.",
        unknown: "Low-risk to add food sources; be cautious with supplements if you have any kidney disease or on ACE/ARB meds.",
      },
    },
  },

  selenium: {
    presetId: "selenium",
    displayName: "Selenium",
    category: "mineral",
    overview:
      "Selenium supports thyroid function and antioxidant pathways. 2 Brazil nuts per day cover the daily need — most Americans are not deficient.",
    caution:
      "UL is 400 mcg/day; selenium toxicity (hair loss, GI issues, brittle nails) happens fastest with supplements. Don't stack multiple products containing selenium.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "NOW Foods",
        productName: "Selenium 200 mcg",
        dose: "200 mcg selenomethionine per tablet",
        approxPrice: "$8–12",
        why: "Selenomethionine form absorbs well; standard daily dose.",
        asin: null,
        amazonSearchQuery: "NOW Foods Selenium 200 mcg",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Thorne",
        productName: "Selenomethionine 200 mcg",
        dose: "200 mcg selenomethionine per capsule",
        approxPrice: "$15–20",
        why: "NSF-certified selenomethionine; the pick when used in thyroid/Hashimoto's protocols.",
        asin: null,
        amazonSearchQuery: "Thorne Selenomethionine 200 mcg",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Pure Encapsulations",
        productName: "Selenium 200 mcg (Selenomethionine)",
        dose: "200 mcg per capsule",
        approxPrice: "$15–25",
        why: "Hypoallergenic, clean label — most popular clinician pick for short-course use.",
        asin: null,
        amazonSearchQuery: "Pure Encapsulations Selenium 200 mcg",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "Selenium is rarely deficient in the US. Unless you're in a thyroid protocol, two Brazil nuts a day beats a capsule.",
        maintenance: "Selenium is rarely deficient in the US. Unless you're in a thyroid protocol, two Brazil nuts a day beats a capsule.",
        priority: "Selenium supplementation is usually clinician-led (thyroid context). Don't megadose on your own.",
        unknown: "No standard panel tracks this. Short-term use (200 mcg/day, < 3 months) is low-risk for most adults.",
      },
    },
  },

  iodine: {
    presetId: "iodine",
    displayName: "Iodine",
    category: "mineral",
    overview:
      "Iodine is critical for thyroid function. Most people on a Western diet get enough from iodized salt, dairy, and seafood. Supplementation is mainly for pregnancy, or people avoiding iodized salt.",
    caution:
      "Too much iodine can trigger thyroid issues (especially Hashimoto's or existing nodules). Don't take high-dose iodine (kelp/iodoral) without clinician input.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Nature's Bounty",
        productName: "Iodine from Kelp 150 mcg",
        dose: "150 mcg per softgel",
        approxPrice: "$6–10",
        why: "Covers RDA for non-pregnant adults at low cost.",
        asin: null,
        amazonSearchQuery: "Nature's Bounty Kelp Iodine 150 mcg",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Optimox",
        productName: "Iodoral 12.5 mg",
        dose: "12.5 mg iodine/iodide per tablet",
        approxPrice: "$30–40",
        why: "High-dose Lugol's-style iodine — strictly clinician-led territory. Not for casual use.",
        asin: null,
        amazonSearchQuery: "Optimox Iodoral 12.5 mg",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Pure Encapsulations",
        productName: "Iodine & Tyrosine",
        dose: "225 mcg iodine + tyrosine per capsule",
        approxPrice: "$25–35",
        why: "Moderate dose with tyrosine pairing (both thyroid hormone precursors). Clinician favorite for sluggish thyroid presentations.",
        asin: null,
        amazonSearchQuery: "Pure Encapsulations Iodine Tyrosine",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "Iodine is handled through diet for most people. Supplement only if you avoid iodized salt and seafood.",
        maintenance: "Iodine is handled through diet for most people. Supplement only if you avoid iodized salt and seafood.",
        priority: "Iodine supplementation is tightly linked to thyroid labs — clinician-led. Don't megadose on your own.",
        unknown: "Low-dose (≤ 150 mcg) is low-risk; high-dose can trigger thyroid issues.",
      },
    },
  },

  chromium: {
    presetId: "chromium",
    displayName: "Chromium",
    category: "mineral",
    overview:
      "Chromium picolinate is studied for glycemic control, with modest and mixed results. Not a front-line intervention — lifestyle and diet win.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "NOW Foods",
        productName: "Chromium Picolinate 200 mcg",
        dose: "200 mcg per capsule",
        approxPrice: "$8–12",
        why: "Standard studied dose at the lowest practical cost.",
        asin: null,
        amazonSearchQuery: "NOW Foods Chromium Picolinate 200 mcg",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Nature's Bounty",
        productName: "Chromium Picolinate 800 mcg",
        dose: "800 mcg per tablet",
        approxPrice: "$12–18",
        why: "Upper end of studied doses — used in some blood-sugar protocols.",
        asin: null,
        amazonSearchQuery: "Nature's Bounty Chromium Picolinate 800 mcg",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Thorne",
        productName: "Chromium Picolinate 500 mcg",
        dose: "500 mcg per capsule",
        approxPrice: "$15–25",
        why: "NSF-certified mid-dose — the least noisy pick for people trialing chromium alongside diet changes.",
        asin: null,
        amazonSearchQuery: "Thorne Chromium Picolinate 500 mcg",
      },
    },
    labAwareness: {
      biomarker: "HbA1c",
      biomarkerAliases: ["A1c", "Fasting Glucose", "Glucose"],
      notes: {
        optimal: "Your glycemic markers look good. Chromium isn't needed — it's only modestly useful even in elevated contexts.",
        maintenance: "Borderline glycemic markers respond much better to diet + activity than to chromium.",
        priority: "Chromium has mixed evidence for glucose control. If you're going to trial one glucose supplement, berberine has stronger data.",
        unknown: "Low-risk at standard doses. Treat it as a minor adjunct, not a primary lever.",
      },
    },
  },

  bcaa: {
    presetId: "bcaa",
    displayName: "BCAAs",
    category: "amino",
    overview:
      "BCAAs (leucine, isoleucine, valine) are usually unnecessary if you hit your daily protein target — whole protein already contains them. Occasionally useful for fasted training or plant-based athletes.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Nutricost",
        productName: "BCAA Powder (Unflavored)",
        dose: "6 g per scoop (2:1:1 ratio)",
        approxPrice: "$20–25",
        why: "Lowest cost/gram; unflavored lets you mix into water without added sweeteners.",
        asin: null,
        amazonSearchQuery: "Nutricost BCAA Powder Unflavored",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Scivation",
        productName: "Xtend Original BCAA",
        dose: "7 g BCAAs + electrolytes per scoop",
        approxPrice: "$30–40",
        why: "The BCAA most commonly used in training — includes electrolytes for intra-workout use.",
        asin: null,
        amazonSearchQuery: "Scivation Xtend Original BCAA",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Bulk Supplements",
        productName: "BCAA Powder (Unflavored)",
        dose: "5 g per serving (2:1:1)",
        approxPrice: "$15–25",
        why: "Clean, cheap, third-party tested. Honestly, most people are better off just eating more protein.",
        asin: null,
        amazonSearchQuery: "Bulk Supplements BCAA Powder",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "If you're hitting ~0.7–1 g protein per pound of bodyweight, BCAAs are redundant.",
        maintenance: "If you're hitting ~0.7–1 g protein per pound of bodyweight, BCAAs are redundant.",
        priority: "If you're hitting ~0.7–1 g protein per pound of bodyweight, BCAAs are redundant.",
        unknown: "No lab. Useful specifically for fasted training or plant-based athletes. Otherwise, food beats this.",
      },
    },
  },

  glutamine: {
    presetId: "glutamine",
    displayName: "L-Glutamine",
    category: "amino",
    overview:
      "L-glutamine is a popular gut-support and recovery amino. Evidence is strongest in critical-illness settings; recreational use benefit is small-to-modest.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Nutricost",
        productName: "L-Glutamine Powder",
        dose: "5 g per scoop",
        approxPrice: "$15–20",
        why: "Lowest cost per gram; mixes cleanly into water.",
        asin: null,
        amazonSearchQuery: "Nutricost L-Glutamine Powder",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Thorne",
        productName: "L-Glutamine Powder",
        dose: "5 g per scoop",
        approxPrice: "$35–45",
        why: "NSF-certified; clinician favorite for gut protocols (e.g. post-antibiotic, IBS-D work).",
        asin: null,
        amazonSearchQuery: "Thorne L-Glutamine Powder",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Designs for Health",
        productName: "GI Revive or Glutamine Powder",
        dose: "5 g glutamine per scoop",
        approxPrice: "$30–40",
        why: "Clinician-grade; use as part of a gut repair protocol rather than daily recovery.",
        asin: null,
        amazonSearchQuery: "Designs for Health L-Glutamine Powder",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "L-glutamine is a targeted gut-support amino. Rarely useful for general recovery.",
        maintenance: "L-glutamine is a targeted gut-support amino. Rarely useful for general recovery.",
        priority: "L-glutamine is a targeted gut-support amino. Rarely useful for general recovery.",
        unknown: "No lab. Low-risk daily. Most useful after antibiotics or for GI protocols.",
      },
    },
  },

  beta_alanine: {
    presetId: "beta_alanine",
    displayName: "Beta-Alanine",
    category: "amino",
    overview:
      "Beta-alanine raises muscle carnosine, buffering acid during high-intensity efforts lasting 1–4 minutes. Real but modest performance effect. Expect tingles (paresthesia) — harmless.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Nutricost",
        productName: "Beta-Alanine Powder",
        dose: "3–5 g per scoop",
        approxPrice: "$15–20",
        why: "Lowest cost, unflavored, IFOS-style third-party testing.",
        asin: null,
        amazonSearchQuery: "Nutricost Beta-Alanine Powder",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Optimum Nutrition",
        productName: "CarnoSyn Beta-Alanine",
        dose: "3 g CarnoSyn per scoop",
        approxPrice: "$25–35",
        why: "Branded CarnoSyn is the form used in most performance trials.",
        asin: null,
        amazonSearchQuery: "Optimum Nutrition CarnoSyn Beta-Alanine",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Bulk Supplements",
        productName: "CarnoSyn Beta-Alanine",
        dose: "3.2 g per scoop",
        approxPrice: "$20–25",
        why: "CarnoSyn form at a fair price — the most-used performance dose.",
        asin: null,
        amazonSearchQuery: "Bulk Supplements CarnoSyn Beta-Alanine",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "Beta-alanine is a performance supplement, not a lab-driven one.",
        maintenance: "Beta-alanine is a performance supplement, not a lab-driven one.",
        priority: "Beta-alanine is a performance supplement, not a lab-driven one.",
        unknown: "No lab. Useful specifically for high-intensity 1–4 minute efforts. Split daily dose to reduce tingling.",
      },
    },
  },

  citrulline: {
    presetId: "citrulline",
    displayName: "L-Citrulline / Citrulline Malate",
    category: "amino",
    overview:
      "Citrulline raises plasma arginine and supports nitric-oxide production, with modest evidence for high-rep muscular endurance. Typical dose: 6–8 g of citrulline malate (or 3–5 g L-citrulline) pre-workout.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Nutricost",
        productName: "Citrulline Malate 2:1 Powder",
        dose: "6 g per scoop",
        approxPrice: "$15–20",
        why: "Lowest cost/gram in the 2:1 form; unflavored.",
        asin: null,
        amazonSearchQuery: "Nutricost Citrulline Malate 2:1 Powder",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Bulk Supplements",
        productName: "L-Citrulline Powder (Pure)",
        dose: "3–5 g per scoop",
        approxPrice: "$20–30",
        why: "Pure L-citrulline — slightly higher per-gram effect than malate form.",
        asin: null,
        amazonSearchQuery: "Bulk Supplements L-Citrulline Powder",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Thorne",
        productName: "NiaCel or pure L-Citrulline",
        dose: "3 g L-citrulline per scoop",
        approxPrice: "$30–40",
        why: "NSF-certified; the clinician/coach pick when pre-workout purity matters.",
        asin: null,
        amazonSearchQuery: "Thorne L-Citrulline",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "Citrulline is a pre-workout endurance tool, not a lab-driven supplement.",
        maintenance: "Citrulline is a pre-workout endurance tool, not a lab-driven supplement.",
        priority: "Citrulline is a pre-workout endurance tool, not a lab-driven supplement.",
        unknown: "Low-risk at standard doses. Take 30–60 min before training.",
      },
    },
  },

  prenatal: {
    presetId: "prenatal",
    displayName: "Prenatal Multivitamin",
    category: "vitamin",
    overview:
      "Prenatals cover the nutrients that matter most in preconception and pregnancy: folate (ideally as methylfolate), iron, choline, iodine, DHA, vitamin D. Start before conception when possible.",
    caution:
      "Always choose a prenatal with methylated folate (not just folic acid), iron, iodine, choline, and DHA. Talk to your OB about product choice — especially if you have MTHFR variants or PCOS.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "One A Day",
        productName: "Women's Prenatal 1 + DHA",
        dose: "1 softgel + 1 tablet daily",
        approxPrice: "$15–20",
        why: "Drugstore reliable; covers the basics for most non-MTHFR pregnancies.",
        asin: null,
        amazonSearchQuery: "One A Day Women's Prenatal 1 DHA",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Seeking Health",
        productName: "Optimal Prenatal",
        dose: "8 capsules daily",
        approxPrice: "$50–65",
        why: "Methylfolate, methyl-B12, choline, iron — the most-complete prenatal on the market. Volume is the trade-off.",
        asin: null,
        amazonSearchQuery: "Seeking Health Optimal Prenatal",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Ritual",
        productName: "Essential Prenatal",
        dose: "2 capsules daily",
        approxPrice: "$40–50",
        why: "Clean label, methylfolate + choline + DHA included, 2-cap regimen — the one most women actually stick with.",
        asin: null,
        amazonSearchQuery: "Ritual Essential Prenatal",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "If you're trying to conceive, pregnant, or breastfeeding — take a prenatal daily, regardless of labs.",
        maintenance: "If you're trying to conceive, pregnant, or breastfeeding — take a prenatal daily, regardless of labs.",
        priority: "If you're trying to conceive, pregnant, or breastfeeding — take a prenatal daily, regardless of labs.",
        unknown: "Take daily when relevant. Discuss product choice with your OB, especially regarding folate form and iron.",
      },
    },
  },

  greens_powder: {
    presetId: "greens_powder",
    displayName: "Greens Powder",
    category: "other",
    overview:
      "Greens powders won't replace vegetables, but they can close a gap on low-fiber or travel days. Look for products with real nutritional data, not proprietary blends hiding in marketing.",
    caution:
      "Proprietary-blend greens powders with big herb lists can interact with medications. Stick to simpler formulas.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Amazing Grass",
        productName: "Green Superfood Original",
        dose: "1 scoop (~7 g) daily",
        approxPrice: "$20–30",
        why: "Affordable starter; wheatgrass/spirulina/alfalfa base — the veggie-powder gold standard.",
        asin: null,
        amazonSearchQuery: "Amazing Grass Green Superfood Original",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Athletic Greens",
        productName: "AG1 Daily Greens",
        dose: "1 scoop (~12 g) daily",
        approxPrice: "$80–100",
        why: "Comprehensive — greens, adaptogens, pre/probiotics. Expensive, but broadly formulated.",
        asin: null,
        amazonSearchQuery: "Athletic Greens AG1",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Amazing Grass",
        productName: "Greens Blend Superfood",
        dose: "1 scoop daily",
        approxPrice: "$25–35",
        why: "Better balance of cost and ingredient transparency than premium options. Honestly, a salad is still better.",
        asin: null,
        amazonSearchQuery: "Amazing Grass Greens Blend Superfood",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "Greens powders are a gap-filler — useful on travel/low-vegetable days, not a replacement for food.",
        maintenance: "Greens powders are a gap-filler — useful on travel/low-vegetable days, not a replacement for food.",
        priority: "Greens powders are a gap-filler — useful on travel/low-vegetable days, not a replacement for food.",
        unknown: "Low-risk at standard doses. Skip products with huge proprietary blends — they're marketing, not science.",
      },
    },
  },

  melatonin: {
    presetId: "melatonin",
    displayName: "Melatonin",
    category: "other",
    overview:
      "Melatonin is a circadian cue, not a sedative. Lower doses (0.3–1 mg) often beat larger ones. Best for shift work, jet lag, or delayed sleep phase — not chronic insomnia.",
    caution:
      "Many OTC products are 3–10 mg — well above what's physiological. If sleep is a long-term issue, fix light exposure and schedule first.",
    products: {
      cheapest: {
        tier: "cheapest",
        tierLabel: "Best deal",
        brand: "Natrol",
        productName: "Melatonin 1 mg Time Release",
        dose: "1 mg time-release per tablet",
        approxPrice: "$8–12",
        why: "Low physiological dose, time-release — closer to what your body actually does overnight.",
        asin: null,
        amazonSearchQuery: "Natrol Melatonin 1 mg Time Release",
      },
      highest_potency: {
        tier: "highest_potency",
        tierLabel: "Highest potency",
        brand: "Life Extension",
        productName: "Melatonin 3 mg",
        dose: "3 mg per capsule",
        approxPrice: "$10–15",
        why: "If lower doses don't work for a specific goal (jet lag), 3 mg is the upper end most research tests.",
        asin: null,
        amazonSearchQuery: "Life Extension Melatonin 3 mg",
      },
      best_overall: {
        tier: "best_overall",
        tierLabel: "Best overall",
        brand: "Jarrow Formulas",
        productName: "Melatonin 1 mg",
        dose: "1 mg per tablet (sublingual)",
        approxPrice: "$8–12",
        why: "Sublingual 1 mg — fast onset, conservative dose. Use 30–60 min before target sleep time.",
        asin: null,
        amazonSearchQuery: "Jarrow Formulas Melatonin 1 mg Sublingual",
      },
    },
    labAwareness: {
      biomarker: null,
      notes: {
        optimal: "Melatonin is a timing tool, not a nightly sedative. Use the lowest effective dose for short periods.",
        maintenance: "Melatonin is a timing tool, not a nightly sedative. Use the lowest effective dose for short periods.",
        priority: "Melatonin is a timing tool, not a nightly sedative. Use the lowest effective dose for short periods.",
        unknown: "No lab tracks this. Fix light exposure and schedule before relying on nightly supplementation.",
      },
    },
  },
}

/** Convenience: list of preset IDs currently covered by the curated catalog. */
export function getCuratedPresetIds(): string[] {
  return Object.keys(SUPPLEMENT_SHOP_CATALOG)
}

/** Lookup a full catalog entry by preset id. */
export function getShopEntryForPreset(presetId: string): SupplementShopEntry | null {
  return SUPPLEMENT_SHOP_CATALOG[presetId] ?? null
}

/**
 * Reverse lookup: given a biomarker name (e.g. "Vitamin D", "Ferritin", "LDL-C"),
 * return the catalog entry whose `labAwareness.biomarker` matches — this is the
 * supplement Clarion would recommend when that biomarker is suboptimal.
 *
 * Used by the "Personalized picks" page to surface concrete products for any
 * biomarker that isn't already covered by the smaller `affiliateProducts.ts`
 * curation.
 */
export function getShopEntryForBiomarker(biomarkerName: string): SupplementShopEntry | null {
  if (!biomarkerName) return null
  const needle = biomarkerName.trim().toLowerCase()
  for (const entry of Object.values(SUPPLEMENT_SHOP_CATALOG)) {
    const candidates = [entry.labAwareness.biomarker, ...(entry.labAwareness.biomarkerAliases ?? [])]
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim().toLowerCase())
    if (candidates.some((c) => c === needle || needle.includes(c) || c.includes(needle))) {
      return entry
    }
  }
  return null
}
