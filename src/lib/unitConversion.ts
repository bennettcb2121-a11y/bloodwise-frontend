/**
 * Unit conversion for biomarker values. Canonical units match what biomarkerDatabase.ts ranges use.
 *
 * When a lab reports an alternate unit (SI in many non-US labs, or mmol/L glucose on Canadian labs),
 * we normalize to the US canonical so scoring is consistent. Conversion factors below are standard.
 */

export type UnitConversion = {
  /** The canonical unit used in biomarkerDatabase.ts ranges. */
  canonical: string
  /** Convert `value` from `fromUnit` to the canonical unit. Null if unsupported. */
  convert: (value: number, fromUnit: string) => number | null
}

const MOLECULAR_WEIGHTS = {
  glucose: 180.16, // mg/dL ↔ mmol/L: divide by 18.0156
  cholesterol: 386.65, // mg/dL ↔ mmol/L: divide by 38.67
  triglyceride: 885.43, // mg/dL ↔ mmol/L: divide by 88.57
  creatinine: 113.12, // mg/dL ↔ µmol/L: multiply by 88.4
  bilirubin: 584.66, // mg/dL ↔ µmol/L: multiply by 17.1
  uric_acid: 168.11, // mg/dL ↔ µmol/L: multiply by 59.48
}

/** Strip common formatting from a unit string for case-insensitive matching. */
export function normalizeUnit(unit: string): string {
  return (unit || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/μ/g, "u")
    .replace(/µ/g, "u")
    .replace(/dl/g, "dl")
    .replace(/per/g, "/")
    .replace(/-/g, "")
}

/**
 * Per-biomarker conversion registry. Keys are canonical biomarkerDatabase.ts keys.
 *
 * When adding: first row below each biomarker is the canonical unit; the function handles
 * all reasonable alternate unit strings for that marker.
 */
export const BIOMARKER_UNIT_CONVERSIONS: Record<string, UnitConversion> = {
  "Vitamin D": {
    canonical: "ng/mL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "ng/ml" || u === "") return value
      if (u === "nmol/l") return value / 2.496
      return null
    },
  },
  Glucose: {
    canonical: "mg/dL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "mg/dl" || u === "") return value
      if (u === "mmol/l") return value * 18.0156
      return null
    },
  },
  "Fasting insulin": {
    canonical: "µIU/mL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "uiu/ml" || u === "miu/l" || u === "") return value
      if (u === "pmol/l") return value / 6.945
      return null
    },
  },
  Insulin: {
    canonical: "µIU/mL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "uiu/ml" || u === "miu/l" || u === "") return value
      if (u === "pmol/l") return value / 6.945
      return null
    },
  },
  HbA1c: {
    canonical: "%",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "%" || u === "") return value
      // IFCC mmol/mol → NGSP %:  NGSP% = (mmol/mol × 0.0915) + 2.15
      if (u === "mmol/mol") return value * 0.0915 + 2.15
      return null
    },
  },
  Triglycerides: {
    canonical: "mg/dL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "mg/dl" || u === "") return value
      if (u === "mmol/l") return value * 88.57
      return null
    },
  },
  "HDL-C": {
    canonical: "mg/dL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "mg/dl" || u === "") return value
      if (u === "mmol/l") return value * 38.67
      return null
    },
  },
  "LDL-C": {
    canonical: "mg/dL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "mg/dl" || u === "") return value
      if (u === "mmol/l") return value * 38.67
      return null
    },
  },
  "Total cholesterol": {
    canonical: "mg/dL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "mg/dl" || u === "") return value
      if (u === "mmol/l") return value * 38.67
      return null
    },
  },
  "Non-HDL cholesterol": {
    canonical: "mg/dL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "mg/dl" || u === "") return value
      if (u === "mmol/l") return value * 38.67
      return null
    },
  },
  ApoB: {
    canonical: "mg/dL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "mg/dl" || u === "") return value
      if (u === "g/l") return value * 100
      return null
    },
  },
  "Lipoprotein(a)": {
    canonical: "mg/dL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "mg/dl" || u === "") return value
      // Rough mass-based conversion only; unit systems are not truly interchangeable.
      if (u === "nmol/l") return value / 2.5
      return null
    },
  },
  "Uric acid": {
    canonical: "mg/dL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "mg/dl" || u === "") return value
      if (u === "umol/l") return value / 59.48
      return null
    },
  },
  Creatinine: {
    canonical: "mg/dL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "mg/dl" || u === "") return value
      if (u === "umol/l") return value / 88.4
      return null
    },
  },
  Bilirubin: {
    canonical: "mg/dL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "mg/dl" || u === "") return value
      if (u === "umol/l") return value / 17.1
      return null
    },
  },
  Ferritin: {
    canonical: "ng/mL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "ng/ml" || u === "ug/l" || u === "") return value
      return null
    },
  },
  "Vitamin B12": {
    canonical: "pg/mL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "pg/ml" || u === "") return value
      if (u === "pmol/l") return value / 0.738
      return null
    },
  },
  Folate: {
    canonical: "ng/mL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "ng/ml" || u === "") return value
      if (u === "nmol/l") return value / 2.266
      return null
    },
  },
  "RBC folate": {
    canonical: "ng/mL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "ng/ml" || u === "") return value
      if (u === "nmol/l") return value / 2.266
      return null
    },
  },
  Testosterone: {
    canonical: "ng/dL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "ng/dl" || u === "") return value
      if (u === "nmol/l") return value * 28.84
      return null
    },
  },
  "Free testosterone": {
    canonical: "pg/mL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "pg/ml" || u === "") return value
      if (u === "pmol/l") return value / 3.47
      return null
    },
  },
  Homocysteine: {
    canonical: "µmol/L",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "umol/l" || u === "") return value
      return null
    },
  },
  MMA: {
    canonical: "µmol/L",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "umol/l" || u === "") return value
      if (u === "nmol/l") return value / 1000
      return null
    },
  },
  TSH: {
    canonical: "µIU/mL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "uiu/ml" || u === "miu/l" || u === "") return value
      return null
    },
  },
  "Free T4": {
    canonical: "ng/dL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "ng/dl" || u === "") return value
      if (u === "pmol/l") return value / 12.87
      return null
    },
  },
  "Free T3": {
    canonical: "pg/mL",
    convert(value, fromUnit) {
      const u = normalizeUnit(fromUnit)
      if (u === "pg/ml" || u === "") return value
      if (u === "pmol/l") return value / 1.536
      return null
    },
  },
}

/**
 * Normalize a biomarker value to the canonical unit expected by biomarkerDatabase ranges.
 * Returns the canonical-unit value + the canonical unit string, or null if unsupported.
 */
export function normalizeToCanonical(
  biomarkerKey: string,
  value: number,
  unit: string
): { value: number; unit: string } | null {
  if (!Number.isFinite(value)) return null
  const conv = BIOMARKER_UNIT_CONVERSIONS[biomarkerKey]
  if (!conv) {
    // Unknown biomarker — pass through as-is; the analyzer will handle missing ranges.
    return { value, unit: unit || "" }
  }
  const converted = conv.convert(value, unit || "")
  if (converted == null) return null
  return { value: converted, unit: conv.canonical }
}

void MOLECULAR_WEIGHTS // Kept for reference/documentation; used conversions use precomputed factors.
