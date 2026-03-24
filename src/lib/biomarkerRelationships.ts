/**
 * Biomarker relationship map: which markers are connected for education and cross-linking.
 * Shown on guide and biomarker-detail views as "Connected to:" pills/links.
 */

export type BiomarkerRelationship = {
  markerKey: string
  label: string
  explanation?: string
}

/** Map biomarker key -> related markers (for "Connected to" section). */
export const BIOMARKER_RELATIONSHIPS: Record<string, BiomarkerRelationship[]> = {
  Ferritin: [
    { markerKey: "Vitamin B12", label: "B12", explanation: "Both support red blood cell health" },
    { markerKey: "Hemoglobin", label: "Hemoglobin", explanation: "Iron feeds hemoglobin production" },
    { markerKey: "CRP", label: "CRP", explanation: "Inflammation can affect iron absorption" },
    { markerKey: "Transferrin saturation", label: "Transferrin sat.", explanation: "Part of iron panel" },
  ],
  "Vitamin D": [
    { markerKey: "Calcium", label: "Calcium", explanation: "Vitamin D supports calcium absorption" },
    { markerKey: "Magnesium", label: "Magnesium", explanation: "D and magnesium support bone and muscle" },
    { markerKey: "Vitamin B12", label: "B12", explanation: "Often checked together for energy" },
  ],
  "Vitamin B12": [
    { markerKey: "Folate", label: "Folate", explanation: "Both support red blood cells and homocysteine" },
    { markerKey: "Ferritin", label: "Ferritin", explanation: "Both support red blood cell health" },
    { markerKey: "Hemoglobin", label: "Hemoglobin", explanation: "B12 supports hemoglobin production" },
  ],
  Folate: [
    { markerKey: "Vitamin B12", label: "B12", explanation: "Pair for blood health; excess folate can mask B12 deficiency" },
    { markerKey: "Hemoglobin", label: "Hemoglobin", explanation: "Folate supports RBC formation" },
  ],
  Magnesium: [
    { markerKey: "Vitamin D", label: "Vitamin D", explanation: "Both support bone and muscle" },
    { markerKey: "Calcium", label: "Calcium", explanation: "Balance matters for bone health" },
  ],
  "hs-CRP": [
    { markerKey: "Ferritin", label: "Ferritin", explanation: "Inflammation can lower ferritin" },
    { markerKey: "Vitamin D", label: "Vitamin D", explanation: "D may support immune balance" },
  ],
  CRP: [
    { markerKey: "Ferritin", label: "Ferritin", explanation: "Inflammation can affect iron" },
    { markerKey: "Vitamin D", label: "Vitamin D", explanation: "D may support immune balance" },
  ],
  Hemoglobin: [
    { markerKey: "Ferritin", label: "Ferritin", explanation: "Iron stores feed hemoglobin" },
    { markerKey: "Vitamin B12", label: "B12", explanation: "B12 supports RBC production" },
    { markerKey: "Folate", label: "Folate", explanation: "Folate supports RBC formation" },
  ],
  HbA1c: [
    { markerKey: "Glucose", label: "Glucose", explanation: "Both reflect blood sugar control" },
    { markerKey: "Insulin", label: "Insulin", explanation: "Insulin sensitivity and glucose" },
  ],
  Glucose: [
    { markerKey: "HbA1c", label: "HbA1c", explanation: "Fasting glucose and long-term average" },
    { markerKey: "Insulin", label: "Insulin", explanation: "Insulin and glucose together" },
  ],
}

/**
 * Get related biomarkers for a given marker key. Used to show "Connected to:" on guide pages.
 */
export function getRelatedBiomarkers(markerKey: string): BiomarkerRelationship[] {
  const key = markerKey.trim()
  return BIOMARKER_RELATIONSHIPS[key] ?? []
}
