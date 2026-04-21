/**
 * Map common lab report labels → biomarkerDatabase keys so scoring and ranges stay consistent.
 *
 * Two use cases:
 *   1. resolveBloodworkToDbKey: user-entered / analysis-side mapping (tighter set)
 *   2. resolveActionPlanDbKey:  panel/UI label → DB key for action plans, drivers, affiliates
 *   3. resolveExtractedLabName: AI-extracted raw lab label → canonical key
 *      (this is the widest set — covers LabCorp, Quest, Kaiser, and common report variants)
 */

export const BLOODWORK_KEY_TO_DB_KEY: Record<string, string> = {
  "25-OH Vitamin D": "Vitamin D",
  "25-Hydroxyvitamin D": "Vitamin D",
  "25 OH Vitamin D": "Vitamin D",
}

export function resolveBloodworkToDbKey(markerName: string): string {
  return BLOODWORK_KEY_TO_DB_KEY[markerName] ?? markerName
}

/** Panel / UI label → biomarkerDatabase key (action plans, drivers, affiliates). */
export const ACTION_PLAN_KEY_ALIASES: Record<string, string> = {
  "25-OH Vitamin D": "Vitamin D",
  "Fasting Glucose": "Glucose",
  "Fasting insulin": "Insulin",
}

export function resolveActionPlanDbKey(markerName: string): string {
  const t = markerName.trim()
  return ACTION_PLAN_KEY_ALIASES[t] ?? t
}

/**
 * Raw lab-report label → canonical biomarkerDatabase key.
 * Keys are case-insensitive; matching is done via normalizeLabName.
 * Covers LabCorp, Quest, Kaiser, BioReference, and common EMR exports.
 */
