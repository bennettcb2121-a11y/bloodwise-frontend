/**
 * Prompt + JSON schema for the OpenAI extraction call.
 *
 * Design notes:
 * - We ask the model to ONLY return structured test rows, never any identifying narrative.
 * - The schema is strict (json_schema strict: true) so malformed responses short-circuit.
 * - We include an explicit redaction instruction so the model drops names, DOB, MRN, etc.
 *   before even composing its response; the server re-redacts on the way out as a belt-and-
 *   suspenders precaution.
 */

export const LAB_EXTRACTION_SCHEMA = {
  name: "lab_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["rows", "collected_at", "overall_confidence", "lab_provider"],
    properties: {
      rows: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "testName",
            "value",
            "unit",
            "rangeLow",
            "rangeHigh",
            "flag",
            "confidence",
          ],
          properties: {
            testName: {
              type: "string",
              description:
                "Test label as printed on the report (e.g. 'Ferritin', '25-Hydroxyvitamin D'). No patient identifiers.",
            },
            value: {
              type: ["number", "null"],
              description:
                "Numeric result. If the report shows '>1000' or '<0.1', return the numeric portion and set flag accordingly.",
            },
            unit: {
              type: "string",
              description: "Unit as printed, e.g. 'ng/mL', 'mg/dL', 'mmol/L'.",
            },
            rangeLow: {
              type: ["number", "null"],
              description: "Lower bound of the lab's reference range, if printed.",
            },
            rangeHigh: {
              type: ["number", "null"],
              description: "Upper bound of the lab's reference range, if printed.",
            },
            flag: {
              type: "string",
              description:
                "Lab-printed flag: L, H, HH, LL, A (abnormal), N, or '' if none.",
            },
            confidence: {
              type: "number",
              description: "0–1 confidence that name, value, and unit are correct.",
            },
          },
        },
      },
      collected_at: {
        type: "string",
        description:
          "Date the specimen was collected, ISO YYYY-MM-DD. Use empty string if not printed.",
      },
      lab_provider: {
        type: "string",
        description: "Lab provider name if visible (LabCorp, Quest, Kaiser, etc.). Empty string if unclear.",
      },
      overall_confidence: {
        type: "number",
        description: "0–1 overall confidence that this extraction is a complete, correct lab report.",
      },
    },
  },
} as const

export const LAB_EXTRACTION_PROMPT = `You are a medical lab report parser. You receive either a PDF or a photograph of a clinical lab results document. Extract every quantitative biomarker result into a structured JSON object.

Follow these rules exactly:

1. **Never include patient identifiers in your response.** Specifically drop: patient name, DOB, age, sex, MRN, account number, address, phone, physician name, NPI, facility address. These must not appear in the testName or any other field.

2. **Only include numeric lab results.** Skip narrative notes, CPT codes, commentary, signatures, and anything that is not a discrete measurement with a value and unit.

3. **Preserve each test's original label** (LabCorp and Quest name the same marker differently — keep whichever the report shows). Downstream code will canonicalize.

4. **Preserve the unit exactly as printed** (e.g. "ng/mL", "mmol/L", "pmol/L"). Do not convert units.

5. **Preserve the reference range** as \`rangeLow\` and \`rangeHigh\` if printed. If only a one-sided range is printed ("< 130"), set the other bound to null.

6. **Preserve the lab flag** (H, L, HH, LL, A, N) if printed — this helps flag results already marked abnormal.

7. **For results printed as "<X" or ">X"**, return the numeric portion X as the value and set flag to "L" or "H" respectively.

8. **Set \`collected_at\`** to the specimen collection date (not the report date) in ISO YYYY-MM-DD format. Empty string if not printed.

9. **Set \`lab_provider\`** to the lab name if visible ("LabCorp", "Quest Diagnostics", "Kaiser Permanente", etc.). Empty string if unclear.

10. **Confidence is self-assessed, per row.** Use lower confidence when the image is blurry, the value is ambiguous, or the unit is unclear.

11. **If this document is not a lab report** (wrong type of document, unreadable, advertisement, consent form, etc.), return rows: [] and overall_confidence: 0.

12. **Never fabricate.** If a value is smudged or cut off, omit that row rather than guess.

Return only the JSON object matching the provided schema.`

/**
 * Minimal text-side identifier redaction — used as defense-in-depth when we pass OCR text
 * or page text to the model. Keeps common formats (US addresses, phone, email, DOB, SSN, MRN).
 */
export function redactIdentifiers(text: string): string {
  return text
    .replace(/\b(?:\d{3}-\d{2}-\d{4})\b/g, "[REDACTED_SSN]")
    .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[REDACTED_PHONE]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[REDACTED_EMAIL]")
    .replace(/\b(?:DOB|Date of Birth)[:\s]+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi, "[REDACTED_DOB]")
    .replace(/\b(?:MRN|Medical Record Number|Account #?)[:\s]*[A-Z0-9-]{4,}\b/gi, "[REDACTED_MRN]")
    .replace(/\b(?:NPI)[:\s]+\d{10}\b/gi, "[REDACTED_NPI]")
}
