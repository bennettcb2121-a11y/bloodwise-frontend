/**
 * Biomarker evidence / science metadata (NIH NLM MedlinePlus, NIH ODS, ADA, AHA/ACC, peer-reviewed links).
 * Each biomarker has 1–3 evidence entries with title, source label, and stable URL.
 * Rendered in onboarding, guides, and biomarker detail — not a substitute for clinical judgment.
 */

export type EvidenceEntry = {
  title: string
  source: string
  url: string
}

export type BiomarkerEvidenceMap = Record<string, EvidenceEntry[]>

/** Map analysis/panel labels → biomarkerDatabase keys used in BIOMARKER_EVIDENCE */
export const EVIDENCE_KEY_ALIASES: Record<string, string> = {
  "25-OH Vitamin D": "Vitamin D",
  "Fasting insulin": "Insulin",
  "Serum iron": "Ferritin",
}

export function resolveEvidenceDbKey(markerName: string): string {
  const t = markerName.trim()
  return EVIDENCE_KEY_ALIASES[t] ?? t
}

/** Evidence keyed by biomarkerDatabase keys (and shared MedlinePlus hubs for CBC/CMP panels). */
export const BIOMARKER_EVIDENCE: BiomarkerEvidenceMap = {
  Ferritin: [
    { title: "Iron: fact sheet for health professionals", source: "NIH Office of Dietary Supplements", url: "https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/" },
    { title: "Iron status and the acute post-exercise hepcidin response in athletes", source: "PLOS ONE (PubMed)", url: "https://pubmed.ncbi.nlm.nih.gov/24667393/" },
  ],
  "Vitamin D": [
    { title: "Vitamin D: fact sheet for health professionals", source: "NIH Office of Dietary Supplements", url: "https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/" },
    { title: "Vitamin D and the Athlete: Current Perspectives and New Challenges", source: "Sports Med (PubMed)", url: "https://pubmed.ncbi.nlm.nih.gov/29368183/" },
  ],
  "Vitamin B12": [
    { title: "Vitamin B12: fact sheet for health professionals", source: "NIH Office of Dietary Supplements", url: "https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/" },
  ],
  Folate: [
    { title: "Folate: fact sheet for health professionals", source: "NIH Office of Dietary Supplements", url: "https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/" },
  ],
  Magnesium: [
    { title: "Magnesium: fact sheet for health professionals", source: "NIH Office of Dietary Supplements", url: "https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/" },
    { title: "Subclinical magnesium deficiency and cardiovascular disease", source: "Open Heart (PMC)", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5786912/" },
    { title: "Magnesium, inflammation, and obesity in chronic disease", source: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/20536778/" },
  ],
  HbA1c: [
    { title: "Standards of Medical Care in Diabetes (ADA)", source: "American Diabetes Association", url: "https://professional.diabetes.org/standards-of-care" },
    { title: "Standards of Care in Diabetes (methodology)", source: "Diabetes Care", url: "https://diabetesjournals.org/care/article/47/Supplement_1/S1/153952/Introduction-and-Methodology-Standards-of-Care-in" },
  ],
  Glucose: [
    { title: "Standards of Medical Care in Diabetes (ADA)", source: "American Diabetes Association", url: "https://professional.diabetes.org/standards-of-care" },
    { title: "Blood glucose test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/blood-glucose-test/" },
  ],
  Insulin: [
    { title: "Standards of Medical Care in Diabetes (ADA)", source: "American Diabetes Association", url: "https://professional.diabetes.org/standards-of-care" },
    { title: "Insulin blood test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/insulin-blood-test/" },
  ],
  "LDL-C": [
    { title: "Cholesterol guidelines and risk assessment", source: "American College of Cardiology", url: "https://www.acc.org/guidelines" },
    { title: "Cholesterol and heart disease", source: "American Heart Association", url: "https://www.heart.org/en/health-topics/cholesterol" },
  ],
  "HDL-C": [
    { title: "HDL cholesterol", source: "American Heart Association", url: "https://www.heart.org/en/health-topics/cholesterol/hdl-cholesterol" },
    { title: "Cholesterol and heart disease", source: "American Heart Association", url: "https://www.heart.org/en/health-topics/cholesterol" },
  ],
  Triglycerides: [
    { title: "Triglycerides", source: "American Heart Association", url: "https://www.heart.org/en/health-topics/cholesterol/triglycerides" },
    { title: "Cholesterol and heart disease", source: "American Heart Association", url: "https://www.heart.org/en/health-topics/cholesterol" },
  ],
  ApoB: [
    { title: "Apolipoprotein B-100", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/apolipoprotein-b-apo-b-test/" },
    { title: "Cholesterol guidelines and risk assessment", source: "American College of Cardiology", url: "https://www.acc.org/guidelines" },
  ],
  "hs-CRP": [
    { title: "Markers of inflammation and cardiovascular disease", source: "Circulation (PubMed)", url: "https://pubmed.ncbi.nlm.nih.gov/12551878/" },
    { title: "Physical activity and serum C-reactive protein: systematic review", source: "JACC (PubMed)", url: "https://pubmed.ncbi.nlm.nih.gov/15893167/" },
  ],
  CRP: [
    { title: "Markers of inflammation and cardiovascular disease", source: "Circulation (PubMed)", url: "https://pubmed.ncbi.nlm.nih.gov/12551878/" },
    { title: "C-reactive protein (CRP) test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/c-reactive-protein-crp-test/" },
  ],
  Testosterone: [
    { title: "The exercise-hypogonadal male condition and endurance exercise training", source: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/31723314/" },
    { title: "Testosterone test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/testosterone-test/" },
  ],
  TIBC: [
    { title: "Iron: fact sheet for health professionals", source: "NIH Office of Dietary Supplements", url: "https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/" },
    { title: "Total iron-binding capacity (TIBC) test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/total-iron-binding-capacity-tibc-test/" },
  ],
  Hemoglobin: [
    { title: "Complete blood count (CBC)", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/completebloodcount.html" },
    { title: "Hemoglobin test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/hemoglobin-test/" },
  ],
  Hematocrit: [
    { title: "Complete blood count (CBC)", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/completebloodcount.html" },
    { title: "Hematocrit test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/hematocrit-test/" },
  ],
  RBC: [
    { title: "Complete blood count (CBC)", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/completebloodcount.html" },
    { title: "RBC count test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/rbc-count-test/" },
  ],
  MCV: [
    { title: "Complete blood count (CBC)", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/completebloodcount.html" },
    { title: "Mean corpuscular volume (MCV)", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/mcv-test/" },
  ],
  MCH: [
    { title: "Complete blood count (CBC)", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/completebloodcount.html" },
  ],
  RDW: [
    { title: "Complete blood count (CBC)", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/completebloodcount.html" },
  ],
  WBC: [
    { title: "Complete blood count (CBC)", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/completebloodcount.html" },
    { title: "WBC count test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/wbc-count-test/" },
  ],
  Platelets: [
    { title: "Complete blood count (CBC)", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/completebloodcount.html" },
    { title: "Platelet count test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/platelet-count-test/" },
  ],
  TSH: [
    { title: "Thyroid tests", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/thyroidtests.html" },
    { title: "TSH (thyroid-stimulating hormone) test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/tsh-test/" },
  ],
  BUN: [
    { title: "Comprehensive metabolic panel", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/comprehensivemetabolicpanel.html" },
    { title: "BUN (blood urea nitrogen) test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/bun-blood-urea-nitrogen-test/" },
  ],
  Creatinine: [
    { title: "Comprehensive metabolic panel", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/comprehensivemetabolicpanel.html" },
    { title: "Creatinine blood test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/creatinine-blood-test/" },
  ],
  Albumin: [
    { title: "Comprehensive metabolic panel", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/comprehensivemetabolicpanel.html" },
    { title: "Albumin blood test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/albumin-blood-test/" },
  ],
  Calcium: [
    { title: "Comprehensive metabolic panel", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/comprehensivemetabolicpanel.html" },
    { title: "Calcium blood test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/calcium-blood-test/" },
  ],
  Sodium: [
    { title: "Electrolyte panel", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/electrolytes.html" },
    { title: "Sodium blood test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/sodium-blood-test/" },
  ],
  Potassium: [
    { title: "Electrolyte panel", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/electrolytes.html" },
    { title: "Potassium blood test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/potassium-blood-test/" },
  ],
  Chloride: [
    { title: "Electrolyte panel", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/electrolytes.html" },
    { title: "Chloride blood test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/chloride-blood-test/" },
  ],
  CO2: [
    { title: "Comprehensive metabolic panel", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/comprehensivemetabolicpanel.html" },
    { title: "Bicarbonate test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/bicarbonate-test/" },
  ],
  AST: [
    { title: "Liver function tests", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/liverfunctiontests.html" },
    { title: "AST test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/ast-test/" },
  ],
  ALT: [
    { title: "Liver function tests", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/liverfunctiontests.html" },
    { title: "ALT test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/alt-test/" },
  ],
  Bilirubin: [
    { title: "Liver function tests", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/liverfunctiontests.html" },
    { title: "Bilirubin blood test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/bilirubin-blood-test/" },
  ],
  ESR: [
    { title: "Erythrocyte sedimentation rate (ESR)", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/erythrocyte-sedimentation-rate-esr/" },
  ],
  SHBG: [
    { title: "Sex hormone binding globulin (SHBG) blood test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/shbg-blood-test/" },
  ],
  Estradiol: [
    { title: "Estradiol test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/estradiol-test/" },
  ],
  "Lipoprotein(a)": [
    { title: "Lipoprotein (a) blood test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/labtests/lipoproteinabloodtest.html" },
    { title: "Cholesterol guidelines and risk assessment", source: "American College of Cardiology", url: "https://www.acc.org/guidelines" },
  ],
  "Free T4": [
    { title: "Thyroid tests", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/thyroidtests.html" },
    { title: "Free T4 test", source: "MedlinePlus Medical Encyclopedia (NLM)", url: "https://medlineplus.gov/ency/article/003517.htm" },
  ],
  "Alkaline phosphatase": [
    { title: "Alkaline phosphatase (ALP) test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/alp-test/" },
    { title: "Liver function tests", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/liverfunctiontests.html" },
  ],
  "Total protein": [
    {
      title: "Total protein and albumin/globulin (A/G) ratio",
      source: "MedlinePlus (NLM)",
      url: "https://medlineplus.gov/lab-tests/total-protein-and-albumin-globulin-a-g-ratio",
    },
    { title: "Comprehensive metabolic panel", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/comprehensivemetabolicpanel.html" },
  ],
  "Cortisol (AM)": [
    { title: "Cortisol test", source: "MedlinePlus (NLM)", url: "https://medlineplus.gov/lab-tests/cortisol-test/" },
  ],
}

export function getEvidenceForBiomarker(markerName: string): EvidenceEntry[] {
  const key = resolveEvidenceDbKey(markerName)
  return BIOMARKER_EVIDENCE[key] ?? []
}

