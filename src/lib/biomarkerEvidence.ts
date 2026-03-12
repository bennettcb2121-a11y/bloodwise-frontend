/**
 * Biomarker evidence / science metadata. Each biomarker can have 1–3 evidence entries
 * with study title, source, and URL. Rendered as clickable links in the UI.
 */

export type EvidenceEntry = {
  title: string
  source: string
  url: string
}

export type BiomarkerEvidenceMap = Record<string, EvidenceEntry[]>

/** Evidence keyed by biomarker name (match keys used in biomarkerDatabase / analysis results). */
export const BIOMARKER_EVIDENCE: BiomarkerEvidenceMap = {
  Ferritin: [
    { title: "Iron deficiency and repletion in athletes", source: "ODS / NIH", url: "https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/" },
    { title: "Alternate-day iron supplementation", source: "Blood", url: "https://pubmed.ncbi.nlm.nih.gov/28385754/" },
  ],
  "Vitamin D": [
    { title: "Vitamin D and health", source: "NIH Office of Dietary Supplements", url: "https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/" },
    { title: "Vitamin D and athletic performance", source: "Nutrients", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6071314/" },
  ],
  "Vitamin B12": [
    { title: "B12 deficiency and supplementation", source: "NIH ODS", url: "https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/" },
  ],
  Folate: [
    { title: "Folate and homocysteine", source: "NIH ODS", url: "https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/" },
  ],
  Magnesium: [
    { title: "Magnesium in health and disease", source: "NIH ODS", url: "https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/" },
    { title: "Magnesium glycinate absorption", source: "Nutrients", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5786912/" },
  ],
  HbA1c: [
    { title: "ADA Standards of Medical Care in Diabetes", source: "Diabetes Care", url: "https://diabetesjournals.org/care/article/47/Supplement_1/S1/153960/Standards-of-Care-in-Diabetes-2024" },
  ],
  Glucose: [
    { title: "Fasting glucose and metabolic health", source: "ADA", url: "https://diabetesjournals.org/care/article/47/Supplement_1/S1/153960/Standards-of-Care-in-Diabetes-2024" },
  ],
  "LDL-C": [
    { title: "Cholesterol and cardiovascular risk", source: "AHA/ACC", url: "https://www.acc.org/guidelines" },
  ],
  Triglycerides: [
    { title: "Triglycerides and cardiovascular risk", source: "AHA", url: "https://www.heart.org/en/health-topics/cholesterol" },
  ],
  "hs-CRP": [
    { title: "hs-CRP and cardiovascular risk", source: "CDC / AHA", url: "https://www.cdc.gov/heartdisease/crp.htm" },
  ],
}

export function getEvidenceForBiomarker(markerName: string): EvidenceEntry[] {
  return BIOMARKER_EVIDENCE[markerName] ?? []
}
