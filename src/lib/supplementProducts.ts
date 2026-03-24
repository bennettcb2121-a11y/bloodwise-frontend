export type SupplementUnit = "mg" | "mcg" | "IU";

export type SupplementProduct = {
  id: string;
  supplementKey: string;
  productName: string;
  brand: string;
  form: string;
  activeAmountPerUnit: number;
  activeUnit: SupplementUnit;
  unitsPerBottle: number;
  priceUSD: number;
  sourceLabel: string;
  costPerActiveUnit: number; // cost per mg / mcg / IU
  costPer1000IU?: number; // only for IU products when useful
  notes?: string;
  assumptions?: string[];
  caution?: string[];
  evidenceNote?: string;
  /** For intermittent dosing (e.g. weekly vitamin D). Default 7 = daily. */
  servingsPerWeek?: number;
};

export const supplementProducts: Record<string, SupplementProduct[]> = {
  vitamin_d3: [
    {
      id: "vitd_nm_2000_90",
      supplementKey: "vitamin_d3",
      productName: "Vitamin D3 2000 IU, 90 softgels",
      brand: "Nature Made",
      form: "Softgel",
      activeAmountPerUnit: 2000,
      activeUnit: "IU",
      unitsPerBottle: 90,
      priceUSD: 9.99,
      sourceLabel: "Walmart",
      costPerActiveUnit: 9.99 / (2000 * 90),
      costPer1000IU: 0.0555,
      notes: "Common maintenance-strength daily softgel."
    },
    {
      id: "vitd_now_50000_50",
      supplementKey: "vitamin_d3",
      productName: "Vitamin D-3 50,000 IU, 50 softgels",
      brand: "NOW Foods",
      form: "Softgel",
      activeAmountPerUnit: 50000,
      activeUnit: "IU",
      unitsPerBottle: 50,
      priceUSD: 13.95,
      sourceLabel: "Walmart",
      costPerActiveUnit: 13.95 / (50000 * 50),
      costPer1000IU: 0.00558,
      notes: "Ultra-high dose; verify intended dosing frequency.",
      caution: [
        "High-potency vitamin D can exceed common maintenance dosing.",
        "Use dosing frequency appropriate to the user’s actual recommendation."
      ],
      evidenceNote: "Excluded from automated default picks; very high IU per unit."
    },
    {
      id: "vitd_now_10000_240",
      supplementKey: "vitamin_d3",
      productName: "Vitamin D-3 10,000 IU, 240 softgels",
      brand: "NOW Foods",
      form: "Softgel",
      activeAmountPerUnit: 10000,
      activeUnit: "IU",
      unitsPerBottle: 240,
      priceUSD: 15.73,
      sourceLabel: "iHerb",
      costPerActiveUnit: 15.73 / (10000 * 240),
      costPer1000IU: 0.00655,
      notes: "High-dose daily softgel; verify personal dosing."
    },
    {
      id: "vitd_celebrate_25000_90",
      supplementKey: "vitamin_d3",
      productName: "Vitamin D3 25,000 IU, 90 capsules",
      brand: "Celebrate",
      form: "Capsule",
      activeAmountPerUnit: 25000,
      activeUnit: "IU",
      unitsPerBottle: 90,
      priceUSD: 21.99,
      sourceLabel: "Celebrate Vitamins",
      costPerActiveUnit: 21.99 / (25000 * 90),
      costPer1000IU: 0.00977,
      servingsPerWeek: 1,
      notes: "Product page notes 1 capsule once per week."
    }
  ],

  magnesium: [
    {
      id: "mag_sv_400_250",
      supplementKey: "magnesium",
      productName: "Magnesium 400 mg, 250 tablets",
      brand: "Spring Valley",
      form: "Tablet",
      activeAmountPerUnit: 400,
      activeUnit: "mg",
      unitsPerBottle: 250,
      priceUSD: 10.88,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.000109,
      notes: "Listing states 1 tablet/day and 400 mg per tablet.",
      evidenceNote: "Cheapest magnesium per mg in the priced magnesium set."
    },
    {
      id: "mag_nb_500_200",
      supplementKey: "magnesium",
      productName: "Magnesium Oxide 500 mg, 200 tablets",
      brand: "Nature's Bounty",
      form: "Tablet",
      activeAmountPerUnit: 500,
      activeUnit: "mg",
      unitsPerBottle: 200,
      priceUSD: 11.89,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.000119,
      notes: "Product page states 500 mg per tablet."
    },
    {
      id: "mag_le_500_100",
      supplementKey: "magnesium",
      productName: "Magnesium Caps 500 mg, 100 capsules",
      brand: "Life Extension",
      form: "Capsule",
      activeAmountPerUnit: 500,
      activeUnit: "mg",
      unitsPerBottle: 100,
      priceUSD: 9.0,
      sourceLabel: "Life Extension",
      costPerActiveUnit: 0.00018,
      notes: "Supplement facts show serving size 1 capsule, 500 mg."
    }
  ],

  iron: [
    {
      id: "iron_sv_65_200",
      supplementKey: "iron",
      productName: "Iron Tablets 65 mg, 200 count",
      brand: "Spring Valley",
      form: "Tablet",
      activeAmountPerUnit: 65,
      activeUnit: "mg",
      unitsPerBottle: 200,
      priceUSD: 4.74,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.000365,
      notes: "Best cost per mg in the iron subset.",
      caution: [
        "Iron should be used when appropriate to the biomarker context.",
        "Iron overdose is dangerous, especially for children."
      ],
      evidenceNote: "Best iron value in the report dataset."
    },
    {
      id: "iron_nm_65_150",
      supplementKey: "iron",
      productName: "Iron 65 mg, 150 count",
      brand: "Nature Made",
      form: "Tablet",
      activeAmountPerUnit: 65,
      activeUnit: "mg",
      unitsPerBottle: 150,
      priceUSD: 5.88,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.000603,
      notes: "Listing indicates 65 mg iron; serving instructions not captured."
    },
    {
      id: "iron_cypress_150_100",
      supplementKey: "iron",
      productName: "Poly Iron 150 mg Strength, 100 count",
      brand: "Cypress Pharmaceutical",
      form: "Capsule",
      activeAmountPerUnit: 150,
      activeUnit: "mg",
      unitsPerBottle: 100,
      priceUSD: 18.84,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.001256,
      notes: "Higher concentration per capsule.",
      evidenceNote: "Highest iron potency per capsule in the report subset."
    },
    {
      id: "iron_vitamatic_104_120",
      supplementKey: "iron",
      productName: "Ferrous Fumarate 325 mg + Vitamin C 100 mg, 120 tablets",
      brand: "Vitamatic",
      form: "Tablet",
      activeAmountPerUnit: 104,
      activeUnit: "mg",
      unitsPerBottle: 120,
      priceUSD: 16.99,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.00136,
      notes: "Includes vitamin C; serving size not fully shown.",
      assumptions: ["Cost derived from listing dose and count."]
    }
  ],

  omega_3: [
    {
      id: "omega3_sr_1250_60",
      supplementKey: "omega_3",
      productName: "Omega-3 Fish Oil Triple Strength 1250 mg, 60 softgels",
      brand: "Sports Research",
      form: "Softgel",
      activeAmountPerUnit: 1250,
      activeUnit: "mg",
      unitsPerBottle: 60,
      priceUSD: 22.97,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.000306,
      notes: "Omega-3 breakdown (EPA/DHA) not captured in snippet.",
      assumptions: ["Cost per mg assumes 1,250 mg per softgel."],
      caution: ["Omega-3 can interact with medications and may affect bleeding risk."]
    }
  ],

  turmeric_curcumin: [
    {
      id: "turmeric_tn_1500_270",
      supplementKey: "turmeric_curcumin",
      productName: "Turmeric/Curcumin with Black Pepper 1500 mg, 270 capsules",
      brand: "TNVitamins",
      form: "Capsule",
      activeAmountPerUnit: 1500,
      activeUnit: "mg",
      unitsPerBottle: 270,
      priceUSD: 17.49,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.0000432,
      notes: "Very cheap per mg, but listing may reflect per serving not per capsule.",
      assumptions: ["Assumes 1,500 mg per capsule; label should be verified before final UI claims."]
    }
  ],

  berberine: [
    {
      id: "berb_bn_500_120",
      supplementKey: "berberine",
      productName: "Berberine 500 mg, 120 capsules",
      brand: "Best Naturals",
      form: "Capsule",
      activeAmountPerUnit: 500,
      activeUnit: "mg",
      unitsPerBottle: 120,
      priceUSD: 19.99,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.000333,
      notes: "Many berberine regimens in trials use multiple daily doses.",
      caution: ["Berberine can affect glycemic control and interact with medications."]
    }
  ],

  psyllium: [
    {
      id: "psyllium_now_500_200",
      supplementKey: "psyllium",
      productName: "Psyllium Husk 500 mg, 200 capsules",
      brand: "NOW Foods",
      form: "Capsule",
      activeAmountPerUnit: 500,
      activeUnit: "mg",
      unitsPerBottle: 200,
      priceUSD: 15.47,
      sourceLabel: "Walmart Business",
      costPerActiveUnit: 0.000155,
      notes: "Fiber products are often dosed in grams/day; capsules are lower-dose per unit."
    }
  ],

  cinnamon: [
    {
      id: "cinnamon_sv_1000_400",
      supplementKey: "cinnamon",
      productName: "Cinnamon 1000 mg, 400 capsules",
      brand: "Spring Valley",
      form: "Capsule",
      activeAmountPerUnit: 1000,
      activeUnit: "mg",
      unitsPerBottle: 400,
      priceUSD: 12.48,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.0000312,
      notes: "Included as a common adjunct; evidence quality varies by preparation."
    }
  ],

  selenium: [
    {
      id: "selenium_sv_200_100",
      supplementKey: "selenium",
      productName: "Selenium 200 mcg, 100 tablets",
      brand: "Spring Valley",
      form: "Tablet",
      activeAmountPerUnit: 200,
      activeUnit: "mcg",
      unitsPerBottle: 100,
      priceUSD: 4.88,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.000244,
      notes: "Likely 1 tablet/day."
    }
  ],

  b12: [
    {
      id: "b12_sv_5000_300",
      supplementKey: "b12",
      productName: "Vitamin B12 5,000 mcg, 300 tablets",
      brand: "Spring Valley",
      form: "Fast dissolve tablet",
      activeAmountPerUnit: 5000,
      activeUnit: "mcg",
      unitsPerBottle: 300,
      priceUSD: 19.94,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.0133 / 1000,
      notes: "Best value B12 in this subset, but lower per-tablet potency than 10,000 mcg products."
    },
    {
      id: "b12_vitamatic_10000_60",
      supplementKey: "b12",
      productName: "Methyl B12 10,000 mcg, 60 lozenges",
      brand: "Vitamatic",
      form: "Lozenge",
      activeAmountPerUnit: 10000,
      activeUnit: "mcg",
      unitsPerBottle: 60,
      priceUSD: 9.99,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.0167 / 1000,
      notes: "Highest potency per lozenge in the report subset."
    },
    {
      id: "b12_now_10000_60",
      supplementKey: "b12",
      productName: "Methyl B-12 10,000 mcg, 60 lozenges",
      brand: "NOW Foods",
      form: "Lozenge",
      activeAmountPerUnit: 10000,
      activeUnit: "mcg",
      unitsPerBottle: 60,
      priceUSD: 18.99,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.0317 / 1000,
      notes: "Serving size 1 lozenge."
    }
  ],

  calcium: [
    {
      id: "calcium_sv_600_250",
      supplementKey: "calcium",
      productName: "Calcium + Vitamin D 600 mg, 250 tablets",
      brand: "Spring Valley",
      form: "Tablet",
      activeAmountPerUnit: 600,
      activeUnit: "mg",
      unitsPerBottle: 250,
      priceUSD: 6.12,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.0000408,
      notes: "600 mg calcium + 800 IU D3 per tablet."
    },
    {
      id: "calcium_citrate_sv_600_300",
      supplementKey: "calcium",
      productName: "Calcium Citrate 600 mg, 300 tablets",
      brand: "Spring Valley",
      form: "Tablet",
      activeAmountPerUnit: 600,
      activeUnit: "mg",
      unitsPerBottle: 300,
      priceUSD: 9.63,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.0000535,
      assumptions: ["Assumes 600 mg per tablet; listing says 600 mg per serving and should be verified."]
    },
    {
      id: "calcium_nm_600_220",
      supplementKey: "calcium",
      productName: "Calcium 600 mg with Vitamin D3, 220 tablets",
      brand: "Nature Made",
      form: "Tablet",
      activeAmountPerUnit: 600,
      activeUnit: "mg",
      unitsPerBottle: 220,
      priceUSD: 16.99,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.000129
    }
  ],

  zinc: [
    {
      id: "zinc_bronson_50_360",
      supplementKey: "zinc",
      productName: "Zinc 50 mg, 360 tablets",
      brand: "Bronson",
      form: "Tablet",
      activeAmountPerUnit: 50,
      activeUnit: "mg",
      unitsPerBottle: 360,
      priceUSD: 14.99,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.000833
    }
  ],

  boron: [
    {
      id: "boron_now_3_250",
      supplementKey: "boron",
      productName: "Boron 3 mg, 250 capsules",
      brand: "NOW Foods",
      form: "Capsule",
      activeAmountPerUnit: 3,
      activeUnit: "mg",
      unitsPerBottle: 250,
      priceUSD: 11.6,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.0155,
      notes: "Trials often use ~6 mg/day, which may imply 2 capsules/day."
    }
  ],

  ashwagandha: [
    {
      id: "ash_flora_300_120",
      supplementKey: "ashwagandha",
      productName: "KSM-66 Ashwagandha Root Extract 300 mg, 120 capsules",
      brand: "Flora Health",
      form: "Capsule",
      activeAmountPerUnit: 300,
      activeUnit: "mg",
      unitsPerBottle: 120,
      priceUSD: 26.68,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.000741,
      notes: "KSM-66 extract."
    }
  ],

  iodine: [
    {
      id: "iodine_kelp_bn_150_300x2",
      supplementKey: "iodine",
      productName: "Kelp 150 mcg, 300 tablets (2-pack)",
      brand: "Best Naturals",
      form: "Tablet",
      activeAmountPerUnit: 150,
      activeUnit: "mcg",
      unitsPerBottle: 600,
      priceUSD: 16.2,
      sourceLabel: "Walmart",
      costPerActiveUnit: 0.00018,
      notes: "2-pack level pricing; dose standardization can vary by product."
    }
  ]
};