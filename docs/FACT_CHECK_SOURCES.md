# Clarion Labs — Scientific Sources & Fact-Check

This document lists the **reputable sources** used for biomarker education, reference ranges, and evidence links across the app. All content is intended for **education and decision support only**, not medical diagnosis or treatment.

---

## Evidence links (biomarkerEvidence.ts & research.ts)

| Biomarker | Source | URL / PMID | Notes |
|-----------|--------|------------|--------|
| **Ferritin** | NIH ODS Iron Fact Sheet | ods.od.nih.gov/factsheets/Iron-HealthProfessional | Authoritative; repletion, RDA, toxicity. |
| **Ferritin** | Peeling et al. | PMID 24667393 | Iron status and post-exercise hepcidin in athletes (PLOS ONE). |
| **Vitamin D** | NIH ODS Vitamin D Fact Sheet | ods.od.nih.gov/factsheets/VitaminD-HealthProfessional | IOM/ODS ranges, safety. |
| **Vitamin D** | Owens et al. | PMID 29368183 | Vitamin D and the Athlete (Sports Med 2018). |
| **Vitamin B12** | NIH ODS B12 Fact Sheet | ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional | Status, absorption, deficiency. |
| **Folate** | NIH ODS Folate Fact Sheet | ods.od.nih.gov/factsheets/Folate-HealthProfessional | Folate vs folic acid, masking B12. |
| **Magnesium** | NIH ODS Magnesium Fact Sheet | ods.od.nih.gov/factsheets/Magnesium-HealthProfessional | UL 350 mg/day supplemental. |
| **Magnesium** | DiNicolantonio et al. | PMC5786912 | Subclinical magnesium deficiency and CVD (Open Heart). |
| **HbA1c / Glucose** | ADA Standards of Care | professional.diabetes.org/standards-of-care | Official ADA; diabetesjournals.org supplement for full text. |
| **LDL-C** | ACC / AHA | acc.org/guidelines, heart.org cholesterol | Guideline hubs; lifestyle and risk. |
| **Triglycerides** | AHA | heart.org cholesterol/triglycerides | Diet, lifestyle, omega-3 context. |
| **hs-CRP / CRP** | CDC/AHA Statement | PMID 12551878 | Markers of inflammation and CVD (Circulation). |
| **hs-CRP / CRP** | Kasapis & Thompson | PMID 15893167 | Physical activity and CRP (JACC systematic review). |
| **Testosterone** | Hackney et al. | PMID 31723314 | Exercise-hypogonadal male condition (Curr Trends Endocrinol). |

---

## Reference ranges & interpretation

- **Ranges** in `biomarkerDatabase.ts` are aligned with:
  - **Vitamins/minerals**: NIH ODS, IOM, and common lab reference intervals (e.g. Vitamin D 20 ng/mL deficiency, 30+ sufficiency; ferritin ng/mL; B12 pg/mL; serum magnesium mg/dL).
  - **Metabolic**: ADA criteria (fasting glucose &lt;100 mg/dL normal; HbA1c &lt;5.7% normal, 5.7–6.4% prediabetes).
  - **Lipids**: AHA/ACC-style targets (e.g. LDL-C &lt;100 mg/dL optimal for many; triglycerides &lt;150 mg/dL).
  - **hs-CRP**: CDC/AHA tertiles (&lt;1, 1–3, &gt;3 mg/L) for cardiovascular risk context.
- **Athlete / profile-specific** ranges (e.g. higher ferritin targets for endurance) follow common sports-medicine practice and cited literature (e.g. Peeling, Owens), not formal guideline extensions.

---

## Protocols & supplements (coreBiomarkerProtocols.ts)

- **Iron**: Alternate-day dosing and 25–65 mg elemental iron — consistent with ODS and absorption/hepcidin data (e.g. PMID 24667393).
- **Vitamin D**: 1,000–2,000 IU maintenance; 2,000–5,000 IU repletion — within IOM/ODS and Endocrine Society discussion; high-dose with clinician oversight.
- **Magnesium**: 100–350 mg/day elemental; UL 350 mg/day (ODS); kidney disease caution.
- **B12 / Folate**: Dosing and “do not megadose folic acid” — per ODS; B12 1,000 mcg oral common for deficiency.
- **HbA1c / Glucose**: Lifestyle-first, berberine with clinician awareness and pregnancy/medication warnings — aligned with ADA and berberine literature.
- **Lipids**: Psyllium ~10 g/day (LDL meta-analyses); plant sterols; omega-3 1–2 g EPA+DHA general, 4 g in prescription context (AHA) — not presented as casual OTC high dose.
- **hs-CRP**: Lifestyle (activity, weight, sleep, smoking); curcumin/omega-3 with anticoagulant/bleeding warnings.

---

## Disclaimers in app

- **coreBiomarkerProtocols.ts** header: *"Use for education and decision support only; not medical diagnosis. Clinician oversight required for iron when ferritin is high/normal or cause unclear, berberine with diabetes meds/pregnancy, high-dose vitamin D, magnesium in kidney disease, omega-3/curcumin with anticoagulants."*
- **Supplement/product copy**: Warnings where relevant (iron overdose, berberine, folate masking B12, bleeding risk).
- **Evidence links**: All point to peer-reviewed or official agency sources (NIH, ADA, AHA, ACC, CDC, PubMed/PMC).

---

## Maintenance

- **Evidence URLs**: Prefer stable domains (professional.diabetes.org, ods.od.nih.gov, pubmed.ncbi.nlm.nih.gov, heart.org, acc.org). Replace any 404s with current official or PMID links.
- **Ranges**: When lab units or guidelines change (e.g. ADA, AHA updates), adjust `biomarkerDatabase.ts` and document here.
- **New biomarkers**: Add entries to `BIOMARKER_EVIDENCE` with at least one authoritative or peer-reviewed source; update this doc.

Last updated: March 2025 (post fact-check of all evidence links and protocols).
