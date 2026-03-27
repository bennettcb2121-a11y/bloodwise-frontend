/**
 * Evidence strength for supplement/protocol recommendations (qualitative).
 * For peer-reviewed and agency URLs, use biomarkerEvidence.ts / getEvidenceForBiomarker.
 */

import { resolveEvidenceDbKey } from "@/src/lib/biomarkerEvidence"

export type EvidenceLevel = "strong" | "moderate" | "emerging"

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  strong: "Strong clinical support",
  moderate: "Moderate evidence",
  emerging: "Emerging evidence",
}

/** Evidence strength by biomarker database key (primary supplement / lifestyle framing). */
export const BIOMARKER_EVIDENCE_STRENGTH: Record<string, EvidenceLevel> = {
  Ferritin: "strong",
  "Vitamin D": "strong",
  "25-OH Vitamin D": "strong",
  "Vitamin B12": "strong",
  Folate: "strong",
  Magnesium: "strong",
  HbA1c: "strong",
  Glucose: "moderate",
  Insulin: "moderate",
  "LDL-C": "strong",
  "HDL-C": "strong",
  Triglycerides: "strong",
  ApoB: "strong",
  "hs-CRP": "moderate",
  CRP: "moderate",
  Testosterone: "moderate",
  TIBC: "moderate",
  Hemoglobin: "moderate",
  Hematocrit: "moderate",
  RBC: "moderate",
  MCV: "moderate",
  MCH: "moderate",
  RDW: "moderate",
  WBC: "moderate",
  Platelets: "moderate",
  TSH: "strong",
  BUN: "moderate",
  Creatinine: "strong",
  Albumin: "moderate",
  Calcium: "moderate",
  Sodium: "moderate",
  Potassium: "moderate",
  Chloride: "moderate",
  CO2: "moderate",
  AST: "moderate",
  ALT: "moderate",
  Bilirubin: "moderate",
  ESR: "emerging",
  SHBG: "emerging",
  Estradiol: "emerging",
}

/** Qualitative strength label for protocol/guide copy — separate from citation URLs. */
export function getEvidenceStrengthForBiomarker(markerName: string): { level: EvidenceLevel; label: string } | null {
  const key = resolveEvidenceDbKey(markerName)
  const level = BIOMARKER_EVIDENCE_STRENGTH[key] ?? BIOMARKER_EVIDENCE_STRENGTH[markerName.trim()]
  if (!level) return null
  return { level, label: EVIDENCE_LABELS[level] }
}
