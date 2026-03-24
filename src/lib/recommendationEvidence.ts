/**
 * Evidence level for supplement/protocol recommendations.
 * Shown next to recommendations in stack and guides.
 */

export type EvidenceLevel = "strong" | "moderate" | "emerging"

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  strong: "Strong clinical support",
  moderate: "Moderate evidence",
  emerging: "Emerging evidence",
}

/** Evidence level by biomarker (for primary supplement recommendation). */
export const BIOMARKER_EVIDENCE: Record<string, EvidenceLevel> = {
  Ferritin: "strong",
  "Vitamin D": "strong",
  "Vitamin B12": "strong",
  Folate: "strong",
  Magnesium: "strong",
  "25-OH Vitamin D": "strong",
  HbA1c: "strong",
  Glucose: "moderate",
  "LDL-C": "strong",
  Triglycerides: "strong",
  "hs-CRP": "moderate",
}

export function getEvidenceForBiomarker(markerName: string): { level: EvidenceLevel; label: string } | null {
  const level = BIOMARKER_EVIDENCE[markerName] ?? BIOMARKER_EVIDENCE[markerName.trim()]
  if (!level) return null
  return { level, label: EVIDENCE_LABELS[level] }
}
