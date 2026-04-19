/**
 * Rotating status lines while the biomarker AI overview is generated.
 * Tone matches AppLoadingScreen (`src/components/AppLoadingScreen.tsx`).
 */
export const BIOMARKER_AI_LOADING_LINES = [
  "Generating health insights…",
  "Reading your biomarker panel…",
  "Understanding your results…",
  "Summarizing what matters…",
  "Preparing your overview…",
] as const

/** ~2.2s per line — full cycle feels calm, not frantic */
export const BIOMARKER_AI_LOADING_LINE_MS = 2200
