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
    { title: "Iron status and the acute post-exercise hepcidin response in athletes", source: "PLOS ONE (PubMed)", url: "https://pubmed.ncbi.nlm.nih.gov/24667393/" },
  ],
  "Vitamin D": [
    { title: "Vitamin D and health", source: "NIH Office of Dietary Supplements", url: "https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/" },
    { title: "Vitamin D and the Athlete: Current Perspectives and New Challenges", source: "Sports Med (PubMed)", url: "https://pubmed.ncbi.nlm.nih.gov/29368183/" },
  ],
  "Vitamin B12": [
    { title: "B12 deficiency and supplementation", source: "NIH ODS", url: "https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/" },
  ],
  Folate: [
    { title: "Folate and homocysteine", source: "NIH ODS", url: "https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/" },
  ],
  Magnesium: [
    { title: "Magnesium in health and disease", source: "NIH ODS", url: "https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/" },
    { title: "Subclinical magnesium deficiency and cardiovascular disease", source: "Open Heart (PMC)", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5786912/" },
  ],
  HbA1c: [
    { title: "Standards of Medical Care in Diabetes (ADA)", source: "American Diabetes Association", url: "https://professional.diabetes.org/standards-of-care" },
    { title: "Standards of Care in Diabetes 2024 (full text)", source: "Diabetes Care", url: "https://diabetesjournals.org/care/article/47/Supplement_1/S1/153952/Introduction-and-Methodology-Standards-of-Care-in" },
  ],
  Glucose: [
    { title: "Standards of Medical Care in Diabetes (ADA)", source: "American Diabetes Association", url: "https://professional.diabetes.org/standards-of-care" },
    { title: "Standards of Care in Diabetes 2024 (full text)", source: "Diabetes Care", url: "https://diabetesjournals.org/care/article/47/Supplement_1/S1/153952/Introduction-and-Methodology-Standards-of-Care-in" },
  ],
  "LDL-C": [
    { title: "Cholesterol guidelines and risk assessment", source: "ACC", url: "https://www.acc.org/guidelines" },
    { title: "Cholesterol and heart disease", source: "AHA", url: "https://www.heart.org/en/health-topics/cholesterol" },
  ],
  Triglycerides: [
    { title: "Cholesterol and triglycerides (lipid health)", source: "AHA", url: "https://www.heart.org/en/health-topics/cholesterol" },
  ],
  "hs-CRP": [
    { title: "Markers of inflammation and cardiovascular disease (CDC/AHA statement)", source: "Circulation / PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/12551878/" },
    { title: "Physical activity and serum C-reactive protein: systematic review", source: "JACC (PubMed)", url: "https://pubmed.ncbi.nlm.nih.gov/15893167/" },
  ],
  CRP: [
    { title: "Markers of inflammation and cardiovascular disease (CDC/AHA statement)", source: "Circulation / PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/12551878/" },
    { title: "Physical activity and serum C-reactive protein: systematic review", source: "JACC (PubMed)", url: "https://pubmed.ncbi.nlm.nih.gov/15893167/" },
  ],
}

export function getEvidenceForBiomarker(markerName: string): EvidenceEntry[] {
  return BIOMARKER_EVIDENCE[markerName] ?? []
}
