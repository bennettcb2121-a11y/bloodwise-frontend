/**
 * Legacy single-link shape for tooling or external references.
 * Canonical evidence data lives in `biomarkerEvidence.ts` (`BIOMARKER_EVIDENCE`, `getEvidenceForBiomarker`).
 */

import { BIOMARKER_EVIDENCE } from "./biomarkerEvidence"

export type ResearchSourceEntry = {
  citation: string
  source: string
  link: string
}

/** First entry per biomarker key (same content as `BIOMARKER_EVIDENCE`). Prefer `getEvidenceForBiomarker` for full lists. */
export const researchSources: Record<string, ResearchSourceEntry> = Object.fromEntries(
  Object.entries(BIOMARKER_EVIDENCE).map(([key, entries]) => {
    const first = entries[0]
    return [key, { citation: first.title, source: first.source, link: first.url }]
  })
)