const EXTRACTED_LAB_NAME_ALIASES: Record<string, string> = {
  // Iron panel
  ferritin: "Ferritin",
  "iron, total": "Serum iron",
  "serum iron": "Serum iron",
  iron: "Serum iron",
  tibc: "TIBC",
  "total iron binding capacity": "TIBC",
  uibc: "TIBC",
  "iron saturation": "Transferrin saturation",
  "iron saturation (%)": "Transferrin saturation",
  "transferrin saturation": "Transferrin saturation",
  "% transferrin saturation": "Transferrin saturation",
  "transferrin saturation, calc": "Transferrin saturation",
  "soluble transferrin receptor": "sTfR",
  stfr: "sTfR",

  // Vitamins
  "vitamin d": "Vitamin D",
  "vitamin d, 25-hydroxy": "Vitamin D",
  "25-hydroxyvitamin d": "Vitamin D",
  "25-oh vitamin d": "Vitamin D",
  "25 oh vitamin d": "Vitamin D",
  "25-hydroxy vitamin d, total": "Vitamin D",
  "vitamin d 25 hydroxy": "Vitamin D",
  "vitamin b12": "Vitamin B12",
  "b12": "Vitamin B12",
  cobalamin: "Vitamin B12",
  holotranscobalamin: "Active B12",
  "active b12": "Active B12",
  "methylmalonic acid": "MMA",
  mma: "MMA",
  folate: "Folate",
  "folate, serum": "Folate",
  "serum folate": "Folate",
  "folate, rbc": "RBC folate",
  "rbc folate": "RBC folate",
  "red blood cell folate": "RBC folate",
  "folate (rbc)": "RBC folate",

  // Minerals
  magnesium: "Magnesium",
  "magnesium, serum": "Magnesium",
  "serum magnesium": "Magnesium",
  "rbc magnesium": "Magnesium",
  zinc: "Zinc",
  "zinc, plasma": "Zinc",
  "serum zinc": "Zinc",
  selenium: "Selenium",
  "selenium, serum": "Selenium",
  iodine: "Iodine",
  "iodine, urine": "Iodine",
  "urinary iodine": "Iodine",

  // Glycemic
  glucose: "Glucose",
  "glucose, fasting": "Glucose",
  "fasting glucose": "Glucose",
  "glucose, serum": "Glucose",
  "blood glucose": "Glucose",
  insulin: "Insulin",
  "insulin, fasting": "Fasting insulin",
  "fasting insulin": "Fasting insulin",
  hba1c: "HbA1c",
  "hemoglobin a1c": "HbA1c",
  "a1c": "HbA1c",
  "hgb a1c": "HbA1c",
  "c-peptide": "C-peptide",
  "c peptide": "C-peptide",
  "uric acid": "Uric acid",

  // Lipids
  "total cholesterol": "Total cholesterol",
  "cholesterol, total": "Total cholesterol",
  cholesterol: "Total cholesterol",
  "hdl cholesterol": "HDL-C",
  "hdl-c": "HDL-C",
  hdl: "HDL-C",
  "ldl cholesterol": "LDL-C",
  "ldl-c": "LDL-C",
  "ldl (calc)": "LDL-C",
  "ldl, calculated": "LDL-C",
  "ldl (direct)": "LDL-C",
  ldl: "LDL-C",
  "non-hdl cholesterol": "Non-HDL cholesterol",
  "non hdl cholesterol": "Non-HDL cholesterol",
  "non-hdl-c": "Non-HDL cholesterol",
  "non hdl-c": "Non-HDL cholesterol",
  triglycerides: "Triglycerides",
  apob: "ApoB",
  "apolipoprotein b": "ApoB",
  "apolipoprotein b-100": "ApoB",
  "lp(a)": "Lipoprotein(a)",
  "lipoprotein (a)": "Lipoprotein(a)",
  "lipoprotein(a)": "Lipoprotein(a)",
  "lipoprotein a": "Lipoprotein(a)",

  // Inflammation
  crp: "CRP",
  "c-reactive protein": "CRP",
  "hs-crp": "hs-CRP",
  "hs crp": "hs-CRP",
  "c-reactive protein, high sensitivity": "hs-CRP",
  "high sensitivity crp": "hs-CRP",
  "high-sensitivity crp": "hs-CRP",
  esr: "ESR",
  "sedimentation rate": "ESR",
  "erythrocyte sedimentation rate": "ESR",
  fibrinogen: "Fibrinogen",

  // Thyroid
  tsh: "TSH",
  "thyroid stimulating hormone": "TSH",
  "free t4": "Free T4",
  "ft4": "Free T4",
  "t4, free": "Free T4",
  "free thyroxine": "Free T4",
  "free t3": "Free T3",
  "ft3": "Free T3",
  "t3, free": "Free T3",
  "free triiodothyronine": "Free T3",
  "anti-tpo": "TPO antibodies",
  "tpo antibody": "TPO antibodies",
  "tpo antibodies": "TPO antibodies",
  "thyroid peroxidase antibody": "TPO antibodies",
  "thyroperoxidase antibody": "TPO antibodies",

  // CBC
  hemoglobin: "Hemoglobin",
  hgb: "Hemoglobin",
  hb: "Hemoglobin",
  hematocrit: "Hematocrit",
  hct: "Hematocrit",
  rbc: "RBC",
  "red blood cell count": "RBC",
  "red cell count": "RBC",
  mcv: "MCV",
  "mean corpuscular volume": "MCV",
  mch: "MCH",
  "mean corpuscular hemoglobin": "MCH",
  rdw: "RDW",
  "red cell distribution width": "RDW",
  wbc: "WBC",
  "white blood cell count": "WBC",
  "white blood cells": "WBC",
  platelets: "Platelets",
  "platelet count": "Platelets",

  // CMP
  sodium: "Sodium",
  "sodium, serum": "Sodium",
  potassium: "Potassium",
  "potassium, serum": "Potassium",
  chloride: "Chloride",
  "chloride, serum": "Chloride",
  "co2": "CO2",
  "carbon dioxide": "CO2",
  bicarbonate: "CO2",
  bun: "BUN",
  "blood urea nitrogen": "BUN",
  "urea nitrogen": "BUN",
  creatinine: "Creatinine",
  "creatinine, serum": "Creatinine",
  egfr: "eGFR",
  "estimated gfr": "eGFR",
  "estimated glomerular filtration rate": "eGFR",
  "egfr (ckd-epi)": "eGFR",
  calcium: "Calcium",
  "calcium, serum": "Calcium",
  albumin: "Albumin",
  "albumin, serum": "Albumin",
  "total protein": "Total protein",
  "protein, total": "Total protein",
  ast: "AST",
  sgot: "AST",
  "aspartate aminotransferase": "AST",
  alt: "ALT",
  sgpt: "ALT",
  "alanine aminotransferase": "ALT",
  "alkaline phosphatase": "Alkaline phosphatase",
  "alk phos": "Alkaline phosphatase",
  alp: "Alkaline phosphatase",
  "ggt": "GGT",
  "gamma-gt": "GGT",
  "gamma glutamyl transferase": "GGT",
  "gamma-glutamyl transferase": "GGT",
  bilirubin: "Bilirubin",
  "bilirubin, total": "Bilirubin",
  "total bilirubin": "Bilirubin",

  // Hormones
  testosterone: "Testosterone",
  "testosterone, total": "Testosterone",
  "total testosterone": "Testosterone",
  "free testosterone": "Free testosterone",
  "testosterone, free": "Free testosterone",
  shbg: "SHBG",
  "sex hormone binding globulin": "SHBG",
  estradiol: "Estradiol",
  "estradiol, e2": "Estradiol",
  "e2": "Estradiol",
  progesterone: "Progesterone",
  cortisol: "Cortisol (AM)",
  "cortisol, am": "Cortisol (AM)",
  "cortisol am": "Cortisol (AM)",
  "cortisol, 8am": "Cortisol (AM)",
  "cortisol a.m.": "Cortisol (AM)",
  lh: "LH",
  "luteinizing hormone": "LH",
  fsh: "FSH",
  "follicle stimulating hormone": "FSH",
  "follicle-stimulating hormone": "FSH",
  prolactin: "Prolactin",
  "dhea-s": "DHEA-S",
  "dhea sulfate": "DHEA-S",
  "dheas": "DHEA-S",
  "dehydroepiandrosterone sulfate": "DHEA-S",
  psa: "PSA",
  "prostate specific antigen": "PSA",
  "prostate-specific antigen": "PSA",
  "psa, total": "PSA",

  // Other
  homocysteine: "Homocysteine",
  pth: "PTH",
  "parathyroid hormone": "PTH",
  "intact pth": "PTH",
  "omega-3 index": "Omega-3 Index",
  "omega 3 index": "Omega-3 Index",
  "coq10": "CoQ10",
  "coenzyme q10": "CoQ10",
  "ubiquinol": "CoQ10",
}

/** Normalize a lab label for alias lookup: lowercase, collapse whitespace, strip common suffixes. */
function normalizeLabName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[,](\s*)(serum|plasma|urine|blood|total)\s*$/i, "")
    .replace(/\s+\(.*\)\s*$/g, "")
    .trim()
}

/**
 * Resolve a raw label from an extracted lab report to its canonical biomarkerDatabase key.
 * Returns null when no alias matches — the caller should surface these for manual remap.
 */
export function resolveExtractedLabName(rawName: string): string | null {
  if (!rawName) return null
  const trimmed = rawName.trim()
  if (trimmed.length === 0) return null

  // Try the primary table as written.
  if (EXTRACTED_LAB_NAME_ALIASES[trimmed]) return EXTRACTED_LAB_NAME_ALIASES[trimmed]

  // Then normalized.
  const norm = normalizeLabName(trimmed)
  if (EXTRACTED_LAB_NAME_ALIASES[norm]) return EXTRACTED_LAB_NAME_ALIASES[norm]

  // Also try with the existing single-character action plan table for shared labels.
  const actionPlan = ACTION_PLAN_KEY_ALIASES[trimmed]
  if (actionPlan) return actionPlan

  return null
}
