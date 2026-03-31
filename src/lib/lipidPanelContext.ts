/**
 * Lipids are interpreted as a panel (LDL, HDL, triglycerides, ApoB, etc.) in clinical practice.
 * Clarion is education-only; these strings nudge users away from “one number” thinking.
 */

import { normalize } from "@/src/lib/panelEngine"

export type MinimalAnalysisItem = {
  name?: string
  marker?: string
  status?: string
}

function nameOf(item: MinimalAnalysisItem): string {
  return (item.name || item.marker || "").trim()
}

function isFlaggedStatus(status?: string): boolean {
  const s = (status || "").toLowerCase()
  return ["deficient", "low", "suboptimal", "high"].includes(s)
}

/** Lab markers we treat as part of the lipid / cardiometabolic picture. */
export function isLipidRelatedMarkerName(raw: string): boolean {
  const n = normalize(raw)
  if (!n) return false
  return (
    n.includes("hdl") ||
    n.includes("ldl") ||
    n.includes("triglyceride") ||
    n.includes("cholesterol") ||
    n.includes("apob") ||
    n.includes("lipoprotein") ||
    n.includes("nonhdl")
  )
}

/**
 * Short coaching line when lipid markers are off—emphasizes panel interpretation and clinician role.
 * Returns null if no lipid flags in the report.
 */
export function getLipidPanelCoachingNote(analysis: MinimalAnalysisItem[]): string | null {
  if (!Array.isArray(analysis) || analysis.length === 0) return null

  const lipidFlags = analysis.filter((item) => isFlaggedStatus(item.status) && isLipidRelatedMarkerName(nameOf(item)))

  if (lipidFlags.length === 0) return null

  if (lipidFlags.length >= 2) {
    return "Heart risk is usually judged from the whole lipid panel (for example LDL, HDL, triglycerides, and sometimes ApoB)—not one number alone. Lifestyle is first-line; medication decisions belong with your clinician."
  }

  const raw = nameOf(lipidFlags[0])
  const compact = normalize(raw)
  if (compact.includes("nonhdl")) {
    return "Non-HDL cholesterol reflects several atherogenic particles; it’s read with LDL, HDL, and triglycerides as a panel. Ask your clinician how it fits your overall risk."
  }
  if (compact.includes("hdl") && !compact.includes("nonhdl")) {
    return "HDL is only one part of the picture. Cardiovascular risk depends on your full lipid panel and overall history—not HDL alone. Discuss what your numbers mean for you with your clinician."
  }
  const one = raw.toLowerCase()
  if (one.includes("ldl") || one.includes("triglyceride") || one.includes("apob")) {
    return "This result is one piece of your lipid panel. Ask your clinician how it fits with your other lipids (including HDL and triglycerides) and your overall risk."
  }
  if (one.includes("cholesterol") || one.includes("lipoprotein")) {
    return "Lipid results are interpreted together—LDL, HDL, triglycerides, and sometimes ApoB or Lp(a). Your clinician can help you interpret the full picture."
  }

  return null
}
